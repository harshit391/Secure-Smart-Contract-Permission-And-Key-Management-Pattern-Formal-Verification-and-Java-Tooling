# Dry Run — Full Project Execution Log

> **Date:** 2026-03-20
> **Purpose:** Complete record of running every component of the project from scratch,
> with real captured output and explanations of what each step does and proves.

---

## Environment

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | v24.13.0 | JavaScript runtime for Hardhat |
| npm | 11.4.2 | Package manager |
| Hardhat | 2.28.6 | Ethereum development framework |
| Solidity | 0.8.20 | Smart contract compiler (downloaded by Hardhat) |
| Java | 26 | Java toolkit runtime |
| Maven | 3.9.14 | Java build tool |
| OS | Windows 11 (MINGW64) | Development machine |

---

## Step 1: Clean Compile All Contracts

### Command
```bash
rm -rf artifacts cache    # Delete previous build output
npx hardhat compile       # Compile all .sol files from scratch
```

### Output
```
Compiled 6 Solidity files successfully (evm target: paris)
```

### What this does
The Solidity compiler (`solc` v0.8.20) reads all `.sol` files in the `contracts/` directory, type-checks them, and produces two artifacts for each contract:
- **ABI (Application Binary Interface):** A JSON file describing the contract's functions, their parameters, and return types. External tools (tests, scripts, dapps) use this to know how to interact with the contract.
- **Bytecode:** The compiled EVM machine code that gets deployed on-chain. This is what the Ethereum Virtual Machine actually executes.

The output says `evm target: paris` — this means the bytecode targets the Paris hardfork EVM version (post-Merge Ethereum).

### The 6 contracts compiled

| # | Contract | File | Purpose |
|---|----------|------|---------|
| 1 | MultiSigWallet | `contracts/MultiSigWallet.sol` | k-of-n multisig wallet (Pattern 1) |
| 2 | TimelockController | `contracts/TimelockController.sol` | Mandatory delay controller (Pattern 2) |
| 3 | RBACManager | `contracts/RBACManager.sol` | Role-based access control (Pattern 3) |
| 4 | Governed | `contracts/Governed.sol` | Composition of all three patterns |
| 5 | ECDSA | `contracts/utils/ECDSA.sol` | Signature recovery library with malleability protection |
| 6 | SimpleAdmin | `contracts/SimpleAdmin.sol` | Minimal single-admin baseline for gas comparison |

### What this proves
- All 6 Solidity files are syntactically and semantically correct
- No type errors, no compilation warnings
- The contracts are compatible with Solidity 0.8.20 and the optimizer (200 runs)

---

## Step 2: Run All Tests

### Command
```bash
npx hardhat test
```

### Output
```
  Adversarial Simulations
    Scenario 1: Single-key compromise -- forged signatures rejected
      ✔ should reject execution when attacker has 1 real key and forges 2 others
      ✔ should reject execution when attacker supplies only their own signature
    Scenario 2: Timelock bypass attempt -- early execution rejected
      ✔ should revert when attacker with EXECUTOR_ROLE tries to execute before eta
      ✔ should revert even 1 second before eta
    Scenario 3: Unauthorized role escalation -- proposeGrant rejected
      ✔ should revert when attacker proposes DEFAULT_ADMIN_ROLE for themselves
      ✔ should revert when attacker proposes OPERATOR_ROLE for themselves
      ✔ should revert when attacker proposes a role for an accomplice
      ✔ should revert when OPERATOR holder tries to escalate to ADMIN

  MultiSigWallet
    Successful execution (3-of-5)
      ✔ should execute a transaction with 3 valid owner signatures
      ✔ should increment the nonce after successful execution
    Rejection with insufficient signatures
      ✔ should revert when only 2 signatures are provided (below threshold)
    Rejection with duplicate signatures
      ✔ should revert when the same owner signs twice
    Replay attack prevention (P3)
      ✔ should reject reuse of signatures after nonce increment
    addOwner through multisig self-call (P4)
      ✔ should add a new owner when called through execute
      ✔ should revert when addOwner is called directly (not via execute)
    removeOwner through multisig self-call (P4)
      ✔ should remove an owner when called through execute
      ✔ should revert when removeOwner is called directly
    changeThreshold through multisig self-call (P4)
      ✔ should change the threshold when called through execute
      ✔ should revert when changeThreshold is called directly

  RBACManager
    Two-step role grant (P9)
      ✔ should grant a role only after propose + accept
    Reject acceptRole without prior proposal (P9)
      ✔ should revert acceptRole when there is no pending grant
    Reject proposeGrant from non-admin (P8)
      ✔ should revert when a non-admin calls proposeGrant
      ✔ should revert when a holder of OPERATOR_ROLE tries to grant OPERATOR_ROLE
    Revoke role by admin
      ✔ should allow admin to revoke a role from a holder
      ✔ should revert when a non-admin tries to revoke a role
    Renounce role by holder
      ✔ should allow a role holder to renounce their own role
    No privilege escalation (P10)
      ✔ should prevent a non-admin from granting themselves an admin role
      ✔ should not allow OPERATOR role holder to grant GUARDIAN role
      ✔ should not change admin mappings when a role is granted

  TimelockController
    Schedule and execute after delay
      ✔ should schedule an operation and execute it after the delay
    Reject early execution (P5)
      ✔ should revert when execute is called before the scheduled time
    Reject expired execution (P7)
      ✔ should revert when execute is called after eta + GRACE_PERIOD
    Cancel by authorized canceller
      ✔ should allow the canceller to cancel a scheduled operation
    Reject cancel by unauthorized account (P6)
      ✔ should revert when an unauthorized account tries to cancel
    Double execution prevention
      ✔ should revert on second execution of the same operation


  35 passing (2s)
```

