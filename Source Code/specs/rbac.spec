// ============================================================================
// Certora CVL Specification for RBACManager
// Properties: P8  (adminGatedGrants),
//             P9  (explicitAcceptance),
//             P10 (noEscalationPath)
//
// Paper: "Secure Smart-Contract Permission & Key Management"
// ============================================================================

// ---------- methods block ----------
methods {
    // State accessors (envfree = no env needed, pure view)
    function hasRole(bytes32, address)          external returns (bool) envfree;
    function getRoleAdmin(bytes32)              external returns (bytes32) envfree;
    function isPendingGrant(bytes32, address)   external returns (bool) envfree;
    function DEFAULT_ADMIN_ROLE()               external returns (bytes32) envfree;
}

// ============================================================================
// P8 -- adminGatedGrants
//
// proposeGrant reverts if the caller does not hold the admin role for the
// target role.
// ============================================================================
rule adminGatedGrants(env e, bytes32 role, address account) {
    bytes32 adminRole = getRoleAdmin(role);

    // Caller does NOT hold the admin role for `role`
    require !hasRole(adminRole, e.msg.sender);

    proposeGrant@withrevert(e, role, account);

    assert lastReverted,
        "P8 violated: proposeGrant must revert when caller is not admin of the target role";
}

// ============================================================================
// P9 -- explicitAcceptance
//
// A role is only actually granted after acceptRole is called by the target
// account.  Immediately after proposeGrant (without acceptRole), the
// account must NOT yet hold the role.
// ============================================================================
rule explicitAcceptance_proposeDoesNotGrant(env e1, bytes32 role, address account) {
    // Account does not currently hold the role
    require !hasRole(role, account);

    // Successful proposal
    proposeGrant(e1, role, account);

    // The role must still not be granted -- only pending
    assert !hasRole(role, account),
        "P9 violated: proposeGrant must not directly grant the role; acceptRole is required";

    // Pending flag must be set
    assert isPendingGrant(role, account),
        "P9 violated: proposeGrant must set the pendingGrant flag for the account";
}

rule explicitAcceptance_acceptGrantsRole(env e2, bytes32 role) {
    address account = e2.msg.sender;

    // There is a pending grant for this account
    require isPendingGrant(role, account);

    // Account does not yet hold the role
    require !hasRole(role, account);

    acceptRole(e2, role);

    // After acceptance the role must be granted
    assert hasRole(role, account),
        "P9 violated: after acceptRole, the account must hold the role";

    // Pending flag must be cleared
    assert !isPendingGrant(role, account),
        "P9 violated: after acceptRole, the pendingGrant flag must be cleared";
}

// ============================================================================
// P10 -- noEscalationPath
//
// Part A: A non-admin cannot grant themselves an admin role.
// Part B: Granting a role does not change any other role's admin mapping.
// ============================================================================
rule noEscalationPath_selfGrant(env e, bytes32 role) {
    bytes32 adminRole = getRoleAdmin(role);

    // Caller is NOT an admin of the target role
    require !hasRole(adminRole, e.msg.sender);

    // Caller tries to propose granting the role to themselves
    proposeGrant@withrevert(e, role, e.msg.sender);

    assert lastReverted,
        "P10-a violated: a non-admin must not be able to propose a grant to themselves";
}

rule noEscalationPath_adminUnchanged(
    env e1,
    env e2,
    bytes32 targetRole,
    address account,
    bytes32 otherRole
) {
    // Record the admin of some other role before the grant flow
    bytes32 adminBefore = getRoleAdmin(otherRole);

    // Successfully propose + accept a grant for targetRole
    proposeGrant(e1, targetRole, account);

    // Account accepts (msg.sender == account)
    require e2.msg.sender == account;
    acceptRole(e2, targetRole);

    // The admin mapping for otherRole must be unchanged
    bytes32 adminAfter = getRoleAdmin(otherRole);

    assert adminAfter == adminBefore,
        "P10-b violated: granting a role must not change the admin of any other role";
}

// ============================================================================
// Auxiliary: revokeRole removes the role
// ============================================================================
rule revokeRemovesRole(env e, bytes32 role, address account) {
    bytes32 adminRole = getRoleAdmin(role);

    // Caller is admin
    require hasRole(adminRole, e.msg.sender);

    // Account currently holds the role
    require hasRole(role, account);

    revokeRole(e, role, account);

    assert !hasRole(role, account),
        "revokeRole must remove the role from the account";
}

// ============================================================================
// Auxiliary: renounceRole allows self-removal
// ============================================================================
rule renounceRemovesSelfRole(env e, bytes32 role) {
    address account = e.msg.sender;

    // Account currently holds the role
    require hasRole(role, account);

    renounceRole(e, role, account);

    assert !hasRole(role, account),
        "renounceRole must remove the role from the caller";
}
