// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title RBACManager
 * @author Harshit Singla — "Secure Smart-Contract Permission & Key Management"
 * @notice Role-Based Access Control (RBAC) with two-step grant (propose +
 *         accept) to prevent accidental privilege assignment to incorrect or
 *         non-existent accounts.
 *
 * @dev Design overview
 *  ┌──────────────────────────────────────────────────────────────────────┐
 *  │  Each role has an *admin role*.  Only the admin of a role may:       │
 *  │    • propose granting the role to a new account                     │
 *  │    • revoke the role from an existing member                        │
 *  │    • change the admin of the role                                   │
 *  │                                                                      │
 *  │  The DEFAULT_ADMIN_ROLE (0x00) is the initial admin for all roles.  │
 *  │  It is its own admin.                                                │
 *  └──────────────────────────────────────────────────────────────────────┘
 *
 *  Two-step granting flow:
 *    1. Admin calls `proposeGrant(role, account)` → records a pending
 *       proposal.
 *    2. The nominee calls `acceptRole(role)` → role is granted.
 *
 *  This pattern ensures:
 *    P9  — Explicit acceptance: the recipient must actively opt in.
 *    P8  — Admin-gated grants: only the role's admin may initiate.
 *    P10 — No escalation path: a role member cannot grant itself a higher
 *           role or modify admin mappings it does not control.
 *
 *  Self-removal is always allowed via `renounceRole(role)`.
 *
 * Verification annotations:
 *  VA-RBAC-1  proposeGrant checks onlyRole(adminRole)       (P8)
 *  VA-RBAC-2  acceptRole checks _pendingGrants               (P9)
 *  VA-RBAC-3  revokeRole checks onlyRole(adminRole)          (P8)
 *  VA-RBAC-4  renounceRole requires msg.sender == account     (self only)
 *  VA-RBAC-5  setRoleAdmin checks onlyRole(currentAdmin)     (P10)
 */