### What this does
Hardhat spins up an in-memory Ethereum blockchain (Hardhat Network), deploys each contract fresh before every test (`beforeEach`), and then executes test scenarios using real EVM execution. Each `✔` means the test assertion passed — the contract behaved exactly as expected.

### Test-by-test explanation

#### MultiSigWallet (11 tests)

| Test | What it does | Property validated |
|------|-------------|-------------------|
| execute with 3 valid signatures | Deploys a 3-of-5 multisig, 3 owners sign via EIP-712, submits packed signatures. Verifies recipient balance increased. | **P1** — k signatures are sufficient |
| increment nonce | After successful execute, checks `nonce` went from 0 to 1. | **P3** — nonce advances to prevent replay |
| revert with 2 signatures | Submits only 2 signatures for threshold=3. Contract reverts with `InsufficientSignatures`. | **P1** — fewer than k signatures are rejected |
| revert with duplicate signer | Same owner signs twice. Contract detects ascending-order violation and reverts. | **P1/P2** — duplicate signers rejected |
| reject replayed signatures | Execute once (nonce=0), then replay same signatures. Contract rejects because nonce is now 1, digest changed. | **P3** — replay protection |
| addOwner via self-call | Encode `addOwner(newAddr)` as calldata, sign with 3 owners, execute targeting the wallet itself. New address becomes owner. | **P4** — governance via multisig |
| addOwner direct call reverts | Call `addOwner` directly from an owner account. Reverts with `NotSelf`. | **P4** — governance gated |
| removeOwner via self-call | Same pattern as addOwner but for removal. Owner is removed from set. | **P4** — governance via multisig |
| removeOwner direct call reverts | Direct call → `NotSelf` revert. | **P4** — governance gated |
| changeThreshold via self-call | Change threshold from 3 to 4 via multisig. | **P4** — governance via multisig |
| changeThreshold direct call reverts | Direct call → `NotSelf` revert. | **P4** — governance gated |

#### TimelockController (6 tests)

| Test | What it does | Property validated |
|------|-------------|-------------------|
| schedule and execute after delay | Schedule an operation with delay, advance time past ETA, execute. Verifies ETH transfer and timestamp set to sentinel (1 = done). | **P5** — delay works correctly |
| revert before scheduled time | Schedule, do NOT advance time, try execute. Reverts with `OperationNotReady`. | **P5** — early execution blocked |
| revert after grace period | Schedule, advance time past ETA + 14 days, try execute. Reverts with `OperationExpired`. | **P7** — expired operations blocked |
| canceller can cancel | Schedule, then cancel with canceller account. Timestamp resets to 0. | **P6** — authorized cancel works |
| unauthorized cancel reverts | Schedule, then try cancel from `unauthorized` account. Reverts with `AccessDenied`. | **P6** — unauthorized cancel blocked |
| double execution reverts | Execute once, try again. Reverts with `OperationAlreadyExecuted`. | Completeness — prevents double-spend |

#### RBACManager (10 tests)

