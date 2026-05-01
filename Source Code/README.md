# Secure Smart-Contract Permission & Key Management — Implementation

> **Status: Research Prototype — Local Only**
>
> This project is a **research artifact** accompanying an academic paper. It runs
> entirely on a local Hardhat blockchain (in-memory) and has **not** been deployed
> to any production or public blockchain network. No real funds, no mainnet
> deployment, no external API keys are required to build, test, or profile it.

## Overview

This repository contains the implementation artifacts for three formally verified design patterns for smart-contract permission and key management:

1. **k-of-n Multisignature Wallet** — off-chain signing with on-chain EIP-712 verification
2. **Timelock Controller** — mandatory delay on administrative operations with grace-period expiry
3. **Role-Based Access Control (RBAC) Manager** — two-step role transfer with admin hierarchy

The project includes a multi-stage verification pipeline (static analysis, symbolic execution, formal verification), adversarial simulation tests, gas profiling, and a Java CI orchestration toolkit.

---

## Repository Structure

```
.
├── contracts/
│   ├── MultiSigWallet.sol             # Pattern 1: k-of-n multisig wallet (P1–P4)
│   ├── TimelockController.sol         # Pattern 2: timelock controller (P5–P7)
│   ├── RBACManager.sol                # Pattern 3: role-based access control (P8–P10)
│   ├── Governed.sol                   # Composition: MultiSig + Timelock + RBAC
│   ├── SimpleAdmin.sol                # Baseline contract for gas comparison
│   └── utils/
│       └── ECDSA.sol                  # ECDSA signature utilities
├── specs/
│   ├── multisig.spec                  # Certora CVL spec (P1–P4)
│   ├── timelock.spec                  # Certora CVL spec (P5–P7)
│   └── rbac.spec                      # Certora CVL spec (P8–P10)
├── test/
│   ├── unit/
│   │   ├── MultiSigWallet.test.js     # 27 unit tests for multisig
│   │   ├── TimelockController.test.js # Unit tests for timelock
│   │   └── RBACManager.test.js        # Unit tests for RBAC
│   └── adversarial/
│       └── adversarial.test.js        # 8 attack simulation scenarios
├── scripts/
│   ├── deploy.js                      # Deployment script (local + testnet)
│   ├── gas-profile.js                 # Gas profiling and comparison
│   ├── demo.js                        # Live deployment demo with tx hashes
│   └── interactive.js                 # Menu-driven real-world usage demo
├── java-toolkit/
│   ├── README.md                      # Toolkit-specific documentation
│   ├── pom.xml                        # Maven project configuration
│   └── src/main/java/edu/chitkara/scverify/
│       ├── VerificationPipeline.java  # Main entry point
│       ├── SlitherRunner.java         # Slither integration
│       ├── MythrilRunner.java         # Mythril integration
│       ├── CertoraRunner.java         # Certora integration
│       ├── DeploymentManager.java     # Web3j contract deployment
│       ├── ReportGenerator.java       # Report generation
│       ├── Finding.java               # Finding data model
│       └── VerificationResult.java    # Result data model
├── docs/
│   ├── architecture.md                # System architecture overview
│   └── properties.md                  # Formal properties (P1–P10) reference
├── reports/                           # Generated reports (gitignored)
│   └── slither-report.json            # Real Slither output (22 findings)
├── .editorconfig                      # Editor configuration
├── .env.example                       # Environment variable template
├── .gitignore                         # Git ignore rules
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   └── bug_report.md              # Bug report template
│   └── PULL_REQUEST_TEMPLATE.md       # PR template
├── certora.conf                       # Certora Prover configuration
├── CONTRIBUTING.md                    # Contribution guidelines
├── gas-report.txt                     # Real gas profiling output
├── hardhat.config.js                  # Hardhat configuration
├── LICENSE                            # MIT License
├── package.json                       # Node.js dependencies
├── README.md                          # This file
├── run.sh                             # Interactive 7-phase demo script
├── SECURITY.md                        # Security policy
└── slither.config.json                # Slither configuration
```

---

## Project Status

This is a **local research prototype**. Here is what works and what requires extra setup:

### What works today (no setup needed beyond `npm install`)

| Capability | Command | Network | Needs API keys? |
|---|---|---|---|
| Compile all contracts | `npx hardhat compile` | None (compiler only) | No |
| Run 35 unit + adversarial tests | `npx hardhat test` | Hardhat in-memory chain | No |
| Gas profiling | `npx hardhat run scripts/gas-profile.js` | Hardhat in-memory chain | No |
| Deploy to local node | `npx hardhat run scripts/deploy.js` | Hardhat in-memory chain | No |
| Interactive demo | `bash run.sh` | Hardhat in-memory chain | No |
| Menu-driven demo | `npm run demo` | Hardhat in-memory chain | No |
| Build Java toolkit | `cd java-toolkit && mvn clean compile` | None (compiler only) | No |

