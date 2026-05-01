# Architecture

## System Overview

The project consists of three layers:

```
+------------------------------------------------------------+
|                    Java CI Toolkit                          |
|   (VerificationPipeline.java -- orchestrates all stages)   |
+------------------------------------------------------------+
          |              |              |
          v              v              v
   +-----------+  +------------+  +-----------+
   |  Slither  |  |  Mythril   |  |  Certora  |
   |  (static) |  | (symbolic) |  |  (formal) |
   +-----------+  +------------+  +-----------+
          \              |              /
           \             |             /
            v            v            v
   +--------------------------------------------+
   |          Solidity Smart Contracts           |
   |  MultiSigWallet  TimelockController  RBAC  |
   +--------------------------------------------+
                       |
                       v
   +--------------------------------------------+
   |          Governed (Composition)             |
   |    MultiSig + Timelock + RBAC combined     |
   +--------------------------------------------+
```

## Verification Pipeline

The multi-stage verification pipeline provides defense in depth:

| Stage | Tool | Technique | What It Catches |
|-------|------|-----------|-----------------|
| 1 | Slither | Pattern-based static analysis | Common vulnerability patterns, code smells |
| 2 | Mythril | Symbolic execution (depth 3) | Exploitable execution paths, integer overflows |
| 3 | Certora | Formal verification (CVL specs) | Violations of safety properties P1-P10 |

Each stage is independent -- a contract must pass all three to be considered verified.

## Contract Composition

The `Governed` contract demonstrates how three patterns compose into a defense-in-depth permission system:

```
1. Multisig owners sign a proposal (off-chain)
          |
2. Proposal is submitted with k-of-n signatures
          |
3. Operation is queued in the Timelock (delay starts)
          |
4. After minDelay, operation executes via RBAC
          |
5. RBAC verifies the caller has the required role
```

Every permission change must pass: multisig threshold AND timelock delay AND RBAC authorization.

## Directory Map

```
contracts/          Solidity source (the patterns)
specs/              Certora CVL specifications (P1-P10)
test/unit/          Per-contract unit tests (Hardhat + Chai)
test/adversarial/   Attack simulation scenarios
scripts/            Deployment and gas profiling (Hardhat)
java-toolkit/       Java CI orchestration (Maven + web3j)
reports/            Generated output (gitignored)
```
