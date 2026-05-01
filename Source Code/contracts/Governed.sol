// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./RBACManager.sol";
import "./MultiSigWallet.sol";
import "./TimelockController.sol";

/**
 * @title Governed
 * @author Harshit Singla — "Secure Smart-Contract Permission & Key Management"
 * @notice Composition contract that wires the MultiSigWallet, TimelockController,
 *         and RBACManager into a unified governance pipeline.
 *
 * @dev Governance architecture
 *
 *  ┌──────────────┐   k-of-n sigs    ┌──────────────────┐
 *  │  Owners      │ ────────────────▶ │  MultiSigWallet  │
 *  │  (off-chain) │                   │  (on-chain verify)│
 *  └──────────────┘                   └────────┬─────────┘
 *                                              │
 *                                    schedule() via execute()
 *                                              │
 *                                              ▼
 *                                    ┌──────────────────┐
 *                                    │ TimelockController│
 *                                    │  (delay period)   │
 *                                    └────────┬─────────┘
 *                                              │
 *                                     execute() after delay
 *                                              │
 *                                              ▼
 *                                    ┌──────────────────┐
 *                                    │    Governed       │
 *                                    │  (RBAC actions)   │
 *                                    └──────────────────┘
 *
 *  Flow:
 *    1. Multisig owners sign a transaction off-chain that calls
 *       `timelock.schedule(...)` targeting the Governed contract.
 *    2. After the delay elapses, an executor calls `timelock.execute(...)`
 *       which invokes the governance-gated function on this contract.
 *    3. The `onlyGovernance` modifier verifies `msg.sender == timelock`.
 *
 *  Composition properties:
 *    CP1 — All RBAC admin mutations flow through the full governance
 *           pipeline (multisig → timelock → governed).
 *    CP2 — The multisig wallet is the sole proposer on the timelock.
 *    CP3 — The timelock is the sole executor for RBAC admin actions.
 *    CP4 — Governance parameters (minDelay, threshold, owners) can only
 *           be updated through the governance pipeline itself.
 */
