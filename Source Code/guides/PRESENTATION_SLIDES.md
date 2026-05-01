# Presentation Slide Content

> **How to use:** Copy-paste each slide's content into Canva.
> Suggested Canva template: search **"minimalist tech presentation"** or **"clean academic presentation"**, 16:9 ratio.
> Aim for **15-18 slides**, **15 minute talk**.

---

## Slide 1 -- Title

**Title:**
Secure Smart-Contract Permission & Key Management:
Patterns, Formal Verification, and Java Tooling

**Authors:**
Harshit Singla, Harshit Behal, Himanshu Shukla, Dr. Anshu Singla

**Affiliation:**
Department of Computer Science, Chitkara University, Punjab, India

> Design tip: Place university logo top-right. Keep the slide clean -- title + names + logo only.

---

## Slide 2 -- The Problem

**Heading:** Why This Matters

**Key points:**
- Parity Wallet (2017): One unprotected function call --> $150M in Ether frozen forever
- Ronin Bridge (2022): Validator keys compromised --> $625M stolen
- Root cause in both cases: poor key and permission management

**Bottom callout (bold/highlight):**
"These weren't obscure bugs. They were permission failures."

> Design tip: Use two large stat cards side by side -- "$150M Frozen" and "$625M Stolen" -- with incident names below each.

---

## Slide 3 -- The Gap

**Heading:** What's Missing Today

**Key points:**
- 144 smart-contract patterns catalogued (Azimi et al. 2025)
- Only 36 address security
- Only 5 target known vulnerabilities (6 out of 94 in OpenSCV)
- Almost none are formally verified
- No reusable templates + verification + CI tooling in one package

**Bottom callout:**
"Patterns exist. Verification tools exist. Key management research exists. Nobody has combined them."

> Design tip: A 3-circle Venn diagram with "Design Patterns", "Formal Verification", "Key Management" -- your work sits at the center intersection.

---

## Slide 4 -- Our Contribution

**Heading:** What We Built

1. **Three formally verified design patterns** for permission & key management (Multisig, Timelock, RBAC)
2. **Reusable Solidity templates** with annotations + Certora specs defining 10 safety invariants (P1-P10)
3. **Multi-stage verification pipeline** -- Slither + Mythril + Certora -- automated end-to-end
4. **Open-source Java CI toolkit** (web3j) for compile, deploy, verify, and report

> Design tip: Use 4 numbered cards or icons. Keep each to one line.

---

## Slide 5 -- Threat Model

**Heading:** What We Defend Against

**Adversary capabilities:**
- Single-key compromise (phishing, malware)
- Minority-key compromise (up to k-1 keys in a k-of-n scheme)
- Logic exploitation (reentrancy, access-control bypass)
- Governance attack (unauthorized role escalation)
- Replay attack (resubmitting valid transactions)

**Our response: 10 safety invariants (P1-P10)**
- P1-P4: Multisig (authorization, no unilateral action, replay protection, governance gating)
- P5-P7: Timelock (delay enforced, cancellation restricted, expiry enforced)
- P8-P10: RBAC (admin-gated grants, explicit acceptance, no escalation path)

> Design tip: Left column = adversary capabilities with a red/warning icon. Right column = properties with a green/shield icon.

---

## Slide 6 -- Pattern 1: Multisig Wallet

**Heading:** k-of-n Multisignature Wallet

**Intent:** No single compromised key can execute a critical operation

**How it works:**
1. n owners registered on-chain with threshold k
2. Transaction proposed off-chain, signed by k owners
3. Signatures submitted on-chain and verified via ecrecover
4. Nonce increments after execution (prevents replay)

**Properties enforced:** P1 (k signatures required), P2 (no unilateral execution), P3 (replay protection), P4 (governance changes gated)

> Design tip: Flow diagram: [Owners sign off-chain] --> [Submit k signatures] --> [Contract verifies] --> [Execute or Reject]. Use arrow boxes.

---

## Slide 7 -- Pattern 2: Timelock Controller

**Heading:** Timelock Controller

**Intent:** Mandatory public delay on admin actions -- allows community scrutiny

**How it works:**
1. Proposer calls schedule(operation, delay)
2. Operation waits in queue until delay elapses
3. Executor calls execute() only after delay passes
4. Grace period ensures stale operations expire
5. Authorized canceller can void queued operations

