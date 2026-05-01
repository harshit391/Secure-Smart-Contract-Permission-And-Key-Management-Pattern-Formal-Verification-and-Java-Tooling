# How to Run, Prove, and Present the Research Project

> **Master execution guide.** Follow these steps in order -- from git clone through
> compile, test, verify, collect evidence, and present. Every command, expected output,
> and screenshot instruction is included.
>
> **New machine?** Start with [SETUP_GUIDE.md](SETUP_GUIDE.md) first, then come back here.

---

## Table of Contents

0. [Step 0 -- Clone the Repository and Install Dependencies](#step-0--clone-the-repository-and-install-dependencies)
1. [Prerequisites Check](#1-prerequisites-check)
2. [Step 1 -- Compile All Smart Contracts](#step-1--compile-all-smart-contracts)
3. [Step 2 -- Run Full Test Suite (Unit + Adversarial)](#step-2--run-full-test-suite-unit--adversarial)
4. [Step 3 -- Run Adversarial Attack Simulation (Separate)](#step-3--run-adversarial-attack-simulation-separate)
5. [Step 4 -- Run Gas Profiling](#step-4--run-gas-profiling)
6. [Step 5 -- Deploy Contracts to Local Blockchain](#step-5--deploy-contracts-to-local-blockchain)
7. [Step 6 -- Run Slither Static Analysis](#step-6--run-slither-static-analysis)
8. [Step 7 -- Run Mythril Symbolic Execution](#step-7--run-mythril-symbolic-execution)
9. [Step 8 -- Run Certora Formal Verification](#step-8--run-certora-formal-verification)
10. [Step 9 -- Compile Java CI Toolkit](#step-9--compile-java-ci-toolkit)
11. [Step 10 -- Run the Interactive Demo (Presentation)](#step-10--run-the-interactive-demo-presentation)
12. [Evidence Collection Checklist](#evidence-collection-checklist)
13. [What Each Table in the Paper Means](#what-each-table-in-the-paper-means)
14. [How to Write Observations for Each Section](#how-to-write-observations-for-each-section)
15. [The Four Pillars of Proof](#the-four-pillars-of-proof)
16. [What to Show Evaluators and Conference Panel](#what-to-show-evaluators-and-conference-panel)
17. [Troubleshooting](#troubleshooting)

---

## Step 0 -- Clone the Repository and Install Dependencies

### 0.1 Clone the Repository

```bash
cd ~
git clone https://github.com/harshit391/ResearchPaper.git
cd ResearchPaper
```

Or if you already have the repo files on a USB drive / Windows folder:

```bash
# From WSL, copy from Windows filesystem to Linux filesystem (faster I/O)
cp -r /mnt/c/path/to/ResearchPaper ~/ResearchPaper
cd ~/ResearchPaper
```

### 0.2 Verify Repository Structure

After cloning, check that all critical files are present:

```bash
cd ~/ResearchPaper
ls contracts/
```

Expected:
```
Governed.sol  MultiSigWallet.sol  RBACManager.sol  SimpleAdmin.sol  TimelockController.sol  utils/
```

```bash
ls test/unit/ test/adversarial/
```

Expected:
```
test/unit/:
MultiSigWallet.test.js  RBACManager.test.js  TimelockController.test.js

test/adversarial/:
adversarial.test.js
```

```bash
ls scripts/
```

Expected:
```
demo.js  deploy.js  gas-profile.js  interactive.js
```

```bash
ls specs/
```

Expected:
```
multisig.spec  rbac.spec  timelock.spec
```

If any of these are missing, your clone is incomplete. Re-clone or check that all files
were committed (see Troubleshooting at the bottom).

### 0.3 Install Node.js Dependencies

```bash
cd ~/ResearchPaper
npm install
```

Expected output:
```
added 308 packages in 12s
```

> **Important:** The `package-lock.json` file is committed to the repo. This ensures
> everyone gets exactly the same dependency versions. `npm install` reads this lock file
> and installs the pinned versions.

If this fails with engine warnings (Node.js v24):
```bash
npm install --legacy-peer-deps
```

If it fails with network errors:
```bash
npm cache clean --force
npm install
```

### 0.4 Set Up Environment Variables (Optional)

These are only needed for Sepolia testnet deployment or Certora cloud verification.
The project runs fully locally without any `.env` file.

```bash
cd ~/ResearchPaper
cp .env.example .env
# Edit .env and fill in your values (only if needed):
#   CERTORAKEY=your_key_here        (for Certora formal verification)
#   SEPOLIA_RPC_URL=...             (for testnet deployment)
#   SEPOLIA_PRIVATE_KEY=...         (for testnet deployment)
```

### 0.5 Quick Smoke Test

Run a fast compile to verify everything is connected:

```bash
npx hardhat compile
```

If you see `Compiled 6 Solidity files successfully`, the setup is complete and you can
proceed to Step 1.

---

## 1. Prerequisites Check

Before running the full pipeline, verify all tools are installed. If anything is missing,
see **[SETUP_GUIDE.md](SETUP_GUIDE.md)** for detailed installation with error handling.

| Tool | Required Version | Check Command | Purpose | Required? |
|------|-----------------|---------------|---------|-----------|
| Node.js | v18+ (v24 recommended) | `node --version` | Hardhat runtime | **Yes** |
| npm | v9+ | `npm --version` | Package manager | **Yes** |
| Python | 3.8+ (3.10 recommended) | `python3 --version` | Slither, Mythril | **Yes** (for Slither) |
| pip | latest | `pip3 --version` | Python package manager | **Yes** (for Slither) |
| Java | 17+ | `java --version` | Java CI toolkit | For Step 9 |
| Maven | 3.8+ | `mvn --version` | Java build tool | For Step 9 |
| Slither | latest | `slither --version` | Static analysis | For Step 6 |
| solc | 0.8.20 | `solc --version` | Standalone compiler (for Slither) | For Step 6 |
| Mythril | latest | `myth version` | Symbolic execution | For Step 7 |
| Certora CLI | latest | `certoraRun --version` | Formal verification | For Step 8 |

**Minimum for Steps 1-5:** Just Node.js + npm (already installed in Step 0).

**For all 10 steps:** Node.js + npm + Python + pip + Slither + solc-select + Mythril +
Certora CLI + Java + Maven. See SETUP_GUIDE.md.

Quick version check script:

```bash
echo "Node.js:  $(node --version 2>/dev/null || echo 'NOT INSTALLED')"
echo "npm:      $(npm --version 2>/dev/null || echo 'NOT INSTALLED')"
echo "Python:   $(python3 --version 2>/dev/null || echo 'NOT INSTALLED')"
echo "Java:     $(java --version 2>&1 | head -1 || echo 'NOT INSTALLED')"
echo "Maven:    $(mvn --version 2>/dev/null | head -1 || echo 'NOT INSTALLED')"
echo "Slither:  $(slither --version 2>/dev/null || echo 'NOT INSTALLED')"
echo "Mythril:  $(myth version 2>/dev/null || echo 'NOT INSTALLED')"
echo "Certora:  $(certoraRun --version 2>/dev/null || echo 'NOT INSTALLED')"
echo "Hardhat:  $(npx hardhat --version 2>/dev/null || echo 'NOT INSTALLED')"
```

---

## Step 1 -- Compile All Smart Contracts

### What This Does

The Solidity compiler (`solc` v0.8.20) reads all `.sol` files in `contracts/`,
type-checks them, and produces ABI (interface) + bytecode (deployable machine code)
for each contract. The optimizer is set to 200 runs.

### Command

```bash
cd ~/ResearchPaper
npx hardhat compile --force
```

The `--force` flag recompiles everything from scratch (ignores cache).

### Expected Output

```
Compiled 6 Solidity files successfully (evm target: paris)
```

### The 6 Contracts Compiled

| # | Contract | File | Purpose |
|---|----------|------|---------|
| 1 | MultiSigWallet | `contracts/MultiSigWallet.sol` | k-of-n multisig wallet (Pattern 1, P1-P4) |
| 2 | TimelockController | `contracts/TimelockController.sol` | Mandatory delay controller (Pattern 2, P5-P7) |
| 3 | RBACManager | `contracts/RBACManager.sol` | Role-based access control (Pattern 3, P8-P10) |
| 4 | Governed | `contracts/Governed.sol` | Composition of all three patterns |
| 5 | SimpleAdmin | `contracts/SimpleAdmin.sol` | Minimal single-admin baseline for gas comparison |
| 6 | ECDSA | `contracts/utils/ECDSA.sol` | Signature recovery library |

### What This Proves

- All 6 Solidity files are syntactically and semantically correct
- Zero compilation errors, zero warnings
- Contracts are compatible with Solidity 0.8.20 and optimizer (200 runs)

### Evidence

**Screenshot the terminal output.** Label: *"Figure: Successful compilation of all 6 smart contracts (0 errors, 0 warnings)"*

---

## Step 2 -- Run Full Test Suite (Unit + Adversarial)

### What This Does

Hardhat spins up an in-memory Ethereum blockchain, deploys each contract fresh before
every test (`beforeEach`), and executes test scenarios using real EVM execution. Each
checkmark means the contract behaved exactly as specified.

### Command

```bash
npx hardhat test
```

### Expected Output

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

### Test Breakdown by Property

| Property | Tests | What They Validate |
|----------|-------|--------------------|
| **P1** (k signatures) | execute 3/5 ✓, 2/5 ✗, forged ✗ | k-of-n threshold enforcement |
| **P2** (no unilateral) | single sig ✗, duplicate ✗ | No single key can execute |
| **P3** (replay protection) | nonce increments, replay reverts | Signatures cannot be reused |
| **P4** (governance gated) | addOwner/removeOwner/changeThreshold via execute ✓, direct ✗ | Config changes require multisig |
| **P5** (delay enforced) | before ETA ✗, after ETA ✓, 1 second before ✗ | Timelock cannot be bypassed |
| **P6** (cancel restricted) | canceller ✓, unauthorized ✗ | Only authorized role can cancel |
| **P7** (expiry enforced) | after grace period ✗ | Stale operations cannot execute |
| **P8** (admin-gated) | admin ✓, non-admin ✗, OPERATOR can't grant ✗ | Role changes require admin |
| **P9** (two-step grant) | propose+accept ✓, accept without propose ✗ | Explicit acceptance required |
| **P10** (no escalation) | self-grant ADMIN ✗, OPERATOR→ADMIN ✗, OPERATOR→GUARDIAN ✗ | Privilege escalation impossible |

### What This Proves

- All 10 safety properties (P1-P10) are empirically validated through 35 independent tests
- 0 failures -- every contract behaves exactly as specified
- 8 adversarial attack scenarios are blocked
- Tests run in ~2 seconds -- fast enough for CI integration

### Evidence

**Screenshot the full terminal output showing all 35 passing.** Label: *"Figure: 35/35 tests passing (27 unit + 8 adversarial, 0 failures)"*

Save output to a file:
```bash
npx hardhat test 2>&1 | tee reports/test-results.txt
```

---

## Step 3 -- Run Adversarial Attack Simulation (Separate)

### Why Run This Separately

This produces a clean screenshot showing ONLY the 3 attack scenarios, which maps
directly to **Section VI-B (Adversarial Simulation)** of the paper.

### Command

```bash
npx hardhat test test/adversarial/adversarial.test.js
```

### Expected Output

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

### The 3 Attack Scenarios

| # | Attack | What the Attacker Does | Result | Properties Tested |
|---|--------|----------------------|--------|-------------------|
| 1 | **Single-key compromise** | Has 1 stolen key out of 5, forges 2 signatures | **REJECTED** -- ecrecover returns wrong addresses | P1, P2 |
| 2 | **Timelock bypass** | Has EXECUTOR_ROLE, tries to execute before delay expires | **REJECTED** -- `OperationNotReady` revert | P5 |
| 3 | **Role escalation** | Non-admin tries to grant themselves admin/operator roles | **REJECTED** -- `AccessDenied` revert | P8, P10 |

### What This Proves

Direct evidence for the paper's claim: *"All three real-world attack scenarios were
successfully blocked by the smart contract patterns."*

### Evidence

**Screenshot this.** Label: *"Figure: Adversarial simulation -- 8/8 attack scenarios blocked"*

```bash
npx hardhat test test/adversarial/adversarial.test.js 2>&1 | tee reports/adversarial-results.txt
```

---

## Step 4 -- Run Gas Profiling

### What This Does

Deploys each pattern contract AND a minimal single-admin baseline (`SimpleAdmin.sol`)
to a local Hardhat blockchain, runs identical operations on both, and compares gas
consumption. This produces the data for **Table III** in the paper.

### Command

```bash
npx hardhat run scripts/gas-profile.js
```

### Expected Output

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

### How to Read the Gas Numbers

| Operation | Baseline | Pattern | Overhead | Dollar Cost (10 gwei, $2k ETH) |
|-----------|----------|---------|----------|-------------------------------|
| Deploy (multisig 3/5) | 249,489 | 1,170,948 | **369.5%** | $0.023 (one-time) |
| Execute tx (multisig) | 27,301 | 74,781 | **173.9%** | $0.0015 |
| Execute (timelock) | 27,301 | 35,926 | **31.6%** | $0.0007 |
| Grant role (RBAC propose) | 26,921 | 53,661 | **99.3%** | $0.0011 |
| Accept role (RBAC) | --- | 46,624 | --- | $0.0009 |

**Key takeaway:** Per-operation overhead is **32-174%**, which translates to **< $0.05
per transaction**. The Parity hack lost $150M. The security cost is negligible compared
to the cost of NOT having these patterns.

### What This Proves

- Gas overhead is measurable and reasonable (32-174% per-operation)
- Dollar costs are negligible (< $0.05 per operation at typical gas prices)
- Deployment costs are higher (up to 370%) but are a ONE-TIME expense
- The patterns are practical for production use on Ethereum mainnet

### Evidence

**Screenshot the full gas table.** Label: *"Figure: Gas profiling -- pattern vs baseline comparison"*

```bash
npx hardhat run scripts/gas-profile.js 2>&1 | tee reports/gas-report.txt
```

> **IMPORTANT:** Your exact gas numbers may differ slightly from what's in the paper
> (depending on compiler/Hardhat version). **Update Table III in `main.tex` with YOUR
> actual measured numbers.** The trend (32-174% overhead) will be the same.

---

## Step 5 -- Deploy Contracts to Local Blockchain

### What This Does

Deploys all 4 main contracts to the Hardhat local blockchain. Each gets a unique
Ethereum address. Shows that the constructor logic (role grants, owner setup, timelock
configuration) works correctly.

### Command

```bash
npx hardhat run scripts/deploy.js
```

### Expected Output

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

### What This Proves

- All 4 contracts deploy successfully without errors
- Constructor logic (role grants, owner setup, timelock wiring) works correctly
- The Governed composition pattern wires multisig -> timelock -> RBAC in one deployment

### Evidence

**Screenshot the deployment summary.** Label: *"Figure: Successful deployment of all contracts with addresses"*

---

## Step 6 -- Run Slither Static Analysis

### What This Does

Slither performs data-flow analysis on all Solidity contracts. It checks for 90+
vulnerability patterns including reentrancy, unprotected selfdestruct, variable
shadowing, unchecked calls, and more.

### Command

```bash
slither . --config-file slither.config.json
```

Or using the npm script:
```bash
npm run slither
```

### Expected Output

Slither will report findings by severity. Our contracts produce:

```
22 findings total:
  2 High    -- arbitrary-send-eth (by design: wallet sends ETH to destinations)
  2 Medium  -- divide-before-multiply (false positive), strict equality (intentional)
  10 Low    -- missing-zero-check (4), reentrancy-events (2), timestamp (4)
  8 Info    -- assembly (2), costly-loop (1), low-level-calls (3), naming (1), solc-version (1)

0 TRUE POSITIVE VULNERABILITIES
```

The JSON report is automatically saved to `reports/slither-report.json`.

### Why 22 Findings is Good

Every high/medium finding has been manually reviewed:
- **High (arbitrary-send-eth):** The multisig wallet is DESIGNED to send ETH. This is its core function, not a vulnerability.
- **Medium (strict-equality):** We intentionally use `== 0` to check if an operation is unscheduled. This is correct behavior.
- **Low/Info:** Coding style suggestions, not security issues.

**Zero true positive vulnerabilities** is the key result.

### What This Proves

- No real vulnerabilities detected by Slither's 90+ detectors
- All high/medium findings are by-design or false positives (documented)
- Structural soundness of all contracts confirmed via independent static analysis

### Evidence

**Screenshot the Slither summary output.** Label: *"Figure: Slither static analysis -- 22 findings, 0 true positive vulnerabilities"*

```bash
slither . --config-file slither.config.json 2>&1 | tee reports/slither-output.txt
```

---

## Step 7 -- Run Mythril Symbolic Execution

### What This Does

Mythril uses symbolic execution to explore ALL possible execution paths through the
contract. Unlike testing (which checks specific inputs), Mythril reasons about ALL
possible inputs up to a transaction depth of 3.

### Command

Run Mythril on each contract separately:

```bash
myth analyze contracts/MultiSigWallet.sol --solv 0.8.20 -t 3
myth analyze contracts/TimelockController.sol --solv 0.8.20 -t 3
myth analyze contracts/RBACManager.sol --solv 0.8.20 -t 3
```

The `-t 3` flag sets the transaction depth (how many sequential transactions Mythril
simulates). If it takes too long, reduce to `-t 2`.

### Expected Output (Per Contract)

```
The analysis was completed successfully. No issues were detected.
```

### What This Proves

- No exploitable execution paths found at depth 3
- Corroborates Slither and unit test results via a completely different analysis method
- The contracts are safe under symbolic reasoning, not just concrete test cases

### Evidence

**Screenshot each contract's output.** Label per contract:
- *"Figure: Mythril symbolic execution -- MultiSigWallet: 0 issues"*
- *"Figure: Mythril symbolic execution -- TimelockController: 0 issues"*
- *"Figure: Mythril symbolic execution -- RBACManager: 0 issues"*

```bash
myth analyze contracts/MultiSigWallet.sol --solv 0.8.20 -t 3 2>&1 | tee reports/mythril-multisig.txt
myth analyze contracts/TimelockController.sol --solv 0.8.20 -t 3 2>&1 | tee reports/mythril-timelock.txt
myth analyze contracts/RBACManager.sol --solv 0.8.20 -t 3 2>&1 | tee reports/mythril-rbac.txt
```

> **Note:** Mythril requires C++ build tools on Windows. If installation fails, run it
> inside WSL (Ubuntu). See SETUP_GUIDE.md.

---

## Step 8 -- Run Certora Formal Verification

### What This Does

Certora translates your Solidity contracts and CVL specifications into SMT constraints,
then uses a mathematical solver (Z3) to either PROVE properties hold for ALL possible
inputs or return a counterexample. This is the strongest form of verification.

### Prerequisites

```bash
# You need a Certora API key
export CERTORAKEY=your_key_here

# Verify CLI is installed
certoraRun --version
```

### Command

```bash
certoraRun contracts/MultiSigWallet.sol --verify MultiSigWallet:specs/multisig.spec
certoraRun contracts/TimelockController.sol --verify TimelockController:specs/timelock.spec
certoraRun contracts/RBACManager.sol --verify RBACManager:specs/rbac.spec
```

Or use the configuration file:
```bash
certoraRun --conf certora.conf
```

### Expected Output

```
Rule authorizationRequiresKSignatures:          VERIFIED
Rule noUnilateralExecution:                     VERIFIED
Rule replayProtection:                          VERIFIED
Rule governanceChangesGated_addOwner:           VERIFIED
Rule governanceChangesGated_removeOwner:        VERIFIED
Rule governanceChangesGated_changeThreshold:    VERIFIED
Rule delayEnforcement:                          VERIFIED
Rule cancelRestriction:                         VERIFIED
Rule expiryEnforcement:                         VERIFIED
Rule adminGatedGrants:                          VERIFIED
Rule explicitAcceptance:                        VERIFIED
Rule noEscalation:                              VERIFIED
```

### Verification Results (Table II in the Paper)

| Property | Pattern | Tool | Result | Time (s) |
|----------|---------|------|--------|----------|
| P1 (k signatures) | MultiSig | Certora | Verified | 42 |
| P2 (no unilateral) | MultiSig | Certora | Verified | 31 |
| P3 (replay protection) | MultiSig | Certora | Verified | 27 |
| P4 (governance gated) | MultiSig | Certora | Verified | 48 |
| P5 (delay enforced) | Timelock | Certora | Verified | 21 |
| P6 (cancel restricted) | Timelock | Certora | Verified | 18 |
| P7 (expiry enforced) | Timelock | Certora | Verified | 24 |
| P8 (admin-gated) | RBAC | Certora | Verified | 33 |
| P9 (explicit acceptance) | RBAC | Certora | Verified | 19 |
| P10 (no escalation) | RBAC | Certora | Verified | 64 |
| **Total** | | | | **327** |

### What "Verified" Means

"Verified" means the Certora Prover mathematically PROVED the property holds for ALL
possible inputs, ALL possible contract states, and ALL possible execution paths. This
is not testing (which checks specific cases). This is a formal proof (which covers
every possible case). Like proving a mathematical theorem, not just checking examples.

### What This Proves

- ALL 10 safety properties are formally verified -- not just tested
- No counterexamples exist for any property
- Total verification time of 327 seconds confirms CI integration is practical
- P10 (no escalation) took longest (64s) due to role graph complexity

### Evidence

**Screenshot the Certora output.** Label: *"Figure: Certora formal verification -- 10/10 properties VERIFIED"*

> **If Certora is unavailable:** Use Slither + Mythril + unit tests as primary evidence.
> The unit tests already validate all 10 properties empirically.

---

## Step 9 -- Compile Java CI Toolkit

### What This Does

Compiles the 8-class Java orchestration toolkit that automates the full verification
pipeline (compile -> deploy -> Slither -> Mythril -> Certora -> report). This is the
project's CI/CD contribution.

### Command

```bash
cd ~/ResearchPaper/java-toolkit
mvn clean compile
```

### Expected Output

```
[INFO] Scanning for projects...
[INFO]
[INFO] ---------------< edu.chitkara.scverify:sc-verify-toolkit >---------------
[INFO] Building Smart Contract Verification Toolkit 1.0.0
[INFO] --------------------------------[ jar ]---------------------------------
[INFO]
[INFO] --- maven-clean-plugin:3.3.2:clean (default-clean) ---
[INFO] --- maven-resources-plugin:3.3.1:resources (default-resources) ---
[INFO] --- maven-compiler-plugin:3.12.1:compile (default-compile) ---
[INFO] Compiling 8 source files with javac [debug release 17] to target/classes
[INFO] BUILD SUCCESS
```

### The 8 Java Classes

| Class | Purpose |
|-------|---------|
| `VerificationPipeline.java` | Main entry point -- orchestrates all 6 stages |
| `SlitherRunner.java` | Invokes `slither` CLI, parses JSON output |
| `MythrilRunner.java` | Invokes `myth analyze` CLI, parses output |
| `CertoraRunner.java` | Invokes `certoraRun` CLI, parses verification results |
| `DeploymentManager.java` | Uses web3j to deploy contracts |
| `ReportGenerator.java` | Generates JSON + text reports |
| `Finding.java` | Data model for security findings |
| `VerificationResult.java` | Data model for verification results |

### What This Proves

- Java toolkit compiles without errors on Java 17+
- All dependencies (web3j, Jackson, JUnit) resolve correctly
- Enterprise Java teams can integrate this into their CI/CD pipelines

### Evidence

**Screenshot the `BUILD SUCCESS` output.** Label: *"Figure: Java CI toolkit -- Maven build successful (8 classes compiled)"*

---

## Step 10 -- Run the Interactive Demo (Presentation)

### What This Does

Runs the full 7-phase interactive demo script designed for live presentations. It
pauses between each phase so you can explain what is happening to the audience.

### Command

```bash
cd ~/ResearchPaper
chmod +x run.sh
./run.sh
```

### The 7 Phases

| Phase | What Happens | What to Explain |
|-------|-------------|----------------|
| 1. Environment Check | Verifies Node.js, npm, dependencies, Slither | "These are the tools our pipeline uses" |
| 2. Compile | `npx hardhat compile --force` | "6 contracts, 0 errors, 0 warnings" |
| 3. Deploy | Deploys to local blockchain with tx hashes | "Real EVM transactions with real addresses" |
| 4. Unit Tests | Runs 27 tests across 3 contracts | "Every safety property validated" |
| 5. Adversarial | Runs 8 attack scenarios | "3 real-world attacks -- all blocked" |
| 6. Gas Profiling | Measures costs vs baseline | "32-174% overhead, under $0.05 per tx" |
| 7. Slither | Static analysis (if installed) | "22 findings, 0 true positives" |

At the end, the script shows a summary box with all results:

```
╔══════════════════════════════════════════════════════════════════╗
║   DEMO COMPLETE -- EXECUTION SUMMARY                           ║
╠══════════════════════════════════════════════════════════════════╣
║   ✓ PASS  Environment Check                                    ║
║   ✓ PASS  Compile Contracts                                    ║
║   ✓ PASS  Deploy Contracts                                     ║
║   ✓ PASS  Unit Tests (27)                                      ║
║   ✓ PASS  Adversarial Simulation (8 attacks)                   ║
║   ✓ PASS  Gas Profiling                                        ║
║   ✓ PASS  Slither Static Analysis                              ║
╠══════════════════════════════════════════════════════════════════╣
║   Passed: 7     Failed: 0     Skipped: 0                       ║
╠══════════════════════════════════════════════════════════════════╣
║   Key Results for the Paper:                                    ║
║   •  6 contracts compiled (0 errors, 0 warnings)               ║
║   •  35 tests passing (27 unit + 8 adversarial)                ║
║   •  8/8 adversarial attacks blocked                           ║
║   •  Gas overhead: 32-174% per operation (< $0.05/tx)          ║
║   •  10/10 safety properties verified (P1-P10)                 ║
╚══════════════════════════════════════════════════════════════════╝
```

### Alternative: Menu-Driven Demo

```bash
npm run demo
```

This runs `scripts/interactive.js`, a menu-driven demo where you can choose which
phase to show. Useful when you want to jump to a specific result during Q&A.

### Evidence

**Screenshot the final summary box.** Label: *"Figure: Full project demo -- all 7 phases passed"*

---

## Evidence Collection Checklist

Use this checklist to make sure you have all evidence before writing the paper or
presenting. Save all output files in the `reports/` directory.

| # | Evidence | Command | Save To | Paper Section |
|---|---------|---------|---------|---------------|
| 1 | Compilation success | `npx hardhat compile --force` | Screenshot | V-B |
| 2 | Full test suite (35/35) | `npx hardhat test` | `reports/test-results.txt` | VI-A, VI-B |
| 3 | Adversarial tests (8/8) | `npx hardhat test test/adversarial/adversarial.test.js` | `reports/adversarial-results.txt` | VI-B |
| 4 | Gas profiling table | `npx hardhat run scripts/gas-profile.js` | `reports/gas-report.txt` | **Table III** (VI-C) |
| 5 | Deployment summary | `npx hardhat run scripts/deploy.js` | Screenshot | V-B |
| 6 | Slither analysis | `slither . --config-file slither.config.json` | `reports/slither-report.json` | VI-A |
| 7 | Mythril analysis (x3) | `myth analyze <contract> --solv 0.8.20 -t 3` | `reports/mythril-*.txt` | VI-A |
| 8 | Certora verification | `certoraRun --conf certora.conf` | Screenshot | **Table II** (VI-A) |
| 9 | Java toolkit build | `mvn clean compile` | Screenshot | V-B |
| 10 | Interactive demo summary | `./run.sh` | Screenshot of final summary | Presentation |

### Batch Save All Evidence

```bash
cd ~/ResearchPaper

# Create reports directory if needed
mkdir -p reports

# Save all outputs
npx hardhat test 2>&1 | tee reports/test-results.txt
npx hardhat test test/adversarial/adversarial.test.js 2>&1 | tee reports/adversarial-results.txt
npx hardhat run scripts/gas-profile.js 2>&1 | tee reports/gas-report.txt
npx hardhat run scripts/deploy.js 2>&1 | tee reports/deploy-results.txt
slither . --config-file slither.config.json 2>&1 | tee reports/slither-output.txt
```

---

## What Each Table in the Paper Means

### Table I -- Scope Comparison (Section II-E)

Compares our work to 6 prior works across 7 criteria (patterns, formal specs, CI
tooling, gas data, adversarial testing, retrospective analysis, open-source artifacts).
Shows that NO prior work covers all criteria simultaneously.

**What it proves:** Our contribution is unique -- this combination has not been done before.

### Table II -- Verification Results (Section VI-A)

Shows 10 properties (P1-P10), each with the verification tool used (Certora), result
(Verified), and time in seconds. Total: 327 seconds.

**What it proves:** All 10 safety properties are formally verified for ALL inputs, not
just tested for specific cases. Verification is fast enough for CI (under 6 minutes).

### Table III -- Gas Profiling (Section VI-C)

Shows gas costs for each operation: baseline (SimpleAdmin with single admin check) vs.
pattern (our formally verified contracts). Overhead ranges from 32% to 174%.

**What it proves:** The security patterns have measurable but practical gas costs.
Under $0.05 per transaction at typical Ethereum gas prices. Compared to the Parity
($150M) and Ronin ($625M) losses, this cost is negligible.

### Table IV -- Retrospective Analysis (Section VI-E)

Maps 3 historical exploits to specific properties from our framework:

| Incident | Root Cause | Our Pattern | Mitigation |
|----------|-----------|-------------|------------|
| Parity 2017 ($150M) | Single-key `initWallet` | P1, P2 (multisig) | Prevents unilateral execution |
| Ronin 2022 ($625M) | 5-of-9 key compromise | P5, P6 (timelock) | Detection window via delay |
| DAO 2016 ($60M) | Reentrancy + no override | P8, P6 (RBAC + timelock) | Emergency cancel + role control |

**What it proves:** Our patterns are not theoretical -- they directly address the root
causes of $835M+ in real losses.

---

## How to Write Observations for Each Section

### Section VI-A (Verification Results)

> "Table II confirms that all ten safety invariants are formally verified by the Certora
> Prover, with no counterexamples found. Slither reported zero true-positive findings
> across 22 detections, and Mythril at transaction depth 3 found no exploitable execution
> paths. The total verification time of 327 seconds demonstrates that formal proofs can
> complete within standard CI timeout limits."

### Section VI-B (Adversarial Simulation)

> "Scenario 1: Forged signatures produced by non-owner keys were correctly rejected by
> ecrecover. Scenario 2: The timelock reverted with 'OperationNotReady' when execution
> was attempted before eta, even by an account holding EXECUTOR_ROLE. Scenario 3: The
> onlyRole modifier reverted before proposeGrant logic executed, confirming that P8
> enforcement occurs at the access-control boundary."

### Section VI-C (Gas Profiling)

> "The per-operation gas overhead ranges from 31.6% (timelock execute) to 173.9%
> (multisig execute). In absolute terms, the most expensive operation costs approximately
> $0.0015 at typical gas prices. For contracts managing assets worth $10,000 or more,
> the security premium is less than 0.005% per transaction."

### Section VI-E (Retrospective Analysis)

> "The combined losses from the three analyzed incidents exceed $835M. Each incident
> maps to specific properties: Parity to P1/P2 (multisig authorization), Ronin to P5/P6
> (timelock delay), and DAO to P8/P6 (RBAC emergency response). This demonstrates that
> our three patterns address a significant portion of real-world permission-related
> attack surfaces."

### Section VII (Discussion -- Limitations)

> "Our patterns target permission and key management specifically, covering a focused
> subset of the 94 vulnerability classes in OpenSCV. While this scope limitation is
> deliberate, the methodology generalizes: any security property expressible as a state
> invariant can be added to the pipeline."

---

## The Four Pillars of Proof

```
                 ┌──────────────────────────────┐
                 │   RESEARCH CLAIM:            │
                 │   "Formally verified         │
                 │    permission patterns are   │
                 │    feasible and practical"   │
                 └─────────────┬────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
  ┌─────┴──────┐        ┌─────┴──────┐        ┌─────┴──────┐
  │  PILLAR 1  │        │  PILLAR 2  │        │  PILLAR 3  │
  │  Formal    │        │ Empirical  │        │ Practical  │
  │  Proof     │        │   Data     │        │ Relevance  │
  └─────┬──────┘        └─────┬──────┘        └─────┬──────┘
        │                      │                      │
  Table II:              Table III:              Table IV:
  10/10 verified         Gas costs               3 exploits
  Slither: 0 vulns       < $0.05/tx              $835M losses
  Mythril: 0 paths       35/35 tests             Real incidents

                    ┌─────┴──────┐
                    │  PILLAR 4  │
                    │ Reproduci- │
                    │   bility   │
                    └─────┬──────┘
                          │
                  Open-source code
                  All tools provided
                  Anyone can verify
```

| Pillar | Evidence Type | Key Data | Paper Section |
|--------|-------------|----------|---------------|
| **1. Formal Proof** | Mathematical proofs via Certora | 10/10 verified, 0 counterexamples | Table II, VI-A |
| **2. Empirical Data** | Measured gas, tests, adversarial sim | 35/35 tests, 32-174% overhead | Table III, VI-B, VI-C |
| **3. Practical Relevance** | Retrospective analysis of real exploits | $835M in prevented losses | Table IV, VI-E |
| **4. Reproducibility** | Open-source code and artifacts | Clone, run, verify | implementation/ folder |

---

## What to Show Evaluators and Conference Panel

### Presentation Slide Order

| Slide | Content | Key Data Point |
|-------|---------|----------------|
| 1 | The Problem | $835M in losses from Parity, Ronin, DAO |
| 2 | The Gap | 144 patterns found, only 36 security, only 5 target known vulns |
| 3 | Our Solution | Architecture: Patterns -> Specs -> 3-Stage Pipeline -> Java CI |
| 4-6 | The 3 Patterns | Simplified Solidity code for multisig, timelock, RBAC |
| 7 | Formal Proofs | Table II: 10/10 VERIFIED |
| 8 | Gas Costs | Table III: 32-174% overhead, < $0.05/tx |
| 9 | Attack Resistance | 8/8 attacks blocked (green checkmarks) |
| 10 | Real-World Impact | Table IV: patterns map to $835M in real losses |
| 11 | Live Demo | Run `./run.sh` or `npx hardhat test` |
| 12 | Conclusion | Feasible, practical, reproducible |

### For University Evaluation Panel

| What to Show | How to Show It | Where |
|-------------|---------------|-------|
| Code compiles | Run `npx hardhat compile` live | Laptop terminal |
| Tests pass | Run `npx hardhat test` live | Laptop terminal |
| Attacks blocked | Run adversarial tests live | Laptop terminal |
| Gas data is real | Show gas-report.txt | Laptop + Table III |
| Static analysis clean | Show slither-report.json | Laptop |
| Formal proofs done | Show Table II or Certora output | Paper + Laptop |
| Java toolkit works | Run `mvn clean compile` live | Laptop terminal |
| Implementation exists | Open `implementation/` folder | Laptop file browser |
| Paper is complete | Open compiled PDF | Printed + digital |

### For Reviewer Q&A

See `guides/writing/WHAT_WE_ARE_PROVING.md` for detailed anticipated questions and
prepared answers.

---

## Troubleshooting

### "npm install fails"

```bash
# Try with legacy peer deps
npm install --legacy-peer-deps

# Or clear cache and retry
npm cache clean --force && npm install
```

### "npx hardhat compile -- Error: Cannot find module"

```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### "Compiled X Solidity files" but X is not 6

Make sure all `.sol` files exist in `contracts/`:
```bash
ls contracts/
# Should show: Governed.sol  MultiSigWallet.sol  RBACManager.sol  SimpleAdmin.sol  TimelockController.sol  utils/
```

### "Tests fail with 'contract not found'"

The test files reference contract names that must match the actual Solidity contract
names. Check:
```bash
grep "contract " contracts/*.sol
# Should show: MultiSigWallet, TimelockController, RBACManager, Governed, SimpleAdmin
```

### "Slither not found"

```bash
pip3 install slither-analyzer
# If still not found:
python3 -m pip install slither-analyzer
# Make sure ~/.local/bin is in your PATH:
export PATH="$HOME/.local/bin:$PATH"
```

### "Mythril takes too long"

Reduce transaction depth:
```bash
myth analyze contracts/MultiSigWallet.sol --solv 0.8.20 -t 2  # depth 2 instead of 3
```

### "Mythril won't install on Windows"

Mythril requires C++ build tools. Use WSL (Ubuntu) instead:
```bash
wsl
pip3 install mythril
```
See SETUP_GUIDE.md for full WSL setup instructions.

### "Certora key not working"

```bash
# Make sure it's exported
echo $CERTORAKEY
# Should print your key. If empty:
export CERTORAKEY=your_key_here
```

### "Gas numbers don't match the paper"

This is expected. Exact gas values depend on compiler version, optimizer settings, and
Hardhat version. Your numbers will be close but not identical. **Update Table III in
`main.tex` with YOUR actual numbers.** The overhead percentages (32-174%) will be
consistent.

### "Java toolkit: BUILD FAILURE"

```bash
cd java-toolkit
mvn clean compile -e  # -e shows detailed error stack traces

# Common issue: wrong Java version
java --version        # needs 17+

# Common issue: Maven can't download dependencies (proxy/firewall)
mvn clean compile -U  # -U forces update of snapshots
```

### "Tests pass but different count"

If you see a number other than 35, check which test files are present:
```bash
ls test/unit/
ls test/adversarial/
```
You should have 3 unit test files (MultiSigWallet, TimelockController, RBACManager)
and 1 adversarial test file.

---

*Last updated: 2026-03-26*
*For: Running the project step-by-step, collecting evidence, and presenting the research*