| Test | What it does | Property validated |
|------|-------------|-------------------|
| propose + accept grants role | Admin proposes OPERATOR_ROLE for userA → pending. userA accepts → granted. Checks pending flag clears. | **P9** — two-step grant |
| acceptRole without proposal reverts | userB calls acceptRole without any proposal. Reverts with `NoPendingGrant`. | **P9** — must have pending proposal |
| non-admin proposeGrant reverts | nonAdmin calls proposeGrant. Reverts with `AccessDenied`. | **P8** — admin-gated |
| OPERATOR can't grant OPERATOR | userA (OPERATOR holder) tries to grant OPERATOR to userB. Reverts — OPERATOR is not admin of OPERATOR. | **P8/P10** — no horizontal escalation |
| admin can revoke | Admin revokes OPERATOR_ROLE from userA. Role removed. | **P8** — admin can revoke |
| non-admin revoke reverts | nonAdmin tries to revoke. Reverts with `AccessDenied`. | **P8** — admin-gated |
| holder can renounce | userA renounces their own OPERATOR_ROLE. Role removed. | Self-removal is safe |
| non-admin can't self-grant ADMIN | nonAdmin tries proposeGrant for DEFAULT_ADMIN_ROLE. Reverts. | **P10** — no vertical escalation |
| OPERATOR can't grant GUARDIAN | userA (OPERATOR) tries to grant GUARDIAN to userB. Reverts — admin of GUARDIAN is DEFAULT_ADMIN. | **P10** — no cross-role escalation |
| granting doesn't change admin mappings | After granting OPERATOR, admin of GUARDIAN is unchanged. | **P10** — role graph integrity |

#### Adversarial Simulations (8 tests)

| Test | Attack scenario | Property validated |
|------|----------------|-------------------|
| 1 real key + 2 forged | Attacker compromises 1 of 5 keys, creates 2 random wallets, signs. Contract reverts with `SignerNotOwner`. | **P1, P2** — forged signatures rejected |
| only 1 signature | Attacker sends single signature for threshold=3. Reverts with `InsufficientSignatures`. | **P1** — below threshold rejected |
| execute before ETA | Attacker with EXECUTOR_ROLE tries immediate execute. Reverts with `OperationNotReady`. | **P5** — timelock enforced |
| execute 1 second before ETA | Advance time to just under ETA. Still reverts. | **P5** — precise enforcement |
| propose ADMIN for self | Non-admin tries proposeGrant(DEFAULT_ADMIN_ROLE, self). Reverts with `AccessDenied`. | **P8, P10** — escalation blocked |
| propose OPERATOR for self | Same attack for OPERATOR_ROLE. Reverts. | **P8** — admin-gated |
| propose role for accomplice | Attacker proposes GUARDIAN for a friend. Reverts. | **P8** — admin-gated |
| OPERATOR tries to get ADMIN | Legitimate OPERATOR holder tries to grant themselves ADMIN. Reverts. | **P10** — no escalation path |

### What this proves
- **All 10 safety properties (P1-P10) are empirically validated** through 35 independent test scenarios
- **0 failures** — every contract behaves exactly as specified
- **3 adversarial attack vectors** are confirmed blocked
- Tests run in **2 seconds** total — fast enough for CI integration

---

## Step 3: Run Adversarial Tests Separately

### Command
```bash
npx hardhat test test/adversarial/adversarial.test.js
```

### Output
```
  Adversarial Simulations
    Scenario 1: Single-key compromise -- forged signatures rejected
      ✔ should reject execution when attacker has 1 real key and forges 2 others
      ✔ should reject execution when attacker supplies only their own signature
    Scenario 2: Timelock bypass attempt -- early execution rejected
      ✔ should revert when attacker with EXECUTOR_ROLE tries to execute before eta
      ✔ should revert even 1 second before eta
    Scenario 3: Unauthorized role escalation -- proposeGrant rejected
      ✔ should revert when attacker proposes DEFAULT_ADMIN_ROLE for themselves
      ✔ should revert when attacker proposes OPERATOR_ROLE for themselves
      ✔ should revert when attacker proposes a role for an accomplice
      ✔ should revert when OPERATOR holder tries to escalate to ADMIN


  8 passing (960ms)
```

### What this does
Runs only the adversarial test file — the 3 attack scenarios from Section VI-B of the paper. This produces a clean screenshot showing ONLY the security scenarios.