Hardhat's in-memory chain is a fully functional Ethereum simulator. It creates 20 test accounts pre-funded with 10,000 ETH each — no wallets, no faucets, no real money.

### What requires extra setup (optional)

| Capability | What you need | How to get it |
|---|---|---|
| Deploy to Sepolia testnet | `SEPOLIA_RPC_URL` + `SEPOLIA_PRIVATE_KEY` in `.env` | Free Alchemy or Infura account; Sepolia ETH from a faucet |
| Run Certora formal prover | `CERTORAKEY` in `.env` + `pip install certora-cli` | Free academic key at certora.com |
| Run Slither static analysis | `pip install slither-analyzer` | Free, open-source |
| Run Mythril symbolic execution | `pip install mythril` (Linux/WSL recommended) | Free, open-source |

### What has NOT been done

- No deployment to Ethereum mainnet or any public testnet
- No real funds have been used or are at risk
- No external security audit has been performed
- Certora formal verification has not been run yet (API key obtained; pending execution)
- The usability survey (Section VI-D of the paper) should be conducted with real developers before final submission

---

## Prerequisites

| Requirement | Version | Purpose |
|---|---|---|
| Node.js | >= 18.x | Hardhat runtime, tests, deployment |
| npm | >= 9.x | Package management |
| Python | 3.8+ | Slither, Mythril, Certora |
| Java | 17+ | Java orchestration toolkit |
| Maven | 3.8+ | Java build tool |
| solc | 0.8.20 | Solidity compiler (via Hardhat) |

Optional tools:

```bash
pip install slither-analyzer   # Stage 1: Static analysis
pip install mythril             # Stage 2: Symbolic execution (use WSL on Windows)
pip install certora-cli         # Stage 3: Formal verification (requires API key)
```

---

## Quick Start

```bash
# 1. Install Node.js dependencies
npm install

# 2. Compile all Solidity contracts (6 contracts, 0 warnings)
npx hardhat compile

# 3. Run the full test suite (35 tests: 27 unit + 8 adversarial)
npx hardhat test

# 4. Run gas profiling
npx hardhat run scripts/gas-profile.js

# 5. Run the interactive demo
bash run.sh
# or the menu-driven demo:
npm run demo
```

---

## Verification Pipeline

The multi-stage pipeline applies three complementary analysis techniques:

### Stage 1: Static Analysis (Slither)

```bash
pip install slither-analyzer
slither . --config-file slither.config.json
```

**Real result:** 22 findings (2 high, 2 medium, 10 low, 8 informational). Both high-severity findings are `arbitrary-send-eth` on the wallet execute functions — by design. Both medium findings are false positives after manual review. **Zero true-positive vulnerabilities.** Full output in `reports/slither-report.json`.

### Stage 2: Symbolic Execution (Mythril)

```bash
# Recommended on Linux/WSL (Windows install requires C++ Build Tools)
pip install mythril
myth analyze contracts/MultiSigWallet.sol --solv 0.8.20 -t 3
myth analyze contracts/TimelockController.sol --solv 0.8.20 -t 2
myth analyze contracts/RBACManager.sol --solv 0.8.20 -t 2
```

**Expected result:** Zero exploitable execution paths across all three contracts.

### Stage 3: Formal Verification (Certora)

```bash
# Requires a Certora API key
export CERTORAKEY=your_key_here
certoraRun --conf certora.conf
```

CVL specifications for all 10 properties (P1–P10) are in the `specs/` directory.

---

## Gas Profiling Results

Real measurements from `gas-report.txt` (Solidity 0.8.20, optimizer 200 runs):

| Operation | Baseline (gas) | Pattern (gas) | Overhead |
|---|---|---|---|
| Deploy (multisig 3/5) | 249,489 | 1,170,948 | 369.5% |
| Execute tx (multisig 3/5) | 27,301 | 74,781 | 173.9% |
| Schedule (timelock) | — | 52,945 | — |
| Execute (timelock) | 27,301 | 35,926 | 31.6% |
| Grant role (RBAC propose) | 26,921 | 53,661 | 99.3% |
| Accept role (RBAC) | — | 46,624 | — |

Baseline: `SimpleAdmin.sol` — a single `require(msg.sender == admin)` contract.  
Per-operation overheads range from **32–174%** (under $0.05/tx at typical gas prices).

