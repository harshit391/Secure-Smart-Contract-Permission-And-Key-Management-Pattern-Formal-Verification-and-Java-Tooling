# Formal Safety Properties (P1-P10)

These properties are formally verified using the Certora Prover against CVL specifications in the `specs/` directory.

## Multisig Properties (specs/multisig.spec)

| ID | Property | Description |
|----|----------|-------------|
| P1 | **k-of-n signature requirement** | At least `k` distinct valid signatures are required for any transaction to execute. The contract must revert if fewer than `k` valid signatures are provided. |
| P2 | **No unilateral execution** | No single address can execute a transaction unilaterally, regardless of their role. Even if an address is an owner, they cannot bypass the threshold. |
| P3 | **Replay protection** | Each signed message is accepted at most once. The nonce increments monotonically after each execution, preventing replay of previous signatures. |
| P4 | **Owner-set integrity** | Changes to the owner set (adding/removing owners or changing the threshold) require multisig approval. No single owner can modify the owner list. |

## Timelock Properties (specs/timelock.spec)

| ID | Property | Description |
|----|----------|-------------|
| P5 | **Minimum delay enforcement** | No operation can execute before `block.timestamp >= scheduledTime + minDelay`. The contract must revert on premature execution attempts. |
| P6 | **Cancel authorization** | Only accounts with the canceller role can cancel queued operations. Unauthorized cancel attempts must revert. |
| P7 | **Grace period expiry** | Operations that exceed `scheduledTime + minDelay + gracePeriod` cannot be executed. Stale operations are effectively invalidated. |

## RBAC Properties (specs/rbac.spec)

| ID | Property | Description |
|----|----------|-------------|
| P8 | **Admin-only role management** | Only a role's designated admin can grant or revoke that role. This prevents horizontal privilege escalation between non-admin roles. |
| P9 | **Two-step role transfer** | Role transfer requires explicit acceptance by the new holder. A pending transfer that is not accepted has no effect on current permissions. |
| P10 | **No escalation paths** | No sequence of operations allows an account to obtain a role it is not authorized to hold. The role graph contains no exploitable escalation paths. |

## Property-to-Exploit Mapping

| Historical Exploit | Violated Properties | How Our Patterns Prevent It |
|--------------------|--------------------|-----------------------------|
| Parity Multisig Hack (2017) | P1, P4 | k-of-n threshold + owner-set integrity |
| Ronin Bridge Attack (2022) | P1, P2 | Multisig prevents single-key compromise |
| The DAO (2016) | P5, P8 | Timelock delay + RBAC restricts sensitive operations |