### What this proves
This is direct evidence for the paper's claim: "All three attacks were successfully blocked." Each scenario simulates a real attacker:
1. **Key compromise** — an attacker with 1 stolen key cannot drain funds
2. **Timelock bypass** — having the executor role is not enough, timing is independently enforced
3. **Role escalation** — low-privilege accounts cannot grant themselves higher roles

---

## Step 4: Gas Profiling

### Command
```bash
npx hardhat run scripts/gas-profile.js
```

### Output
```
===================================================
  Gas Profiling: Permission Pattern Contracts
===================================================

[Baseline] Deploying SimpleAdmin...
  [GAS] Deploy SimpleAdmin (baseline): 249489
  [GAS] Baseline: execute (single admin): 27301
  [GAS] Baseline: grantRole (single admin): 26921

[RBAC] Deploying RBACManager...
  [GAS] Deploy RBACManager: 508039
  [GAS] RBAC: proposeGrant: 53661
  [GAS] RBAC: acceptRole: 46624
  [GAS] RBAC: revokeRole: 29076

[Timelock] Deploying TimelockController...
  [GAS] Deploy TimelockController: 1036711
  [GAS] Timelock: schedule operation: 52945
  [GAS] Timelock: execute operation: 35926
  [GAS] Timelock: cancel operation: 25619

[MultiSig] Deploying MultiSigWallet...
  [GAS] Deploy MultiSigWallet (3-of-5): 1170948
  [GAS] MultiSig: execute (3-of-5): 74781

[Governed] Deploying Governed...
  [GAS] Deploy Governed (composition): 1993927

------------------------------------------------------------
  Operation                                       Gas Used
------------------------------------------------------------
  Deploy SimpleAdmin (baseline)                     249489
  Baseline: execute (single admin)                   27301
  Baseline: grantRole (single admin)                 26921
  Deploy RBACManager                                508039
  RBAC: proposeGrant                                 53661
  RBAC: acceptRole                                   46624
  RBAC: revokeRole                                   29076
  Deploy TimelockController                        1036711
  Timelock: schedule operation                       52945
  Timelock: execute operation                        35926
  Timelock: cancel operation                         25619
  Deploy MultiSigWallet (3-of-5)                   1170948
  MultiSig: execute (3-of-5)                         74781
  Deploy Governed (composition)                    1993927
------------------------------------------------------------
```

### What this does
The script deploys each contract to a fresh Hardhat local network and measures the exact gas consumed by each operation. The **baseline** is a minimal `SimpleAdmin` contract that uses a single `require(msg.sender == admin)` check — the simplest possible access control with no security patterns.

### How to read each measurement

#### Baseline (SimpleAdmin — no security patterns)

| Operation | Gas | What happens |
|-----------|-----|-------------|
| **Deploy SimpleAdmin** | 249,489 | Deploys a trivial contract: stores one admin address, has execute + grantRole functions with `require(msg.sender == admin)`. This is the cheapest possible admin contract. |
| **Baseline execute** | 27,301 | Single admin calls `execute(to, 0, "0x")`. Just checks `msg.sender == admin` and forwards the call. Minimal overhead. |
| **Baseline grantRole** | 26,921 | Single admin calls `grantRole(newAdmin)`. Just updates one storage slot. |

#### RBACManager (Pattern 3)

| Operation | Gas | What happens | Overhead vs baseline |
|-----------|-----|-------------|---------------------|
| **Deploy RBACManager** | 508,039 | Deploys the full RBAC contract with role mappings, pending grants, admin hierarchy, events, custom errors. | 103.6% more than baseline deploy |
| **proposeGrant** | 53,661 | Admin proposes a role grant. Checks caller has admin role, checks no duplicate proposal, writes `pendingGrant[role][account] = true`, emits event. | 99.3% more than baseline grantRole |
| **acceptRole** | 46,624 | Nominee accepts. Checks pending flag, clears it, writes role membership, emits event. | N/A (no baseline equivalent) |
| **revokeRole** | 29,076 | Admin revokes. Checks caller is admin, checks target has role, clears membership, emits event. | 8.0% more than baseline grantRole |

#### TimelockController (Pattern 2)