contract RBACManager {
    // -----------------------------------------------------------------------
    //  Constants
    // -----------------------------------------------------------------------

    /**
     * @notice The default admin role.
     * @dev    `bytes32(0)`.  Every role's adminRole defaults to this.
     *         The DEFAULT_ADMIN_ROLE is its own admin.
     */
    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;

    // -----------------------------------------------------------------------
    //  State — Role storage
    // -----------------------------------------------------------------------

    /**
     * @dev Internal representation of a role.
     *
     *  adminRole — the bytes32 identifier of the role that administers
     *              this role (defaults to DEFAULT_ADMIN_ROLE).
     *  members   — mapping from address to membership boolean.
     */
    struct RoleData {
        bytes32 adminRole;
        mapping(address => bool) members;
    }

    /// @dev role => RoleData
    mapping(bytes32 => RoleData) private _roles;

    // -----------------------------------------------------------------------
    //  State — Two-step grant proposals
    // -----------------------------------------------------------------------

    /**
     * @dev Mapping from (role, account) to whether a pending grant proposal
     *      exists.  Set to `true` by `proposeGrant` and cleared by
     *      `acceptRole` or `cancelProposal`.
     */
    mapping(bytes32 => mapping(address => bool)) private _pendingGrants;

    // -----------------------------------------------------------------------
    //  Events
    // -----------------------------------------------------------------------

    /// @notice Emitted when a grant is proposed (step 1 of two-step grant).
    event RoleProposed(
        bytes32 indexed role,
        address indexed account,
        address indexed proposer
    );

    /// @notice Emitted when a role is officially granted (step 2).
    event RoleGranted(
        bytes32 indexed role,
        address indexed account
    );

    /// @notice Emitted when a role is revoked (by admin or self-renounce).
    event RoleRevoked(
        bytes32 indexed role,
        address indexed account
    );

    /// @notice Emitted when the admin of a role is changed.
    event RoleAdminChanged(
        bytes32 indexed role,
        bytes32 indexed previousAdminRole,
        bytes32 indexed newAdminRole
    );

    /// @notice Emitted when a pending grant proposal is cancelled.
    event ProposalCancelled(
        bytes32 indexed role,
        address indexed account
    );

    // -----------------------------------------------------------------------
    //  Errors
    // -----------------------------------------------------------------------

    error AccessDenied(bytes32 role, address account);
    error NoPendingGrant(bytes32 role, address account);
    error GrantAlreadyPending(bytes32 role, address account);
    error AlreadyHasRole(bytes32 role, address account);
    error DoesNotHaveRole(bytes32 role, address account);
    error CanOnlyRenounceSelf(address caller, address account);
    error ZeroAddress();

    // -----------------------------------------------------------------------
    //  Modifiers
    // -----------------------------------------------------------------------

    /**
     * @dev Restrict access to holders of `role`.
     *
     * @custom:security Used throughout to enforce P8 / P10.
     */
    modifier onlyRole(bytes32 role) {
        if (!hasRole(role, msg.sender)) {
            revert AccessDenied(role, msg.sender);
        }
        _;
    }

    // -----------------------------------------------------------------------
    //  Constructor
    // -----------------------------------------------------------------------

    /**
     * @notice Deploy the RBAC manager and grant the deployer the
     *         DEFAULT_ADMIN_ROLE.
     */
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // -----------------------------------------------------------------------
    //  Two-step grant flow
    // -----------------------------------------------------------------------

    /**
     * @notice Step 1 — Propose granting `role` to `account`.
     * @dev    Only the current admin of `role` may call this.
     *
     * @param role    The role to grant.
     * @param account The nominee address.
     *
     * @custom:security
     *  VA-RBAC-1  Caller must hold the admin role for `role`   (P8).
     */
    function proposeGrant(
        bytes32 role,
        address account
    ) external virtual onlyRole(getRoleAdmin(role)) {
        if (account == address(0)) revert ZeroAddress();
        if (hasRole(role, account)) revert AlreadyHasRole(role, account);
        if (_pendingGrants[role][account]) {
            revert GrantAlreadyPending(role, account);
        }

        _pendingGrants[role][account] = true;

        emit RoleProposed(role, account, msg.sender);
    }

    /**
     * @notice Step 2 — Accept a pending role grant.
     * @dev    Must be called by the nominee themselves.
     *
     * @param role  The role to accept.
     *
     * @custom:security
     *  VA-RBAC-2  A pending proposal must exist for (role, msg.sender) (P9).
     */
    function acceptRole(bytes32 role) external virtual {
        if (!_pendingGrants[role][msg.sender]) {
            revert NoPendingGrant(role, msg.sender);
        }

        // Clear the proposal.
        _pendingGrants[role][msg.sender] = false;

        // Grant the role.
        _grantRole(role, msg.sender);
    }

    /**
     * @notice Cancel a pending grant proposal.
     * @dev    Only the admin of `role` may cancel.
     *
     * @param role    The role.
     * @param account The nominee whose proposal should be cancelled.
     */
    function cancelProposal(
        bytes32 role,
        address account
    ) external virtual onlyRole(getRoleAdmin(role)) {
        if (!_pendingGrants[role][account]) {
            revert NoPendingGrant(role, account);
        }

        _pendingGrants[role][account] = false;

        emit ProposalCancelled(role, account);
    }

    // -----------------------------------------------------------------------
    //  Revocation
    // -----------------------------------------------------------------------

    /**
     * @notice Revoke `role` from `account`.
     * @dev    Only the admin of `role` may call this.
     *
     * @param role    The role to revoke.
     * @param account The address to revoke from.
     *
     * @custom:security VA-RBAC-3  Caller must hold the admin role (P8).
     */
    function revokeRole(
        bytes32 role,
        address account
    ) external virtual onlyRole(getRoleAdmin(role)) {
        if (!hasRole(role, account)) {
            revert DoesNotHaveRole(role, account);
        }

        _revokeRole(role, account);
    }

    /**
     * @notice Voluntarily renounce `role`.
     * @dev    An account can only renounce roles for itself.  This is a
     *         safety mechanism: an admin cannot forcibly renounce someone
     *         else's role via this function (use `revokeRole` instead).
     *
     * @param role    The role to renounce.
     * @param account Must equal `msg.sender`.
     *
     * @custom:security VA-RBAC-4  Self-only.
     */
    function renounceRole(
        bytes32 role,
        address account
    ) external virtual {
        if (msg.sender != account) {
            revert CanOnlyRenounceSelf(msg.sender, account);
        }
        if (!hasRole(role, account)) {
            revert DoesNotHaveRole(role, account);
        }

        _revokeRole(role, account);
    }

    // -----------------------------------------------------------------------
    //  Admin management
    // -----------------------------------------------------------------------

    /**
     * @notice Change the admin role for `role`.
     * @dev    Only the current admin of `role` may call this.
     *
     * @param role          The role whose admin is being changed.
     * @param newAdminRole  The new admin role identifier.
     *
     * @custom:security VA-RBAC-5  Only the current admin may change (P10).
     */
    function setRoleAdmin(
        bytes32 role,
        bytes32 newAdminRole
    ) external virtual onlyRole(getRoleAdmin(role)) {
        _setRoleAdmin(role, newAdminRole);
    }

    // -----------------------------------------------------------------------
    //  View functions
    // -----------------------------------------------------------------------

    /**
     * @notice Check whether `account` holds `role`.
     *
     * @param role    The role identifier.
     * @param account The address to check.
     * @return        True if the account is a member of the role.
     */
    function hasRole(
        bytes32 role,
        address account
    ) public view virtual returns (bool) {
        return _roles[role].members[account];
    }

    /**
     * @notice Return the admin role that governs `role`.
     *
     * @param role  The role to query.
     * @return      The bytes32 identifier of the admin role.
     */
    function getRoleAdmin(
        bytes32 role
    ) public view virtual returns (bytes32) {
        return _roles[role].adminRole;
    }

    /**
     * @notice Check if there is a pending grant proposal for (role, account).
     *
     * @param role    The role.
     * @param account The nominee.
     * @return        True if a proposal is pending.
     */
    function isPendingGrant(
        bytes32 role,
        address account
    ) public view virtual returns (bool) {
        return _pendingGrants[role][account];
    }

    // -----------------------------------------------------------------------
    //  Internal helpers
    // -----------------------------------------------------------------------

    /**
     * @dev Grant `role` to `account` without any access checks.
     *      Emits {RoleGranted} if the account did not already have the role.
     */
    function _grantRole(bytes32 role, address account) internal virtual {
        if (!_roles[role].members[account]) {
            _roles[role].members[account] = true;
            emit RoleGranted(role, account);
        }
    }

    /**
     * @dev Revoke `role` from `account` without any access checks.
     *      Emits {RoleRevoked}.
     */
    function _revokeRole(bytes32 role, address account) internal virtual {
        _roles[role].members[account] = false;
        emit RoleRevoked(role, account);
    }

    /**
     * @dev Set the admin role for `role` without any access checks.
     *      Emits {RoleAdminChanged}.
     *
     *      This internal helper exists so that inheriting contracts
     *      (e.g., Governed) can change role admins through their own
     *      access-control gates without needing direct access to the
     *      private `_roles` mapping.
     */
    function _setRoleAdmin(
        bytes32 role,
        bytes32 newAdminRole
    ) internal virtual {
        bytes32 previousAdmin = _roles[role].adminRole;
        _roles[role].adminRole = newAdminRole;
        emit RoleAdminChanged(role, previousAdmin, newAdminRole);
    }
}