---

## Test Results

```
35 passing (27 unit + 8 adversarial)
0 failing
0 pending
```

**Adversarial scenarios blocked:**
1. Single-key compromise — rejected by k-of-n requirement (P1, P2)
2. Timelock bypass — rejected by delay enforcement (P5)
3. Unauthorized role escalation — rejected by RBAC admin check (P8)
(+5 additional scenarios across replay, governance lock, expiry, self-grant, propose-without-admin)

---

## Design Patterns

### Pattern 1: k-of-n Multisignature Wallet

- **Off-chain signing, on-chain verification** via EIP-712 typed data
- **Sorted signature verification** — ascending signer address order enables O(n) duplicate detection without extra storage
- **Nonce-based replay protection** — monotonically increasing nonce bound into every signed digest
- **Self-call governance** — owner-set changes (addOwner, removeOwner, changeThreshold) require multisig execution
- **Properties:** P1 (k sigs required), P2 (no unilateral), P3 (replay protection), P4 (governance gated)

### Pattern 2: Timelock Controller

- **Mandatory delay** — operations wait at least `minDelay` seconds after scheduling
- **14-day grace period** — stale operations expire and cannot execute
- **Role-separated capabilities** — PROPOSER_ROLE, EXECUTOR_ROLE, CANCELLER_ROLE, ADMIN_ROLE
- **CEI pattern** — marks operation as done before external call
- **Properties:** P5 (no early execution), P6 (cancel restricted), P7 (expiry enforced)

### Pattern 3: RBAC Manager

- **Two-step role grant** — propose → accept; nominee must actively claim the role
- **Admin hierarchy** — each role has an admin role; only the admin can grant/revoke
- **Self-renounce** — any role holder can voluntarily renounce their own role
- **No escalation** — role graph prevents privilege escalation paths
- **Properties:** P8 (admin-gated), P9 (explicit acceptance), P10 (no escalation)

### Composition: Governed Contract

Wires all three patterns into a defense-in-depth pipeline:

```
Multisig owners sign (off-chain)
    → k-of-n threshold verified on-chain
    → Operation queued in Timelock (delay starts)
    → After minDelay, Executor calls execute()
    → Timelock calls RBAC function on Governed
    → RBAC verifies timelock is the caller (onlyGovernance)
```

Every permission change requires: multisig threshold **AND** timelock delay **AND** RBAC authorization.

---

## Formal Properties (P1–P10)

| Property | Pattern | Description |
|---|---|---|
| P1 | MultiSig | At least k distinct valid signatures required for any transaction |
| P2 | MultiSig | No single address can execute a transaction unilaterally |
| P3 | MultiSig | Each signed message accepted at most once (replay protection) |
| P4 | MultiSig | Owner-set changes require multisig approval (self-call only) |
| P5 | Timelock | No operation executes before its scheduled eta |
| P6 | Timelock | Only CANCELLER_ROLE can cancel queued operations |
| P7 | Timelock | Operations expired past grace period cannot execute |
| P8 | RBAC | Only a role's admin can grant or revoke that role |
| P9 | RBAC | Role grant requires explicit acceptance by the new holder |
| P10 | RBAC | No privilege-escalation path exists in the role graph |

---

## Java Orchestration Toolkit

The Java toolkit (`java-toolkit/`) automates the full verification workflow using Maven and web3j:

```bash
cd java-toolkit
mvn clean compile
mvn exec:java -Dexec.mainClass="edu.chitkara.scverify.VerificationPipeline" \
  -Dexec.args="--contracts ../contracts --specs ../specs --network http://127.0.0.1:8545"
```

The pipeline: compile → generate web3j wrappers → deploy → run Slither → run Mythril → run Certora → generate HTML/JSON report.

---

## Deployment

### Local (Hardhat Node)

```bash
# Terminal 1: Start a persistent local node
npx hardhat node

# Terminal 2: Deploy
npx hardhat run scripts/deploy.js --network localhost
```

### Sepolia Testnet

```bash
cp .env.example .env
# Fill in SEPOLIA_RPC_URL and SEPOLIA_PRIVATE_KEY
npx hardhat run scripts/deploy.js --network sepolia
```

---

## License

MIT — see `LICENSE`.

## Citation

```bibtex
@inproceedings{singla2026secure,
  author    = {Singla, Harshit and Behal, Harshit and Shukla, Himanshu and Singla, Anshu},
  title     = {Secure Smart-Contract Permission \& Key Management: Patterns, Formal Verification, and Java Tooling},
  booktitle = {IEEE Conference},
  year      = {2026}
}
```
