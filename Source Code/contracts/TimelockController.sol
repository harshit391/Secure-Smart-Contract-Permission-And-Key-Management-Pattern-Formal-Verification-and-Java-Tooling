// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TimelockController
 * @author Harshit Singla — "Secure Smart-Contract Permission & Key Management"
 * @notice A timelock controller that enforces a mandatory delay between
 *         scheduling and execution of privileged operations.
 *
 * @dev Architecture overview
 *  ┌─────────┐  schedule()  ┌───────────┐  delay elapses  ┌──────────┐
 *  │ PROPOSER│─────────────▶│ SCHEDULED │────────────────▶│ READY    │
 *  └─────────┘              └───────────┘                  └──────────┘
 *                                │                              │
 *                        cancel()│                     execute()│
 *                       (CANCELLER)                   (EXECUTOR)│
 *                                ▼                              ▼
 *                          ┌──────────┐                  ┌──────────┐
 *                          │ CANCELLED│                  │  DONE    │
 *                          └──────────┘                  └──────────┘
 *
 *  Each operation is identified by a unique `bytes32 id` (typically derived
 *  from the call parameters by the proposer).
 *
 * Security properties enforced (referenced in the paper):
 *  P5  — No early execution: `execute` reverts if `block.timestamp < eta`.
 *  P6  — Cancellation restricted: only accounts with CANCELLER_ROLE may
 *         cancel a pending operation.
 *  P7  — Expiry enforced: an operation that is not executed within
 *         `GRACE_PERIOD` after its `eta` becomes stale and cannot be
 *         executed.
 *
 * Role-management is intentionally minimal (a simple mapping) so that this
 * contract can be composed with `RBACManager` at a higher level.
 */
