// ============================================================================
// Certora CVL Specification for TimelockController
// Properties: P5 (noEarlyExecution),
//             P6 (cancelRestricted),
//             P7 (expiryEnforced)
//
// Paper: "Secure Smart-Contract Permission & Key Management"
// ============================================================================

// ---------- methods block ----------
methods {
    // State accessors (envfree = no env needed, pure view)
    function getTimestamp(bytes32)         external returns (uint256) envfree;
    function minDelay()                   external returns (uint256) envfree;
    function GRACE_PERIOD()               external returns (uint256) envfree;
    function PROPOSER_ROLE()              external returns (bytes32) envfree;
    function EXECUTOR_ROLE()              external returns (bytes32) envfree;
    function CANCELLER_ROLE()             external returns (bytes32) envfree;
    function hasRole(bytes32, address)    external returns (bool)    envfree;
}

// ============================================================================
// P5 -- noEarlyExecution
//
// execute reverts if block.timestamp < eta (the scheduled execution time).
// ============================================================================
rule noEarlyExecution(
    env e,
    bytes32 id,
    address to,
    uint256 value,
    bytes data
) {
    uint256 eta = getTimestamp(id);

    // The operation is scheduled (eta > 1; sentinel 1 = "done")
    require eta > 1;

    // Current block timestamp is strictly before eta
    require e.block.timestamp < eta;

    execute@withrevert(e, id, to, value, data);

    assert lastReverted,
        "P5 violated: execute must revert when block.timestamp < eta";
}

// ============================================================================
// P6 -- cancelRestricted
//
// cancel reverts if the caller does not hold CANCELLER_ROLE.
// ============================================================================
rule cancelRestricted(env e, bytes32 id) {
    bytes32 cancellerRole = CANCELLER_ROLE();

    // The operation is scheduled
    require getTimestamp(id) > 1;

    // Caller does NOT hold the CANCELLER_ROLE
    require !hasRole(cancellerRole, e.msg.sender);

    cancel@withrevert(e, id);

    assert lastReverted,
        "P6 violated: cancel must revert when caller lacks CANCELLER_ROLE";
}

// ============================================================================
// P7 -- expiryEnforced
//
// execute reverts if block.timestamp > eta + GRACE_PERIOD.
// ============================================================================
rule expiryEnforced(
    env e,
    bytes32 id,
    address to,
    uint256 value,
    bytes data
) {
    uint256 eta   = getTimestamp(id);
    uint256 grace = GRACE_PERIOD();

    // The operation is scheduled
    require eta > 1;

    // Guard against overflow
    require eta + grace >= eta;

    // Current block timestamp is past the grace window
    require e.block.timestamp > eta + grace;

    execute@withrevert(e, id, to, value, data);

    assert lastReverted,
        "P7 violated: execute must revert when block.timestamp > eta + GRACE_PERIOD";
}

// ============================================================================
// Auxiliary: schedule sets a valid eta (realistic: block.timestamp > 0)
// ============================================================================
rule scheduleRecordsEta(
    env e,
    bytes32 id,
    address target,
    uint256 value,
    bytes data,
    uint256 delay
) {
    // The slot is currently empty (not yet scheduled)
    require getTimestamp(id) == 0;

    // Realistic assumption: block.timestamp is always > 0 on any real chain
    require e.block.timestamp > 0;

    schedule(e, id, target, value, data, delay);

    // After scheduling, the timestamp must be set (non-zero)
    assert getTimestamp(id) > 0,
        "schedule must record a non-zero eta in the timestamps mapping";
}

// ============================================================================
// Auxiliary: once executed (sentinel = 1), operation cannot be re-executed
// ============================================================================
rule noDoubleExecution(
    env e,
    bytes32 id,
    address to,
    uint256 value,
    bytes data
) {
    // The operation was already executed (sentinel value 1)
    require getTimestamp(id) == 1;

    execute@withrevert(e, id, to, value, data);

    assert lastReverted,
        "An already-executed operation (timestamp == 1) must not execute again";
}