| Operation | Gas | What happens | Overhead vs baseline |
|-----------|-----|-------------|---------------------|
| **Deploy TimelockController** | 1,036,711 | Deploys with role mappings, timestamp storage, min delay, grace period constants, multiple role grants in constructor. | 315.6% more than baseline deploy |
| **schedule** | 52,945 | Proposer schedules an operation. Checks role, checks delay ≥ minDelay, checks not already scheduled, writes timestamp, emits event. | N/A (no baseline equivalent) |
| **execute** | 35,926 | Executor runs matured operation. Checks role, checks scheduled, checks not done, checks timestamp (P5), checks grace period (P7), marks done, forwards call, emits event. | 31.6% more than baseline execute |
| **cancel** | 25,619 | Canceller voids operation. Checks role, checks scheduled, clears timestamp, emits event. | N/A |

#### MultiSigWallet (Pattern 1)

| Operation | Gas | What happens | Overhead vs baseline |
|-----------|-----|-------------|---------------------|
| **Deploy MultiSigWallet** | 1,170,948 | Deploys with 5 owner addresses, threshold, nonce, EIP-712 domain separator, owner mapping + array, events, custom errors. Most expensive because of EIP-712 setup and 5 storage writes for owners. | 369.5% more than baseline deploy |
| **execute (3-of-5)** | 74,781 | Caller submits transaction + 3 packed signatures (195 bytes). Contract computes EIP-712 digest, calls `ecrecover` 3 times (~3000 gas each), checks ascending order, checks owner membership, increments nonce, forwards call, emits event. | 173.9% more than baseline execute |

#### Governed (Composition)

| Operation | Gas | What happens |
|-----------|-----|-------------|
| **Deploy Governed** | 1,993,927 | Deploys the Governed contract which ALSO deploys a TimelockController internally. The constructor creates proposer/executor/canceller arrays, deploys a new TimelockController, grants roles, and transfers RBAC admin to the timelock. This is the most expensive deploy because it includes two contract deployments in one transaction. |

### Overhead summary (Table III in the paper)

| Operation | Baseline | Pattern | Overhead | Dollar cost (10 gwei, $2k ETH) |
|-----------|----------|---------|----------|-------------------------------|
| Deploy (multisig 3/5) | 249,489 | 1,170,948 | 369.5% | $0.023 (one-time) |
| Execute tx (multisig 3/5) | 27,301 | 74,781 | 173.9% | $0.0015 |
| Schedule (timelock) | --- | 52,945 | --- | $0.0011 |
| Execute (timelock) | 27,301 | 35,926 | 31.6% | $0.0007 |
| Grant role (RBAC propose) | 26,921 | 53,661 | 99.3% | $0.0011 |
| Accept role (RBAC) | --- | 46,624 | --- | $0.0009 |

**Key takeaway:** The most expensive per-transaction operation (multisig execute) costs **$0.0015**. The Parity hack lost **$150,000,000**. The security cost is 100 billion times cheaper than the insecurity cost.

### What this proves
- Gas overhead is measurable and reasonable (32-174% per-operation)
- Dollar costs are negligible (< $0.05 per operation)
- Deployment costs are higher (up to 370%) but are one-time
- The patterns are practical for production use on Ethereum

---

## Step 5: Deploy All Contracts

### Command
```bash
npx hardhat run scripts/deploy.js
```

### Output
```
Deploying contracts with account: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Account balance: 10000.0 ETH
---------------------------------------------------

[1/4] Deploying RBACManager...
  RBACManager deployed at: 0x5FbDB2315678afecb367f032d93F642f64180aa3

[2/4] Deploying TimelockController...
  TimelockController deployed at: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512

[3/4] Deploying MultiSigWallet...
  MultiSigWallet deployed at: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
  Owners: [
    '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    '0x6CfA189Ac57498c07628b16E7407083e284f3066',
    '0x56aB0Ad30D5DaEcCaA4A10451C9336A4Ae68a7FE',
    '0x1543B5c9bdAD6B601CC3C34C5884c0DE6FD004Df',
    '0x2AB2B7D1D250Dc5F2294b5B91E774AAa1A0B8729'
  ]
  Threshold: 3

[4/4] Deploying Governed...
  Governed deployed at: 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9

===================================================
  Deployment Summary
===================================================
  RBACManager            : 0x5FbDB2315678afecb367f032d93F642f64180aa3
  TimelockController     : 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
  MultiSigWallet         : 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
  Governed               : 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
===================================================
```

### What this does
Deploys all 4 contracts to the in-process Hardhat network (local blockchain). Each contract gets a unique Ethereum address. The deployer account (`0xf39F...`) is Hardhat's default first account with 10,000 ETH.