**Properties enforced:** P5 (delay respected), P6 (cancellation restricted), P7 (expiry enforced)

> Design tip: Timeline arrow: [Schedule] --delay period--> [Execute window] --grace period--> [Expired]. Show "Cancel" branching off from the delay period.

---

## Slide 8 -- Pattern 3: RBAC

**Heading:** Role-Based Access Control

**Intent:** Fine-grained permissions with auditable transitions -- no privilege escalation

**How it works:**
1. Roles are bytes32 identifiers, each with a designated admin role
2. Admin proposes a role grant to an address
3. Recipient must explicitly accept the role (two-step transfer)
4. Prevents accidental or malicious grants

**Properties enforced:** P8 (admin-gated grants), P9 (explicit acceptance), P10 (no escalation path)

**Why two-step?** Stronger than OpenZeppelin's single-step grantRole -- recipient must opt in

> Design tip: Two-step flow: [Admin: proposeGrant()] --> [Recipient: acceptRole()] --> [Role active]. Simple two-box arrow.

---

## Slide 9 -- Pattern Composition

**Heading:** How the Patterns Work Together

**Architecture:**
- Multisig Wallet acts as the sole proposer on the Timelock
- Timelock serves as the sole executor for RBAC admin actions
- Every permission change must pass through both multisig threshold AND timelock delay

**Flow:**
Multisig (k-of-n approval) --> Timelock (mandatory delay) --> RBAC (role change executed)

**Result:** Defense in depth -- compromising one layer is not enough

> Design tip: Three connected boxes in a horizontal chain with arrows. This is the most important diagram in the talk. Color-code each pattern (e.g., blue/orange/green).

---

## Slide 10 -- Verification Pipeline

**Heading:** Three-Stage Verification

**Stage 1: Slither (Static Analysis)**
- Data-flow analysis for common anti-patterns
- Catches: reentrancy, unprotected selfdestruct, variable shadowing
- Fast first pass (< 5 seconds total)

**Stage 2: Mythril (Symbolic Execution)**
- Explores execution paths up to configurable depth
- Searches for concrete inputs that violate safety rules
- Average: 83 seconds per contract

**Stage 3: Certora / KEVM (Formal Proofs)**
- Properties P1-P10 encoded as CVL rules
- Translates Solidity bytecode + rules into SMT constraints
- Proves property holds for ALL inputs, or returns counterexample

> Design tip: Three-column layout or three stacked cards. Each stage gets an icon: magnifying glass (Slither), branch tree (Mythril), checkmark/shield (Certora).

---

## Slide 11 -- Java CI Toolkit

**Heading:** Java Orchestration Toolkit

**Built on:** web3j + Maven

**Pipeline steps:**
1. Compile -- invoke solc, produce ABI + bytecode
2. Generate -- web3j code generation for type-safe Java wrappers
3. Deploy -- to local Hardhat node, Sepolia, or other testnet
4. Verify -- run Slither, Mythril, Certora as sub-processes
5. Report -- aggregate results with pass/fail CI gates

**Why Java?**
- Enterprise adoption, web3j maturity
- Integrates with GitHub Actions, Jenkins
- Lowers barrier for Java teams already using web3j

> Design tip: Horizontal pipeline with 5 steps as connected boxes. Add GitHub Actions / Jenkins logos if you want.

---

## Slide 12 -- Results: Verification

**Heading:** Verification Results

**Slither Static Analysis (REAL -- measured on our contracts):**

| Severity      | Count | Details |
|---------------|-------|---------|
| High          | 2     | arbitrary-send-eth (by design -- contracts send ETH) |
| Medium        | 2     | divide-before-multiply (false positive), strict equality (intentional) |
| Low           | 10    | missing-zero-check (4), reentrancy-events (2), timestamp (4) |
| Informational | 8     | assembly usage, costly loop, low-level calls, naming, solc version |
| **Total**     | **22**| **0 true positive high/medium -- all by-design or false positives** |

**Hardhat Tests (REAL):**
- 35/35 tests passing (27 unit + 8 adversarial)
- 0 failures across all contracts

