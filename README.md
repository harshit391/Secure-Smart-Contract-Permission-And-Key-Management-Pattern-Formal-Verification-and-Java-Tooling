<div align="center">

# Secure Smart-Contract Permission & Key Management
### Patterns, Formal Verification, and Java Tooling

[![Tests](https://img.shields.io/badge/tests-35%2F35%20passing-brightgreen)](#test-results)
[![Solidity](https://img.shields.io/badge/solidity-0.8.20-blue)](#design-patterns)

**Harshit Singla · Harshit Behal · Himanshu Shukla · Dr. Anshu Singla**  
Department of Computer Science, Chitkara University, Punjab, India

</div>

---

## Table of Contents

- [Abstract](#abstract)
- [Problem Statement](#problem-statement)
- [Research Gap](#research-gap)
- [Contributions](#contributions)
- [Repository Structure](#repository-structure)
- [Design Patterns](#design-patterns)
  - [Pattern 1 — Multisignature Wallet](#pattern-1--k-of-n-multisignature-wallet)
  - [Pattern 2 — Timelock Controller](#pattern-2--timelock-controller)
  - [Pattern 3 — RBAC Manager](#pattern-3--rbac-manager)
  - [Composition — Governed Contract](#composition--governed-contract)
- [Formal Safety Properties P1–P10](#formal-safety-properties-p1p10)
- [Verification Pipeline](#verification-pipeline)
- [Java Orchestration Toolkit](#java-orchestration-toolkit)
- [Getting Started](#getting-started)
- [Evaluation Results](#evaluation-results)
  - [Test Results](#test-results)
  - [Adversarial Scenarios](#adversarial-scenarios-blocked)
  - [Gas Overhead](#gas-overhead)
  - [Slither Static Analysis](#slither-static-analysis)
- [Retrospective Analysis](#retrospective-analysis)
- [Paper](#paper)
- [Authors](#authors)

---

## Abstract

Managing keys poorly and leaving permission controls weak is still the main reason behind some of the worst smart-contract disasters. The Parity wallet freeze and the Ronin bridge hack together cost hundreds of millions of dollars, and at their core, both came down to mishandled permissions. Surveys show there are plenty of smart-contract design patterns floating around, but hardly any tackle security head-on, and even fewer have been formally verified.

We address that gap with three formally verified design patterns built for permission and key management: a **k-of-n multisignature wallet**, a **timelock controller** for admin actions, and a **role-based access control (RBAC) module**. Each pattern ships as a reusable Solidity template, verified through a multi-stage pipeline — static analysis (Slither), symbolic execution (Mythril), and formal proofs (Certora/KEVM). An open-source Java toolkit built on web3j ties everything together so contracts can be compiled, deployed, and continuously verified inside a standard CI workflow.

**Key results:**
- 35/35 tests passing (27 unit + 8 adversarial), 0 warnings
- 10 core safety invariants machine-verified (P1–P10)
- Gas overhead: **32–174%** per operation (under $0.05/tx)
- All 8 adversarial attack scenarios blocked
- Slither: 22 findings, **0 true-positive vulnerabilities**

---

## Problem Statement

Smart contracts execute automatically on-chain without a middleman. Once deployed, the code is immutable — permission mistakes cannot be patched. Three well-known incidents illustrate the scale of the problem:

| Incident | Year | Loss | Root Cause |
|---|---|---|---|
| The DAO hack | 2016 | $60M | No admin override or emergency control |
| Parity wallet freeze | 2017 | $150M | Single unprotected `initWallet` — anyone could become owner |
| Ronin bridge hack | 2022 | $625M | 5-of-9 validator keys compromised; no delay or detection window |

**Total: $835M+ lost from three incidents, all traceable to inadequate permission and key management.**

Despite this, existing pattern catalogues remain largely unverified:

| Survey | Patterns | Security-relevant | Formally verified |
|---|---|---|---|
| Azimi et al. (2025) | 144 | 36 | None |
| Six et al. (2022) | 120 | 11 | None |
| Kannengiesser et al. (2022) | 20 | Partial | None |

The Azimi et al. finding is sharpest: just 5 patterns cover only 6 of 94 vulnerability classes in OpenSCV — barely 6%.

---

## Research Gap

### Pattern literature — security is severely underserved

| Survey | Patterns catalogued | Security-relevant | Formally verified |
|---|---|---|---|
| Azimi et al. (2025) | 144 | 36 | None |
| Six et al. (2022) | 120 | 11 | None |
| Lu et al. (2021) | 12 (payment only) | Partial | None |
| Kannengiesser et al. (2022) | 20 (multi-platform) | Partial | None |

The Azimi et al. finding is sharpest: 5 patterns cover only 6 of 94 vulnerability classes in OpenSCV — barely **6%**.

### Formal verification — exists but not applied to permission patterns

- **Park et al. (2024):** Formally verified the Aptos framework — but in Move, not Solidity
- **Antonino et al. (2022/2024):** "Specification is Law" for deployment safety — not permission management
- **Tolmach et al. (2022):** Comprehensive survey showing a disconnect between verification tools and developer practice

### Key management — reactive, not preventive

- **Blackshear et al. (2021):** KELP — key-loss *recovery after the fact* (reactive)
- **Wu et al. (2024):** Shamir's Secret Sharing for key custody (complementary, not permission management)
- **Takei & Shudo (2024):** Custodian key management analysis (evaluation, not pattern design)

### The gap this work fills

> Nobody has combined **reusable, formally verified Solidity permission patterns** + a **multi-stage verification pipeline** + a **developer-friendly CI toolkit** into one integrated framework targeting the permission/key management problem.

OpenZeppelin has patterns; Slither/Mythril/Certora exist as separate tools — but they have never been connected into a verified, composable, CI-integrated system.

---

## Contributions

1. **Three modular, formally specified Solidity design patterns** for permission and key management
2. **Ten core safety invariants (P1–P10)** with Certora CVL specifications
3. **Multi-stage verification pipeline** — Slither (static) + Mythril (symbolic) + Certora (formal)
4. **Open-source Java CI toolkit** (web3j + Maven) for automated deployment and verification
5. **Empirical evaluation** — formal proofs, gas profiling, adversarial simulation, retrospective analysis of 3 historical exploits

---

## Repository Structure

```
Research_Old/
├── paper/
│   ├── main.tex                  IEEE LaTeX paper draft (all sections)
│   └── references.bib            18 BibTeX entries (all 2021–2025)
├── implementation/
│   ├── contracts/                Solidity source (6 contracts)
│   ├── specs/                    Certora CVL specifications (P1–P10)
│   ├── test/
│   │   ├── unit/                 27 unit tests
│   │   └── adversarial/          8 adversarial attack scenarios
│   ├── scripts/                  Deploy, gas profiling, demo scripts
│   ├── java-toolkit/             Maven + web3j orchestration toolkit
│   └── reports/
│       └── slither-report.json   Real Slither output (22 findings)
├── guides/
│   ├── writing/                  Paper writing and submission guides
│   ├── execution/                Step-by-step run guides and WSL setup
│   └── learning/                 Blockchain and formal verification explainers
├── references/                   Reference PDFs
├── CLAUDE_CONTEXT.md             Session resume context
└── REPORT.md                     Full project report
```

---

## Design Patterns

### Pattern 1 — k-of-n Multisignature Wallet (`contracts/MultiSigWallet.sol`)

Prevents a single compromised key from executing any critical operation.

- Signatures collected **off-chain** (gas-optimized), verified **on-chain**
- EIP-712 typed data hashing for wallet-compatible signing
- Monotonically increasing nonce for replay protection
- `onlySelf` modifier — governance changes require multisig consensus
- **Formal properties:** P1 (k signatures required), P2 (no unilateral execution), P3 (replay protection), P4 (governance gated)

### Pattern 2 — Timelock Controller (`contracts/TimelockController.sol`)

Enforces a mandatory, publicly observable delay on admin actions — enabling community scrutiny and emergency cancellation.

- Separate PROPOSER / EXECUTOR / CANCELLER roles (least privilege)
- 14-day grace period — operations expire after `eta + GRACE_PERIOD`
- `address(this)` always holds ADMIN_ROLE — timelock can reconfigure itself
- **Formal properties:** P5 (no early execution), P6 (cancel restricted), P7 (expiry enforced)

### Pattern 3 — RBAC Manager (`contracts/RBACManager.sol`)

Maps addresses to fine-grained capabilities with explicit, auditable transitions that prevent privilege escalation.

- **Two-step grant flow:** admin proposes → nominee accepts (stronger than OpenZeppelin's single-step `grantRole`)
- `renounceRole` is self-only — admin cannot forcibly remove someone else's role
- Admin hierarchy via `bytes32 adminRole` per role
- **Formal properties:** P8 (admin-gated grants), P9 (explicit acceptance), P10 (no escalation path)

### Composition — Governed Contract (`contracts/Governed.sol`)

Wires all three patterns into a unified governance pipeline:

```
Off-chain signing  →  MultiSig k-of-n  →  Timelock schedule
                                        →  (delay elapses)
                                        →  Timelock execute
                                        →  RBAC mutation
```

After deployment, the deployer holds zero admin power — all governance flows through the full pipeline.

---

## Verification Pipeline

| Stage | Tool | Technique | Catches |
|---|---|---|---|
| 1 | Slither | Pattern-based static analysis (101 detectors) | Reentrancy, access-control anti-patterns, state shadowing |
| 2 | Mythril | Symbolic execution (depth 2–3) | Exploitable execution paths, integer overflows |
| 3 | Certora | Formal verification with CVL specs | All-input violations of P1–P10 |

Each stage is independent. A contract must pass all three to be considered verified.

---

## Java Orchestration Toolkit

**Location:** `implementation/java-toolkit/` | **Build:** Maven 3.8+ | **Runtime:** Java 17 | **Key dependency:** web3j

The toolkit automates the full pipeline — from compilation to deployment to verification — inside a standard Maven CI workflow.

### Java classes

| Class | Role |
|---|---|
| `VerificationPipeline.java` | Main entry point; orchestrates all stages |
| `SlitherRunner.java` | Invokes Slither as subprocess, parses JSON output |
| `MythrilRunner.java` | Invokes Mythril as subprocess, captures findings |
| `CertoraRunner.java` | Invokes `certoraRun` as subprocess, reads results |
| `DeploymentManager.java` | Uses web3j to deploy contracts to target network |
| `ReportGenerator.java` | Aggregates all results into HTML + JSON report |
| `Finding.java` | Data model for a single vulnerability finding |
| `VerificationResult.java` | Data model for per-property verification outcome |

### Pipeline stages (automated)

1. **Compile** — invoke `solc` to produce ABI and bytecode
2. **Generate** — web3j code generation for type-safe Java wrappers
3. **Deploy** — deploy to local Hardhat node, Sepolia, or configurable network
4. **Verify Stage 1** — run Slither, parse findings
5. **Verify Stage 2** — run Mythril at depth 2–3
6. **Verify Stage 3** — run Certora, check P1–P10
7. **Report** — structured HTML/JSON output with CI pass/fail gates

### Why Java over JavaScript/Hardhat?

Enterprise CI/CD systems (Jenkins, Maven) integrate Java natively. web3j provides type-safe contract interactions. Choosing Java over JavaScript/Hardhat is itself a tooling contribution — it bridges the gap between enterprise development practice and blockchain security tooling.

---

## Getting Started

### Prerequisites

```bash
# Node.js v18+ and npm
node --version

# Python 3.10+ (for Slither)
python3 --version

# Java 17+ and Maven (for Java toolkit)
java -version && mvn -version
```

> **Windows users:** Mythril and Certora require WSL (Ubuntu 24.04). See `guides/execution/SETUP_GUIDE.md` for the full setup guide including 12 documented errors and fixes.

### Install dependencies

```bash
cd implementation
npm install
```

### Compile contracts

```bash
npx hardhat compile
# Expected: 6 contracts compiled, 0 errors, 0 warnings
```

### Run tests

```bash
npx hardhat test
# Expected: 35 passing (27 unit + 8 adversarial)
```

### Gas profiling

```bash
npx hardhat run scripts/gas-profile.js
```

### Run Slither (static analysis)

```bash
slither . --config-file slither.config.json
```

### Run Certora (formal verification)

```bash
export CERTORAKEY=your_api_key_here
certoraRun --conf certora.conf
```

### Build Java toolkit

```bash
cd java-toolkit
mvn clean package
java -jar target/verification-pipeline-1.0.0.jar
```

### Interactive demo

```bash
bash run.sh          # 7-phase presentation demo
npm run demo         # Menu-driven real-world usage demo
```

---

## Evaluation Results

### Test Results

| Suite | Tests | Result |
|---|---|---|
| Unit tests | 27 | All passing |
| Adversarial simulation | 8 | All attacks blocked |
| **Total** | **35** | **35/35 passing** |

### Adversarial Scenarios Blocked

| Scenario | Target Property | Error Thrown |
|---|---|---|
| Single-key compromise (1 of 3 sigs) | P1, P2 | `InsufficientSignatures` |
| Forged signatures (2 forged + 1 valid) | P1 | `SignerNotOwner` |
| Replay attack (resubmit signed tx) | P3 | nonce mismatch in digest |
| External `addOwner` bypass | P4 | `NotSelf` |
| Timelock bypass (execute before eta) | P5 | `OperationNotReady` |
| Unauthorized cancel (non-canceller) | P6 | `AccessDenied` |
| Stale execution (after grace period) | P7 | `OperationExpired` |
| Unauthorized role escalation | P8 | `AccessDenied` |

### Gas Overhead

| Operation | Baseline | Pattern | Overhead |
|---|---|---|---|
| MultiSig execute (3/5) | 27,301 | 74,781 | **+173.9%** |
| Timelock execute | 27,301 | 35,926 | **+31.6%** |
| RBAC proposeGrant | 26,921 | 53,661 | **+99.3%** |
| RBAC revokeRole | 26,921 | 29,076 | **+8.0%** |

Per-operation overhead: **32–174%** — under **$0.05/tx** at 10 gwei, ETH=$2000.

### Slither Static Analysis

- 22 findings across 6 contracts (2 High / 2 Medium / 10 Low / 8 Informational)
- Both high findings (`arbitrary-send-eth`) are **by design** — wallets must send ETH, protected by P1/P2
- **0 true-positive vulnerabilities** after manual review

---

## Retrospective Analysis

| Incident | Loss | Our Pattern | How It Helps |
|---|---|---|---|
| The DAO (2016) | $60M | RBAC + Timelock | Emergency role (P8) + timelock cancel (P6) enables rapid freeze |
| Parity Wallet (2017) | $150M | MultiSig | P1+P2: ownership change requires k-of-n approval — no unilateral `initWallet` |
| Ronin Bridge (2022) | $625M | Timelock | P5 delay window enables community detection; P6 cancellation stops execution |

---

## Formal Safety Properties P1–P10

| ID | Pattern | Statement |
|---|---|---|
| P1 | MultiSig | `execute` requires ≥ `threshold` valid, distinct owner signatures |
| P2 | MultiSig | No single address can execute when threshold ≥ 2 |
| P3 | MultiSig | Nonce increments by 1 after each `execute`; prior signatures invalidated |
| P4 | MultiSig | `addOwner`/`removeOwner`/`changeThreshold` revert unless `msg.sender == address(this)` |
| P5 | Timelock | `execute` reverts when `block.timestamp < eta` |
| P6 | Timelock | `cancel` reverts unless caller holds `CANCELLER_ROLE` |
| P7 | Timelock | `execute` reverts when `block.timestamp > eta + GRACE_PERIOD` |
| P8 | RBAC | `proposeGrant` reverts unless caller holds the admin role for the target role |
| P9 | RBAC | `proposeGrant` sets a pending flag but does NOT grant the role; only `acceptRole` grants it |
| P10 | RBAC | A non-admin cannot propose a grant to themselves; granting a role does not change any other role's admin mapping |

---

## Paper

The full IEEE paper draft is located at `paper/main.tex` with bibliography at `paper/references.bib`.

To compile locally:

```bash
cd paper
pdflatex main.tex
bibtex main
pdflatex main.tex
pdflatex main.tex
```

Or upload `main.tex` and `references.bib` to [Overleaf](https://overleaf.com) for browser-based compilation.

---

## Authors

| Name | Student ID | Email |
|---|---|---|
| Harshit Singla | 2210990391 | harshit.singla@chitkara.edu.in |
| Harshit Behal | 2210990386 | harshit.behal@chitkara.edu.in |
| Himanshu Shukla | 2210990408 | himanshu.shukla@chitkara.edu.in |
| Dr. Anshu Singla (supervisor) | CET1001005 | anshu.singla@chitkara.edu.in |

**Department of Computer Science, Chitkara University, Punjab, India**