### What each address means
- `0x5FbD...` — RBACManager lives here. Deployer has DEFAULT_ADMIN_ROLE.
- `0xe7f1...` — TimelockController lives here. Deployer is proposer, executor, canceller, and admin.
- `0x9fE4...` — MultiSigWallet lives here. 5 owners, threshold=3. Deployer is owner[0], others are random addresses.
- `0xCf7E...` — Governed lives here. Internally created its own TimelockController. Multisig is sole proposer on the timelock.

### What this proves
- All 4 contracts deploy successfully without errors
- The constructor logic (role grants, owner setup, timelock configuration) works correctly
- The Governed composition pattern successfully wires multisig → timelock → RBAC in a single deployment

---

## Step 6: Compile Java Toolkit

### Command
```bash
cd java-toolkit
mvn clean compile
```

### Output
```
[INFO] Compiling 8 source files with javac [debug release 17] to target\classes
[INFO] BUILD SUCCESS
```

### What this does
Maven downloads dependencies (web3j, jackson, slf4j, commons-io), then compiles all 8 Java source files in `src/main/java/edu/chitkara/scverify/`.

### The 8 Java classes

| Class | Purpose |
|-------|---------|
| `VerificationPipeline.java` | Main entry point. Orchestrates all 6 stages: compile → deploy → Slither → Mythril → Certora → report. |
| `SlitherRunner.java` | Invokes `slither` CLI as a subprocess, parses JSON output into Finding objects. |
| `MythrilRunner.java` | Invokes `myth analyze` CLI as a subprocess, parses output. |
| `CertoraRunner.java` | Invokes `certoraRun` CLI as a subprocess, parses verification results. |
| `DeploymentManager.java` | Uses web3j to deploy contracts to a configured Ethereum network. |
| `ReportGenerator.java` | Aggregates all findings and results into JSON + text reports. |
| `Finding.java` | Data model for a security finding (severity, description, location). |
| `VerificationResult.java` | Data model for a verification result (property, status, time). |

### What this proves
- The Java toolkit compiles without errors on Java 17+ (tested on Java 26)
- All 8 classes are syntactically correct and all dependencies resolve
- The Maven build system is properly configured
- Enterprise Java teams can use this toolkit in their CI pipelines

---

## Final Summary

| Step | Command | Result | What it proves |
|------|---------|--------|---------------|
| **1. Compile** | `npx hardhat compile` | 6 files, 0 warnings | All contracts are valid Solidity |
| **2. All tests** | `npx hardhat test` | **35 passing, 0 failing** | All 10 properties (P1-P10) empirically validated |
| **3. Adversarial** | `npx hardhat test test/adversarial/adversarial.test.js` | **8 passing** | 3 attack scenarios blocked |
| **4. Gas profile** | `npx hardhat run scripts/gas-profile.js` | Full table captured | Overhead: 32-174% per-operation, < $0.05 |
| **5. Deploy** | `npx hardhat run scripts/deploy.js` | 4 contracts deployed | Deployment works end-to-end |
| **6. Java** | `mvn clean compile` | **BUILD SUCCESS** | Java CI toolkit compiles |

### Properties validated by this dry run

| Property | Description | Validated by |
|----------|-------------|-------------|
| **P1** | k-of-n signature requirement | Tests: execute ✓, insufficient sigs ✗, forged sigs ✗ |
| **P2** | No unilateral execution | Tests: single signature ✗, 3 needed |
| **P3** | Replay protection | Tests: nonce increments, replay reverts |
| **P4** | Governance gated | Tests: addOwner/removeOwner/changeThreshold via execute ✓, direct ✗ |
| **P5** | No early execution | Tests: before ETA ✗, after ETA ✓, 1 second before ✗ |
| **P6** | Cancel restricted | Tests: canceller ✓, unauthorized ✗ |
| **P7** | Expiry enforced | Tests: after grace period ✗ |
| **P8** | Admin-gated grants | Tests: admin ✓, non-admin ✗, OPERATOR can't grant ✗ |
| **P9** | Two-step grant | Tests: propose→accept ✓, accept without propose ✗ |
| **P10** | No escalation | Tests: self-grant ADMIN ✗, OPERATOR→ADMIN ✗, OPERATOR→GUARDIAN ✗ |

---

*Dry run completed: 2026-03-20*
*All 35 tests passing. All contracts compiling. All scripts executing. Java toolkit building.*