**Certora Formal Proofs (from paper -- requires cloud API key):**
- P1-P10: all 10 properties verified
- CVL specifications written and ready in specs/ folder

**Bottom callout:**
"Slither ran all 101 detectors on 6 contracts. Every high/medium finding was reviewed and confirmed as by-design behavior -- not a vulnerability."

> Design tip: Show the Slither severity table with color coding: red row for High (with "by design" tag), orange for Medium (with "false positive" tag), yellow for Low, gray for Info. Add a big green banner at bottom: "0 true positive vulnerabilities".

---

## Slide 13 -- Results: Gas Costs

**Heading:** Gas Overhead: The Cost of Security

**All values measured on Hardhat local node (Solidity 0.8.20, optimizer 200 runs):**

| Operation              | Baseline  | Pattern     | Overhead |
|------------------------|-----------|-------------|----------|
| Deploy (multisig 3/5)  | 249,489   | 1,170,948   | 369.5%   |
| Execute tx (multisig)  | 27,301    | 74,781      | 173.9%   |
| Schedule (timelock)    | --        | 52,945      | --       |
| Execute (timelock)     | 27,301    | 35,926      | 31.6%    |
| Grant role (RBAC)      | 26,921    | 53,661      | 99.3%    |
| Accept role (RBAC)     | --        | 46,624      | --       |
| Revoke role (RBAC)     | --        | 29,076      | --       |
| Cancel (timelock)      | --        | 25,619      | --       |

**Additional deployments measured:**
- Deploy TimelockController: 1,036,711 gas
- Deploy RBACManager: 508,039 gas
- Deploy Governed (composition): 1,993,927 gas

**Key takeaway (bold/highlight):**
- Per-operation overhead: 32-174% (excluding one-time deployment)
- Cost at typical gas prices: under $0.05 per transaction
- Deployment is expensive (one-time), operations are cheap (repeated)

**Baseline:** SimpleAdmin contract -- single-admin with require(msg.sender == admin)

**Source:** gas-profile.js output (reproducible via `npx hardhat run scripts/gas-profile.js`)

> Design tip: Bar chart comparing baseline vs pattern for the 4 comparable operations. Highlight the "$0.05" number prominently. Mark deployment separately as "one-time cost".

---

## Slide 14 -- Results: Adversarial Simulation

**Heading:** 8 Attack Scenarios, All Blocked

**All results from Hardhat test suite (REAL -- 8 passing tests):**

**Attack Scenario 1: Single-Key Compromise on Multisig**
- Attacker has 1 real key, forges 2 signatures → **REJECTED** (SignerNotOwner)
- Attacker submits only their own signature → **REJECTED** (InsufficientSignatures)
- Properties enforced: P1, P2

**Attack Scenario 2: Timelock Bypass**
- Attacker with EXECUTOR_ROLE calls execute() before delay → **REJECTED** (too early)
- Attacker tries 1 second before ETA → **REJECTED** (too early)
- Property enforced: P5

**Attack Scenario 3: Unauthorized Role Escalation**
- Non-admin proposes DEFAULT_ADMIN_ROLE for self → **REJECTED**
- Non-admin proposes OPERATOR_ROLE for self → **REJECTED**
- Non-admin proposes role for an accomplice → **REJECTED**
- OPERATOR holder tries to escalate to ADMIN → **REJECTED**
- Properties enforced: P8, P10

**Bottom line:** 8 distinct attack vectors tested. 8 blocked.

**Source:** `npx hardhat test test/adversarial/adversarial.test.js` (reproducible)

> Design tip: Three attack columns. Each column: red attack icon at top, attack description in middle, green "BLOCKED" stamp at bottom with the property number. Show "8/8 blocked" prominently.

---

## Slide 15 -- Retrospective: Real-World Exploits

**Heading:** Would Our Patterns Have Helped?

| Incident            | Root Cause                    | Our Pattern | Mitigation                              |
|---------------------|-------------------------------|-------------|-----------------------------------------|
| Parity Wallet 2017  | Unprotected initWallet call   | P1, P2      | Multisig blocks single-key ownership change |
| Ronin Bridge 2022   | 5-of-9 validator keys stolen  | P5, P6      | Timelock delay allows detection & cancel    |
| The DAO 2016        | Reentrancy + no admin override| P8, P6      | RBAC emergency role + timelock cancel       |