contract TimelockController {
    // -----------------------------------------------------------------------
    //  Constants — Roles
    // -----------------------------------------------------------------------

    /// @notice Accounts that can schedule new operations.
    bytes32 public constant PROPOSER_ROLE  = keccak256("PROPOSER_ROLE");

    /// @notice Accounts that can execute matured operations.
    bytes32 public constant EXECUTOR_ROLE  = keccak256("EXECUTOR_ROLE");

    /// @notice Accounts that can cancel pending operations.
    bytes32 public constant CANCELLER_ROLE = keccak256("CANCELLER_ROLE");

    /// @notice Admin role that can manage other roles within this contract.
    bytes32 public constant ADMIN_ROLE     = keccak256("ADMIN_ROLE");

    // -----------------------------------------------------------------------
    //  Constants — Time
    // -----------------------------------------------------------------------

    /**
     * @notice Grace period after `eta` during which execution is still
     *         permitted.  After `eta + GRACE_PERIOD` the operation expires.
     * @custom:security P7 — Expiry enforced.
     */
    uint256 public constant GRACE_PERIOD = 14 days;

    // -----------------------------------------------------------------------
    //  State — Operation tracking
    // -----------------------------------------------------------------------

    /**
     * @dev Mapping from operation id to its scheduled ETA (earliest
     *      execution timestamp).
     *
     *      Special values:
     *        0  — not scheduled / cancelled / never existed
     *        1  — executed (sentinel, prevents re-scheduling)
     */
    mapping(bytes32 => uint256) private _timestamps;

    /// @dev Sentinel value stored after successful execution.
    uint256 private constant _DONE_TIMESTAMP = 1;

    // -----------------------------------------------------------------------
    //  State — Roles
    // -----------------------------------------------------------------------

    /// @dev role => account => hasRole
    mapping(bytes32 => mapping(address => bool)) private _roles;

    // -----------------------------------------------------------------------
    //  State — Configuration
    // -----------------------------------------------------------------------

    /**
     * @notice Minimum delay (in seconds) that must elapse between
     *         scheduling and execution.
     */
    uint256 public minDelay;

    // -----------------------------------------------------------------------
    //  Events
    // -----------------------------------------------------------------------

    /// @notice Emitted when an operation is scheduled.
    event Scheduled(
        bytes32 indexed id,
        address indexed target,
        uint256 value,
        bytes data,
        uint256 delay,
        uint256 eta
    );

    /// @notice Emitted when a scheduled operation is executed.
    event Executed(
        bytes32 indexed id,
        address indexed target,
        uint256 value,
        bytes data
    );

    /// @notice Emitted when a pending operation is cancelled.
    event Cancelled(bytes32 indexed id);

    /// @notice Emitted when the minimum delay is updated.
    event MinDelayChanged(uint256 oldDelay, uint256 newDelay);

    /// @notice Emitted when a role is granted to an account within this
    ///         contract's internal role system.
    event RoleGranted(bytes32 indexed role, address indexed account);

    /// @notice Emitted when a role is revoked from an account.
    event RoleRevoked(bytes32 indexed role, address indexed account);

    // -----------------------------------------------------------------------
    //  Errors
    // -----------------------------------------------------------------------

    error AccessDenied(bytes32 role, address account);
    error OperationAlreadyScheduled(bytes32 id);
    error OperationNotScheduled(bytes32 id);
    error OperationNotReady(bytes32 id, uint256 eta, uint256 currentTime);
    error OperationExpired(bytes32 id, uint256 deadline, uint256 currentTime);
    error OperationAlreadyExecuted(bytes32 id);
    error DelayBelowMinimum(uint256 requested, uint256 minimum);
    error ExecutionFailed(bytes32 id);
    error ZeroAddress();

    // -----------------------------------------------------------------------
    //  Modifiers
    // -----------------------------------------------------------------------

    /**
     * @dev Restricts access to accounts that hold a specific role.
     *      Used to enforce P6 (cancel restricted) and role-gating in general.
     */
    modifier onlyRole(bytes32 role) {
        if (!_roles[role][msg.sender]) {
            revert AccessDenied(role, msg.sender);
        }
        _;
    }

    // -----------------------------------------------------------------------
    //  Constructor
    // -----------------------------------------------------------------------

    /**
     * @notice Deploy the TimelockController.
     *
     * @param _minDelay   Initial minimum delay in seconds.
     * @param proposers   Addresses to grant PROPOSER_ROLE.
     * @param executors   Addresses to grant EXECUTOR_ROLE.
     * @param cancellers  Addresses to grant CANCELLER_ROLE.
     * @param admin       Address to grant ADMIN_ROLE (can manage roles).
     *                    Pass address(0) to leave admin unset (roles become
     *                    immutable except through the timelock itself).
     */
    constructor(
        uint256 _minDelay,
        address[] memory proposers,
        address[] memory executors,
        address[] memory cancellers,
        address admin
    ) {
        minDelay = _minDelay;
        emit MinDelayChanged(0, _minDelay);

        for (uint256 i = 0; i < proposers.length; ) {
            _grantRole(PROPOSER_ROLE, proposers[i]);
            unchecked { ++i; }
        }
        for (uint256 i = 0; i < executors.length; ) {
            _grantRole(EXECUTOR_ROLE, executors[i]);
            unchecked { ++i; }
        }
        for (uint256 i = 0; i < cancellers.length; ) {
            _grantRole(CANCELLER_ROLE, cancellers[i]);
            unchecked { ++i; }
        }

        if (admin != address(0)) {
            _grantRole(ADMIN_ROLE, admin);
        }

        // The timelock itself is always an admin so it can reconfigure
        // roles through scheduled operations.
        _grantRole(ADMIN_ROLE, address(this));
    }

    // -----------------------------------------------------------------------
    //  Receive / fallback
    // -----------------------------------------------------------------------

    /// @notice Accept Ether so that scheduled calls can transfer value.
    receive() external payable {}

    // -----------------------------------------------------------------------
    //  Core operations
    // -----------------------------------------------------------------------

    /**
     * @notice Schedule a new operation for future execution.
     *
     * @param id      Unique identifier for the operation.
     * @param target  Address of the contract to call.
     * @param value   Wei to send with the call.
     * @param data    ABI-encoded calldata.
     * @param delay   Time (seconds) that must pass before execution.
     *                Must be >= `minDelay`.
     *
     * @custom:security
     *  - Only PROPOSER_ROLE may call.
     *  - `delay >= minDelay` is enforced.
     *  - The id must not already be scheduled or executed.
     */
    function schedule(
        bytes32 id,
        address target,
        uint256 value,
        bytes calldata data,
        uint256 delay
    ) external onlyRole(PROPOSER_ROLE) {
        if (delay < minDelay) {
            revert DelayBelowMinimum(delay, minDelay);
        }
        if (_timestamps[id] != 0) {
            revert OperationAlreadyScheduled(id);
        }

        uint256 eta = block.timestamp + delay;
        _timestamps[id] = eta;

        emit Scheduled(id, target, value, data, delay, eta);
    }

    /**
     * @notice Execute a matured operation.
     *
     * @param id      The operation identifier (must match the scheduled id).
     * @param target  Address of the contract to call.
     * @param value   Wei to send.
     * @param data    ABI-encoded calldata.
     *
     * @custom:security
     *  P5 — Reverts if `block.timestamp < eta` (no early execution).
     *  P7 — Reverts if `block.timestamp > eta + GRACE_PERIOD` (expiry).
     *  - Only EXECUTOR_ROLE may call.
     */
    function execute(
        bytes32 id,
        address target,
        uint256 value,
        bytes calldata data
    ) external payable onlyRole(EXECUTOR_ROLE) {
        uint256 eta = _timestamps[id];

        // Must be scheduled.
        if (eta == 0) {
            revert OperationNotScheduled(id);
        }
        // Must not already be executed.
        if (eta == _DONE_TIMESTAMP) {
            revert OperationAlreadyExecuted(id);
        }

        // --- P5: No early execution ---
        if (block.timestamp < eta) {
            revert OperationNotReady(id, eta, block.timestamp);
        }

        // --- P7: Expiry enforced ---
        uint256 deadline = eta + GRACE_PERIOD;
        if (block.timestamp > deadline) {
            revert OperationExpired(id, deadline, block.timestamp);
        }

        // Mark as executed (before external call — CEI pattern).
        _timestamps[id] = _DONE_TIMESTAMP;

        // Perform the call.
        (bool success, ) = target.call{value: value}(data);
        if (!success) {
            revert ExecutionFailed(id);
        }

        emit Executed(id, target, value, data);
    }

    /**
     * @notice Cancel a pending (not yet executed) operation.
     *
     * @param id  The operation identifier.
     *
     * @custom:security P6 — Only CANCELLER_ROLE may cancel.
     */
    function cancel(bytes32 id) external onlyRole(CANCELLER_ROLE) {
        uint256 eta = _timestamps[id];
        if (eta == 0) {
            revert OperationNotScheduled(id);
        }
        if (eta == _DONE_TIMESTAMP) {
            revert OperationAlreadyExecuted(id);
        }

        _timestamps[id] = 0;

        emit Cancelled(id);
    }

    // -----------------------------------------------------------------------
    //  Role management
    // -----------------------------------------------------------------------

    /**
     * @notice Grant a role to an account.
     * @dev    Only callable by ADMIN_ROLE holders.
     *
     * @param role    The role identifier.
     * @param account The address to grant the role to.
     */
    function grantRole(
        bytes32 role,
        address account
    ) external onlyRole(ADMIN_ROLE) {
        _grantRole(role, account);
    }

    /**
     * @notice Revoke a role from an account.
     * @dev    Only callable by ADMIN_ROLE holders.
     *
     * @param role    The role identifier.
     * @param account The address to revoke the role from.
     */
    function revokeRole(
        bytes32 role,
        address account
    ) external onlyRole(ADMIN_ROLE) {
        _revokeRole(role, account);
    }

    // -----------------------------------------------------------------------
    //  Configuration — self-administered
    // -----------------------------------------------------------------------

    /**
     * @notice Update the minimum delay.
     * @dev    Must be called through a scheduled + executed operation (i.e.,
     *         `address(this)` is the caller).
     *
     * @param newDelay  The new minimum delay in seconds.
     */
    function updateMinDelay(uint256 newDelay) external {
        require(
            msg.sender == address(this),
            "TimelockController: caller must be timelock"
        );
        uint256 oldDelay = minDelay;
        minDelay = newDelay;
        emit MinDelayChanged(oldDelay, newDelay);
    }

    // -----------------------------------------------------------------------
    //  View helpers
    // -----------------------------------------------------------------------

    /**
     * @notice Check whether an operation is pending (scheduled but not yet
     *         executed or cancelled).
     */
    function isOperationPending(bytes32 id) public view returns (bool) {
        uint256 eta = _timestamps[id];
        return eta > _DONE_TIMESTAMP;
    }

    /// @notice Check whether an operation is ready to execute.
    function isOperationReady(bytes32 id) public view returns (bool) {
        uint256 eta = _timestamps[id];
        return eta > _DONE_TIMESTAMP &&
               block.timestamp >= eta &&
               block.timestamp <= eta + GRACE_PERIOD;
    }

    /// @notice Check whether an operation has been executed.
    function isOperationDone(bytes32 id) public view returns (bool) {
        return _timestamps[id] == _DONE_TIMESTAMP;
    }

    /// @notice Return the ETA timestamp for an operation (0 if not scheduled).
    function getTimestamp(bytes32 id) public view returns (uint256) {
        return _timestamps[id];
    }

    /// @notice Check whether an account holds a given role.
    function hasRole(
        bytes32 role,
        address account
    ) public view returns (bool) {
        return _roles[role][account];
    }

    /**
     * @notice Compute the operation id from the call parameters.
     * @dev    This is a pure helper for off-chain tooling; the contract
     *         itself does not enforce any particular id derivation scheme.
     */
    function hashOperation(
        address target,
        uint256 value,
        bytes calldata data,
        bytes32 salt
    ) public pure returns (bytes32) {
        return keccak256(abi.encode(target, value, data, salt));
    }

    // -----------------------------------------------------------------------
    //  Internal helpers
    // -----------------------------------------------------------------------

    function _grantRole(bytes32 role, address account) internal {
        if (!_roles[role][account]) {
            _roles[role][account] = true;
            emit RoleGranted(role, account);
        }
    }

    function _revokeRole(bytes32 role, address account) internal {
        if (_roles[role][account]) {
            _roles[role][account] = false;
            emit RoleRevoked(role, account);
        }
    }
}