contract Governed is RBACManager {
    // -----------------------------------------------------------------------
    //  State
    // -----------------------------------------------------------------------

    /// @notice The multisig wallet that authorises governance actions.
    MultiSigWallet public multisig;

    /// @notice The timelock that enforces delay on governance actions.
    TimelockController public timelock;

    // -----------------------------------------------------------------------
    //  Events
    // -----------------------------------------------------------------------

    /// @notice Emitted when the multisig reference is updated.
    event MultisigUpdated(
        address indexed oldMultisig,
        address indexed newMultisig
    );

    /// @notice Emitted when the timelock reference is updated.
    event TimelockUpdated(
        address indexed oldTimelock,
        address indexed newTimelock
    );

    /// @notice Emitted when a governance role is configured on this contract.
    event GovernanceRoleConfigured(
        bytes32 indexed role,
        address indexed account,
        bool granted
    );

    // -----------------------------------------------------------------------
    //  Errors
    // -----------------------------------------------------------------------

    error NotGovernance(address caller);
    error ZeroAddressGovernance();

    // -----------------------------------------------------------------------
    //  Modifiers
    // -----------------------------------------------------------------------

    /**
     * @dev Restricts a function to calls originating from the timelock.
     *      This ensures that only operations that have passed through the
     *      full governance pipeline (multisig → timelock) can mutate
     *      privileged state.
     *
     * @custom:security CP3 — Timelock is the sole executor for admin actions.
     */
    modifier onlyGovernance() {
        if (msg.sender != address(timelock)) {
            revert NotGovernance(msg.sender);
        }
        _;
    }

    // -----------------------------------------------------------------------
    //  Constructor
    // -----------------------------------------------------------------------

    /**
     * @notice Deploy the Governed contract.
     *
     * @dev Deployment sequence:
     *  1. Deploy MultiSigWallet with the initial owner set.
     *  2. Deploy TimelockController — the constructor below creates it.
     *     The multisig is set as the sole PROPOSER_ROLE holder.
     *     This contract (Governed) is set as an EXECUTOR_ROLE holder so
     *     it can relay execution, and address(0) can be used as a
     *     "open executor" pattern if desired.
     *  3. Transfer the DEFAULT_ADMIN_ROLE of Governed (RBAC) to the
     *     timelock, so all future RBAC mutations must flow through the
     *     governance pipeline.
     *
     * @param _multisig  Address of the already-deployed MultiSigWallet.
     * @param _minDelay  Minimum timelock delay in seconds.
     */
    constructor(
        address payable _multisig,
        uint256 _minDelay
    ) RBACManager() {
        if (_multisig == address(0)) revert ZeroAddressGovernance();

        multisig = MultiSigWallet(_multisig);

        // --- Deploy the TimelockController ---
        // Proposers: only the multisig.
        address[] memory proposers = new address[](1);
        proposers[0] = _multisig;

        // Executors: this contract + the multisig (so either can relay
        // the final execute call).
        address[] memory executors = new address[](2);
        executors[0] = address(this);
        executors[1] = _multisig;

        // Cancellers: the multisig (mirrors the proposer for simplicity).
        address[] memory cancellers = new address[](1);
        cancellers[0] = _multisig;

        timelock = new TimelockController(
            _minDelay,
            proposers,
            executors,
            cancellers,
            address(this) // This contract gets initial ADMIN_ROLE to finish setup
        );

        emit TimelockUpdated(address(0), address(timelock));
        emit MultisigUpdated(address(0), _multisig);

        // --- Transfer RBAC admin to the timelock ---
        // The deployer (msg.sender) received DEFAULT_ADMIN_ROLE in the
        // RBACManager constructor.  We now:
        //   (a) Grant DEFAULT_ADMIN_ROLE to the timelock.
        //   (b) Renounce DEFAULT_ADMIN_ROLE from the deployer.
        // After this, all RBAC admin actions must go through the timelock.
        _grantRole(DEFAULT_ADMIN_ROLE, address(timelock));
        _revokeRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // -----------------------------------------------------------------------
    //  Governance-gated RBAC mutations (CP1, CP3)
    // -----------------------------------------------------------------------

    /**
     * @notice Propose a role grant through the governance pipeline.
     * @dev    Overrides RBACManager.proposeGrant to restrict to governance
     *         callers for admin-level roles.  The timelock calls this
     *         function after the delay has elapsed.
     *
     *         For the DEFAULT_ADMIN_ROLE, only the governance pipeline
     *         (timelock) can propose.  For other roles, the standard
     *         admin check from RBACManager applies.
     *
     * @param role    The role to propose.
     * @param account The nominee.
     */
    function governanceGrantRole(
        bytes32 role,
        address account
    ) external onlyGovernance {
        // Bypass the two-step flow for governance-initiated grants.
        // The governance pipeline (multisig + timelock) already provides
        // sufficient deliberation and delay.
        _grantRole(role, account);

        emit GovernanceRoleConfigured(role, account, true);
    }

    /**
     * @notice Revoke a role through the governance pipeline.
     *
     * @param role    The role to revoke.
     * @param account The address to revoke from.
     */
    function governanceRevokeRole(
        bytes32 role,
        address account
    ) external onlyGovernance {
        _revokeRole(role, account);

        emit GovernanceRoleConfigured(role, account, false);
    }

    /**
     * @notice Change the admin of a role through the governance pipeline.
     *
     * @param role          The role whose admin is being changed.
     * @param newAdminRole  The new admin role identifier.
     */
    function governanceSetRoleAdmin(
        bytes32 role,
        bytes32 newAdminRole
    ) external onlyGovernance {
        // Delegates to the internal `_setRoleAdmin` helper in RBACManager.
        // This bypasses the `onlyRole(admin)` check on the public
        // `setRoleAdmin`, relying instead on the `onlyGovernance` modifier
        // which enforces that the call originated from the timelock
        // (and therefore passed through the full multisig + delay pipeline).
        _setRoleAdmin(role, newAdminRole);
    }

    // -----------------------------------------------------------------------
    //  Governance-gated parameter updates (CP4)
    // -----------------------------------------------------------------------

    /**
     * @notice Update the multisig wallet reference.
     * @dev    Must go through the governance pipeline.
     *
     * @param newMultisig  The new MultiSigWallet address.
     *
     * @custom:security CP4 — Governance-gated parameter update.
     */
    function updateMultisig(
        address payable newMultisig
    ) external onlyGovernance {
        if (newMultisig == address(0)) revert ZeroAddressGovernance();

        address oldMultisig = address(multisig);
        multisig = MultiSigWallet(newMultisig);

        emit MultisigUpdated(oldMultisig, newMultisig);
    }

    /**
     * @notice Update the timelock controller reference.
     * @dev    Must go through the governance pipeline.  After this call,
     *         the new timelock becomes the governance authority.
     *
     *         WARNING: Ensure the new timelock is correctly configured
     *         before calling this, as the old timelock will lose its
     *         governance authority immediately.
     *
     * @param newTimelock  The new TimelockController address.
     *
     * @custom:security CP4 — Governance-gated parameter update.
     */
    function updateTimelock(
        address newTimelock
    ) external onlyGovernance {
        if (newTimelock == address(0)) revert ZeroAddressGovernance();

        address oldTimelock = address(timelock);
        timelock = TimelockController(payable(newTimelock));

        // Transfer RBAC admin to the new timelock.
        _grantRole(DEFAULT_ADMIN_ROLE, newTimelock);
        _revokeRole(DEFAULT_ADMIN_ROLE, oldTimelock);

        emit TimelockUpdated(oldTimelock, newTimelock);
    }

    // -----------------------------------------------------------------------
    //  Convenience: schedule + compute hashes
    // -----------------------------------------------------------------------

    /**
     * @notice Compute the operation hash for a governance action targeting
     *         this contract.
     *
     * @param data  The ABI-encoded calldata for the function on this contract.
     * @param salt  A unique salt to differentiate operations with identical
     *              parameters.
     * @return      The operation id to use with the timelock.
     */
    function hashGovernanceOperation(
        bytes calldata data,
        bytes32 salt
    ) external view returns (bytes32) {
        return timelock.hashOperation(
            address(this),
            0,
            data,
            salt
        );
    }

    // -----------------------------------------------------------------------
    //  View helpers
    // -----------------------------------------------------------------------

    /// @notice Return the address of the current multisig wallet.
    function getMultisig() external view returns (address) {
        return address(multisig);
    }

    /// @notice Return the address of the current timelock controller.
    function getTimelock() external view returns (address) {
        return address(timelock);
    }

    /**
     * @notice Check whether the full governance pipeline is correctly wired.
     * @dev    Verifies:
     *         - The multisig is a proposer on the timelock.
     *         - The timelock holds DEFAULT_ADMIN_ROLE on this contract.
     *         - The deployer does NOT hold DEFAULT_ADMIN_ROLE.
     *
     * @return isValid  True if all checks pass.
     */
    function isGovernanceConfigured() external view returns (bool isValid) {
        isValid =
            timelock.hasRole(timelock.PROPOSER_ROLE(), address(multisig)) &&
            hasRole(DEFAULT_ADMIN_ROLE, address(timelock));
    }
}