**Key numbers:**
- Parity: $150M frozen -- one function call, no multi-party approval
- Ronin: $625M stolen -- no delay mechanism, hack undetected for 6 days
- DAO: $60M drained -- no emergency pause, no admin override

**Bottom line:** Three of the most expensive incidents in blockchain history -- all mitigable with our patterns

> Design tip: Three rows with incident logos/icons on the left, arrow pointing to the mitigation on the right. Show dollar amounts in large red text.

---

## Slide 16 -- Developer Usability

**Heading:** Developer Feedback (N = 8)

**Note:** This is preliminary survey data from the paper. A larger controlled study is planned as future work.

**Participants:** Graduate students and research assistants, 1-3 years Solidity experience

**Likert scale ratings (1-5):**
- Template clarity: 4.1 (sigma = 0.6)
- Integration effort: 3.8 (sigma = 0.8)
- Verification output readability: 3.9 (sigma = 0.7)
- Overall security confidence: 4.3 (sigma = 0.5)

**Developer quotes:**
- "The pattern annotations made it much clearer which invariants the contract enforces."
- "The three-stage verification output gives more confidence than any single tool's results."

**Limitation note:** Small sample (N=8). Larger experiment needed for statistical significance.

> Design tip: Horizontal bar chart for the 4 scores (max 5.0). Place quotes in a styled quote box below. Add a small asterisk noting the sample size limitation.

---

## Slide 17 -- Limitations & Future Work

**Heading:** Limitations

- Solidity/EVM-specific -- templates need rewriting for Move, Ink!, etc.
- SMT solver timeouts possible on highly complex contracts
- Small usability sample (N = 8)
- Covers key/permission management only -- not all 94 OpenSCV vulnerability classes

**Heading:** Future Work

1. Cross-chain key management and bridge governance patterns
2. Zero-knowledge proofs for privacy-preserving permission verification
3. Auto-generation tool: annotated Solidity --> CVL specifications automatically

> Design tip: Split slide -- limitations on the left (with caution icon), future work on the right (with rocket/arrow icon).

---

## Slide 18 -- Conclusion & Thank You

**Heading:** Summary

- 3 design patterns (Multisig, Timelock, RBAC) with formal specs
- 35/35 tests passing, 8/8 adversarial attacks blocked
- Slither: 22 findings, 0 true positive vulnerabilities
- 32-174% gas overhead -- under $0.05 per transaction
- 3 historical exploits mitigable with our patterns
- Open-source Java CI toolkit for continuous verification

**Heading:** Thank You

**Contact:**
- harshit.singla@chitkara.edu.in
- harshit.behal@chitkara.edu.in
- himanshu.shukla@chitkara.edu.in
- anshu.singla@chitkara.edu.in

**Questions?**

> Design tip: Five key numbers in large bold text as the summary. "Questions?" in large text at the bottom. University logo.

---

## Speaker Notes / Timing Guide

| Slides | Section | Approx. Time |
|--------|---------|-------------|
| 1      | Title | 30 sec |
| 2-3    | Problem & Gap | 2 min |
| 4      | Contribution | 1 min |
| 5      | Threat Model | 1.5 min |
| 6-9    | Design Patterns (core) | 4 min |
| 10-11  | Verification & Toolkit | 2 min |
| 12-14  | Results | 3 min |
| 15     | Retrospective | 1 min |
| 16     | Usability | 1 min |
| 17     | Limitations & Future | 1 min |
| 18     | Conclusion & Q&A | remaining |

---

## Canva Design Checklist

- [ ] 16:9 aspect ratio
- [ ] Consistent font: one sans-serif (e.g., Inter, Poppins, or Montserrat)
- [ ] Max 2-3 colors: dark navy for headings, white/light background, one accent (blue or teal)
- [ ] No more than 5-6 bullet points per slide
- [ ] All diagrams built with Canva's Elements > Lines & Shapes
- [ ] Charts built with Canva's Elements > Charts
- [ ] Code snippets in monospace font (Source Code Pro) on a light gray box
- [ ] University logo on title and final slide
- [ ] Export as PPTX (for PowerPoint) or PDF (for static sharing)
