# Research Paper Runbook — Every Concept Explained from Scratch

> **What this is:** A complete reference that explains every technology, term, tool,
> and concept used in our research paper. Starts from "What is a blockchain?" and
> builds up to formal verification of smart-contract permission patterns.
>
> **Who this is for:** Anyone reading our paper, presenting at a conference, or
> answering reviewer/evaluator questions.

---

## Table of Contents

1. [Blockchain — The Foundation](#1-blockchain--the-foundation)
2. [Ethereum — The Programmable Blockchain](#2-ethereum--the-programmable-blockchain)
3. [Smart Contracts — Self-Executing Code](#3-smart-contracts--self-executing-code)
4. [Solidity — The Programming Language](#4-solidity--the-programming-language)
5. [Gas — The Cost of Computation](#5-gas--the-cost-of-computation)
6. [Cryptography Used in Our Paper](#6-cryptography-used-in-our-paper)
7. [Smart Contract Security — What Goes Wrong](#7-smart-contract-security--what-goes-wrong)
8. [Design Patterns — Reusable Solutions](#8-design-patterns--reusable-solutions)
9. [Our Three Patterns — The Core Contribution](#9-our-three-patterns--the-core-contribution)
10. [Formal Verification — Mathematical Proof](#10-formal-verification--mathematical-proof)
11. [Our Verification Tools — The Three-Stage Pipeline](#11-our-verification-tools--the-three-stage-pipeline)
12. [Testing and Development Tools](#12-testing-and-development-tools)
13. [Java Toolkit and CI/CD](#13-java-toolkit-and-cicd)
14. [Ethereum Standards — EIPs and ERCs](#14-ethereum-standards--eips-and-ercs)
15. [Real-World Incidents Referenced](#15-real-world-incidents-referenced)
16. [Research Methodology Terms](#16-research-methodology-terms)
17. [Alternative Tools We Did NOT Use](#17-alternative-tools-we-did-not-use)
18. [Quick-Reference Glossary (A–Z)](#18-quick-reference-glossary-az)

---

## 1. Blockchain — The Foundation

### What is a blockchain?

A blockchain is a **distributed, append-only ledger** shared across many computers (nodes). Once data is written, it cannot be altered without consensus from the majority of the network.

Think of it as a notebook that:
- Everyone has a copy of
- New pages can only be added, never torn out
- Everyone agrees on what each page says

```
Block 1           Block 2           Block 3
┌──────────┐    ┌──────────┐    ┌──────────┐
│ Tx: A→B  │───▶│ Tx: B→C  │───▶│ Tx: C→D  │
│ Hash: 0a3│    │ Hash: 7f2│    │ Hash: b91│
│ Prev: 000│    │ Prev: 0a3│    │ Prev: 7f2│
└──────────┘    └──────────┘    └──────────┘
```

Each block contains:
- **Transactions** — who sent what to whom
- **Hash** — a unique fingerprint of this block's contents
- **Previous hash** — links to the block before it (the "chain")

### Key properties

| Property | Meaning | Why it matters for our paper |
|----------|---------|------------------------------|
| **Immutability** | Once written, data can't be changed | A buggy smart contract can't be "patched" — that's why we need verified patterns |
| **Decentralization** | No single authority controls it | Permission decisions must be on-chain, not in a central server |
| **Transparency** | Anyone can read the chain | Timelock delays are publicly observable (P5) |
| **Consensus** | Nodes agree on the state | Ensures all nodes see the same permission state |

### Alternatives to blockchain (that we're NOT using)

| Technology | What it is | Why we don't use it |
|-----------|-----------|---------------------|
| **Traditional database** | Centralized storage (MySQL, Postgres) | Single point of control — the admin can change anything |
| **Distributed database** | Multiple copies but with a trusted coordinator (Cassandra, CockroachDB) | Still relies on trusting the operator |
| **DAG-based ledgers** | IOTA, Nano — no blocks, transactions link to each other | Different architecture, less mature smart contract support |

---

## 2. Ethereum — The Programmable Blockchain

### What is Ethereum?

Ethereum is a blockchain that doesn't just store transactions — it executes **programs** (smart contracts). Bitcoin can say "send 5 BTC from A to B." Ethereum can say "send 5 ETH from A to B, but only if 3 out of 5 people agree, and only after waiting 24 hours."

### Key Ethereum concepts

**Ether (ETH):** The native currency. Used to pay for computation (gas).

**Accounts:** Two types:
- **Externally Owned Accounts (EOAs):** Controlled by a private key (a human). Like a bank account.
- **Contract Accounts:** Controlled by code. The smart contract lives here.

**Transactions:** Messages sent from one account to another. Can include:
- ETH value to transfer
- Data (function call to a contract)
- Gas limit and gas price

**EVM (Ethereum Virtual Machine):** The runtime that executes smart contract code. Every node runs the same code and must arrive at the same result.

```
User signs tx with private key
         │
         ▼
Transaction broadcast to network
         │
         ▼
Miners/Validators execute tx in EVM
         │
         ▼
New state recorded on blockchain
```

### Alternative blockchains (that we mention but don't target)

| Blockchain | Language | Why mentioned in paper |
|-----------|---------|----------------------|
| **Aptos** | Move | Park et al. verified the Aptos framework with Move Prover. Different chain, different language. |
| **EOSIO** | C++ (WebAssembly) | Kannengiesser et al. studied patterns across EOSIO and Ethereum |
| **Hyperledger Fabric** | Go/Java (chaincode) | Kannengiesser et al. included it. It's permissioned, not public. |
| **Solana** | Rust | Not mentioned in paper. Different architecture (proof-of-history). |
| **Polkadot** | Ink! (Rust-based) | Mentioned as a potential target for porting our patterns. |

---

## 3. Smart Contracts — Self-Executing Code

### What is a smart contract?

A smart contract is a **program stored on the blockchain** that executes automatically when conditions are met. Once deployed, the code is immutable — you can't change it.

**Real-world analogy:** A vending machine. You insert money, press a button, and get a drink. No human decides whether to give you the drink — the machine's rules do. A smart contract is a digital vending machine for financial rules.

### Example: Simple token transfer

```solidity
contract SimpleWallet {
    address public owner;

    constructor() {
        owner = msg.sender;  // whoever deploys the contract becomes owner
    }

    function withdraw(uint256 amount) external {
        require(msg.sender == owner, "not owner");  // only owner can withdraw
        payable(msg.sender).transfer(amount);
    }
}
```

### Why immutability is both a strength and a problem

**Strength:** Nobody can change the rules after deployment. Users trust the code, not a company.

**Problem:** If the code has a bug, you can't fix it. The Parity wallet bug froze $150M forever because the code was immutable and broken. This is exactly why our paper exists — to provide **verified patterns** so bugs don't make it to deployment.

### Contract deployment

```
Solidity source code (.sol)
         │
    Compiler (solc)
         │
         ▼
Bytecode (machine code for EVM) + ABI (interface description)
         │
    Deploy transaction
         │
         ▼
Contract lives at an address on the blockchain forever
```

**ABI (Application Binary Interface):** A JSON description of a contract's functions and their parameters. Like an API specification — tells external code how to call the contract.

**Bytecode:** The compiled machine code that the EVM actually runs. Humans read Solidity; the EVM reads bytecode.

---

## 4. Solidity — The Programming Language

### What is Solidity?

Solidity is the primary programming language for writing Ethereum smart contracts. It looks like JavaScript/C++ but has blockchain-specific features.

### Key Solidity concepts used in our paper

#### Data types

| Type | Example | Meaning |
|------|---------|---------|
| `address` | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | A 20-byte Ethereum address |
| `uint256` | `1000000000000000000` | Unsigned 256-bit integer (can hold up to 2^256 - 1) |
| `bytes32` | `0x0000...0000` | Fixed 32-byte value. Used for role identifiers. |
| `bool` | `true` / `false` | Boolean |
| `bytes` | `0x1234abcd` | Dynamic-length byte array |
| `mapping` | `mapping(address => bool)` | Hash table (key → value). Like a dictionary. |

#### Visibility modifiers

| Modifier | Who can call it |
|----------|----------------|
| `public` | Anyone (external + internal) |
| `external` | Only from outside the contract |
| `internal` | Only from this contract and children |
| `private` | Only from this contract |

#### State mutability

| Keyword | Meaning |
|---------|---------|
| `view` | Reads blockchain state but doesn't change it (free to call) |
| `pure` | Neither reads nor writes state (free to call) |
| `payable` | Function can receive ETH |
| (none) | Function can modify state (costs gas) |

#### Memory locations

| Location | Meaning | Cost |
|----------|---------|------|
| `storage` | Permanent on-chain storage. Persists between function calls. | Expensive (writes cost ~20,000 gas) |
| `memory` | Temporary. Exists only during function execution. | Cheap |
| `calldata` | Read-only. The raw data sent with the transaction. | Cheapest |

#### The `require` statement

```solidity
require(msg.sender == owner, "not owner");
```
If the condition is false, the transaction **reverts** — all changes are undone, and the remaining gas is refunded. This is how we enforce access control.

#### Custom errors (Solidity 0.8.4+)

```solidity
error AccessDenied(bytes32 role, address account);

// Usage:
if (!hasRole(role, msg.sender)) {
    revert AccessDenied(role, msg.sender);
}
```

More gas-efficient than `require` with string messages. Our contracts use custom errors throughout.

#### Modifiers

A modifier wraps a function with pre/post checks:

```solidity
modifier onlyRole(bytes32 role) {
    if (!hasRole(role, msg.sender)) revert AccessDenied(role, msg.sender);
    _;  // ← this is where the actual function body runs
}

function schedule(...) external onlyRole(PROPOSER_ROLE) {
    // Only reaches here if the caller has PROPOSER_ROLE
}
```

#### Events

Events are logs emitted by the contract that external applications can listen to:

```solidity
event RoleGranted(bytes32 indexed role, address indexed account);

// Usage:
emit RoleGranted(OPERATOR_ROLE, userAddress);
```

They don't change contract state — they're just notifications. `indexed` parameters can be filtered.

### Alternative smart contract languages

| Language | Blockchain | Key difference from Solidity |
|----------|-----------|------------------------------|
| **Vyper** | Ethereum | Python-like syntax. No inheritance, no modifiers. Simpler by design. |
| **Move** | Aptos, Sui | Resource-oriented. Values can't be copied or dropped accidentally. Built-in formal verification. |
| **Ink!** | Polkadot/Substrate | Rust-based. Compiles to WebAssembly. |
| **Cadence** | Flow | Resource-oriented like Move. Used by NBA Top Shot. |
| **Michelson** | Tezos | Stack-based. Very low-level. |
| **Rust** | Solana, NEAR | General-purpose language with blockchain frameworks. |

**Why we use Solidity:** It's the most widely adopted smart contract language. Ethereum has the largest ecosystem, most tools, and most security research.

---

## 5. Gas — The Cost of Computation

### What is gas?

Gas is the **unit of computational effort** on Ethereum. Every operation (addition, storage write, function call) costs a specific amount of gas. You pay gas in ETH.

**Why it exists:** Without gas, someone could write an infinite loop and clog the entire network. Gas ensures every computation has a cost, preventing abuse.

### How gas works

```
Total cost = Gas used × Gas price

Example:
  Gas used: 74,781 (our multisig execute)
  Gas price: 10 gwei (0.00000001 ETH)
  ETH price: $2,000

  Cost = 74,781 × 0.00000001 ETH × $2,000
       = $0.0015
```

### Gas costs of common operations

| Operation | Approximate gas | Cost at 10 gwei/$2k ETH |
|-----------|---------------|--------------------------|
| Simple ETH transfer | 21,000 | $0.0004 |
| Storage write (new) | ~20,000 | $0.0004 |
| Storage write (update) | ~5,000 | $0.0001 |
| keccak256 hash | ~30 | negligible |
| ecrecover (signature verify) | ~3,000 | $0.00006 |
| Contract deployment (small) | ~250,000 | $0.005 |
| Contract deployment (large) | ~1,000,000+ | $0.02+ |

### Why gas matters for our paper

Our patterns add security but cost more gas. Table III in the paper measures this tradeoff:
- **Baseline** (no security): 27,301 gas per execute
- **MultiSig** (our pattern): 74,781 gas per execute
- **Overhead**: 174% more expensive — but $0.0015 per transaction to prevent $150M+ exploits

### Gas optimization techniques we use

| Technique | Where we use it | How it saves gas |
|-----------|----------------|------------------|
| **Packed signatures** | MultiSigWallet | Single `bytes` blob instead of `bytes[]` array. Less calldata overhead. |
| **Sorted signer order** | MultiSigWallet | Detect duplicates in O(n) without extra storage. No mapping needed. |
| **Off-chain signing** | MultiSigWallet | Signatures collected off-chain (free). Only verification is on-chain. |
| **Calldata for signatures** | MultiSigWallet | `calldata` is cheaper than `memory` for read-only data. |
| **Unchecked increment** | All contracts | `unchecked { ++i; }` in loops saves ~60 gas per iteration. |
| **Optimizer (200 runs)** | All contracts | Solidity compiler optimizer reduces bytecode size and gas costs. |

---

## 6. Cryptography Used in Our Paper

### Private Keys and Public Keys

Every Ethereum account is based on **asymmetric cryptography**:
- **Private key:** A secret 256-bit number. Only you know it. Like a password.
- **Public key:** Derived from the private key using elliptic curve math. Anyone can see it.
- **Address:** The last 20 bytes of the keccak256 hash of the public key. Like a bank account number.

```
Private Key (secret)
    │
    ▼  (elliptic curve multiplication — one-way function)
Public Key (public)
    │
    ▼  (keccak256 hash, take last 20 bytes)
Address (public, e.g., 0xf39Fd6...)
```

**Critical fact:** Whoever has the private key controls the account. Lose the key → lose the funds forever. Stolen key → attacker controls the account. This is why key management matters.

### Digital Signatures (ECDSA)

**ECDSA** stands for **Elliptic Curve Digital Signature Algorithm**. It proves that a message was signed by a specific private key without revealing the key.

```
Message + Private Key → Signature (r, s, v)
Message + Signature → Recovered Public Key/Address
```

**How our multisig uses ECDSA:**

1. Each owner signs the transaction hash with their private key → produces (r, s, v)
2. Contract receives the packed signatures
3. Contract calls `ecrecover(hash, v, r, s)` for each signature
4. `ecrecover` returns the signer's address
5. Contract checks: "Is this address in the owner set?"

### ecrecover

A built-in Ethereum function (EVM precompile) that recovers the signer's address from a signature:

```solidity
address signer = ecrecover(digest, v, r, s);
// digest: the 32-byte message hash that was signed
// v: recovery identifier (27 or 28)
// r: first 32 bytes of the signature
// s: second 32 bytes of the signature
// Returns: the Ethereum address that produced this signature
```

**Cost:** ~3,000 gas. This is why multisig verification is more expensive — we call ecrecover once per signature.

### EIP-712 — Structured Data Signing

**Problem:** If you just sign a raw hash, users don't know what they're signing. A malicious dapp could trick you into signing a transaction that drains your funds.

**Solution:** EIP-712 defines a standard format for structured data signing. The user's wallet shows them exactly what they're signing:

```
┌─────────────────────────────┐
│ Sign this transaction?      │
│                             │
│ Contract: MultiSigWallet    │
│ To: 0x1234...               │
│ Value: 1.0 ETH              │
│ Nonce: 7                    │
│                             │
│ [Sign] [Cancel]             │
└─────────────────────────────┘
```

Our contract computes the EIP-712 digest:
```solidity
bytes32 digest = keccak256(
    abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash)
);
```

- `\x19\x01` — EIP-712 prefix (prevents collision with other signing schemes)
- `DOMAIN_SEPARATOR` — identifies the specific contract (name, version, chainId, address)
- `structHash` — the hash of the structured data (to, value, data, nonce)

### Keccak-256

The hash function used throughout Ethereum. Takes any input and produces a fixed 32-byte output. It's:
- **Deterministic:** Same input always gives same output
- **One-way:** Can't reverse the hash to get the input
- **Collision-resistant:** Practically impossible to find two inputs with the same hash

```solidity
bytes32 hash = keccak256(abi.encode(to, value, data, nonce));
// No matter how large the input, output is always 32 bytes
```

### Signature malleability

A subtle vulnerability where (r, s) and (r, n-s) are BOTH valid signatures for the same message. An attacker could modify a signature without the private key.

Our ECDSA library prevents this:
```solidity
if (uint256(s) > _HALF_CURVE_ORDER) {
    revert ECDSAInvalidSignatureS(uint256(s));
}
```
This rejects any `s` in the upper half of the curve order, ensuring each message has exactly one valid signature.

### Shamir's Secret Sharing

Mentioned in the paper (Wu et al.). A way to split a secret into N shares such that any K shares can reconstruct it, but fewer than K shares reveal nothing.

**Example:** Split a private key into 5 shares. Any 3 can reconstruct the key. If you lose 2 shares, you can still recover. If an attacker steals 2 shares, they learn nothing.

**Relationship to our work:** Shamir's deals with key *custody* (how to store keys safely). Our patterns deal with key *usage* (how to enforce permissions when keys are used). They're complementary.

### Alternatives we DON'T use

| Technique | What it is | Why we don't use it |
|-----------|-----------|---------------------|
| **Multi-Party Computation (MPC)** | Multiple parties jointly compute a function without revealing their inputs | More complex; our patterns work at the smart contract level |
| **Threshold signatures** | Like multisig but produces a single signature from k-of-n parties | Requires off-chain coordination protocol; we keep verification on-chain |
| **Zero-knowledge proofs (ZKPs)** | Prove you know something without revealing it | Mentioned as future work; not needed for our current permission patterns |
| **Homomorphic encryption** | Compute on encrypted data | Overkill for permission management; mainly for privacy |

---

## 7. Smart Contract Security — What Goes Wrong

### The OpenSCV Taxonomy

The paper references **OpenSCV** — a taxonomy of **94 known smart contract vulnerability classes**. Our patterns address a focused subset (key/permission management). Here are the most relevant vulnerability types:

### Vulnerability types relevant to our paper

#### Reentrancy

The attacker calls back into the contract before the first call finishes, exploiting inconsistent state.

```
Contract has 10 ETH. Attacker has 1 ETH deposited.

Attacker calls withdraw(1 ETH)
  → Contract sends 1 ETH to attacker
    → Attacker's fallback function calls withdraw(1 ETH) again
      → Contract hasn't updated balance yet, still shows 1 ETH
        → Contract sends another 1 ETH
          → ... repeats until contract is drained
```

**The DAO hack (2016)** used exactly this. Our patterns don't directly prevent reentrancy — we focus on permission management. But the **Checks-Effects-Interactions (CEI) pattern** we follow in our code does:

```solidity
// CEI pattern: update state BEFORE external call
nonce = currentNonce + 1;          // Effect (state change)
(bool success, ) = to.call{value: value}(data);  // Interaction (external call)
```

#### Access control bypass

When a function that should be restricted can be called by anyone.

```solidity
// VULNERABLE: no access control
function withdraw(uint256 amount) external {
    payable(msg.sender).transfer(amount);
}

// SAFE: our pattern
function withdraw(uint256 amount) external onlyRole(ADMIN_ROLE) {
    payable(msg.sender).transfer(amount);
}
```

**The Parity hack** exploited this — `initWallet()` had no access control.

#### Privilege escalation

When a user can obtain permissions they shouldn't have.

```
Attacker has OPERATOR_ROLE
OPERATOR_ROLE should NOT be able to grant ADMIN_ROLE
But a bug allows it → attacker becomes admin → drains funds
```

Our P10 property specifically prevents this.

#### Replay attacks

Reusing a previously valid signed transaction.

```
1. Alice signs "send 1 ETH to Bob" with nonce=0
2. Transaction executes successfully
3. Attacker replays the same signed message
4. Without nonce protection, Alice sends ANOTHER 1 ETH to Bob
```

Our P3 property prevents this with a monotonically increasing nonce.

---

## 8. Design Patterns — Reusable Solutions

### What is a design pattern?

A design pattern is a **reusable solution to a commonly occurring problem**. The term comes from software engineering (Gang of Four, 1994) and has been adapted for smart contracts.

**Analogy:** A recipe. You don't reinvent "how to make bread" every time — you follow a proven recipe. Design patterns are proven recipes for common programming problems.

### Pattern landscape (from our Related Work section)

| Study | # of Patterns Found | Security Patterns | Key/Permission Patterns |
|-------|--------------------|--------------------|------------------------|
| Azimi et al. (2025) | 144 | 36 | Very few |
| Six et al. (2022) | 120 | 11 | Partial |
| Lu et al. (2021) | 12 | Some (payment-focused) | Multi-sig for payments only |
| **Our paper** | **3** | **3 (focused)** | **All 3 are key/permission** |

The gap: **144 patterns exist but almost none are formally verified key/permission patterns.** That's our contribution.

### Common security patterns (referenced in paper)

| Pattern | What it does | Relationship to our work |
|---------|-------------|--------------------------|
| **Checks-Effects-Interactions (CEI)** | Update state before making external calls. Prevents reentrancy. | We follow CEI in all our contracts but it's not our main contribution. |
| **Access Restriction** | Use modifiers to limit who can call a function. | Our RBAC pattern is a sophisticated version of this. |
| **Emergency Stop** | A "pause" button that stops all contract operations. | Related to our RBAC guardian role concept. |
| **Pull over Push** | Recipients withdraw funds rather than contract pushing to them. | Gas optimization technique; not directly in our patterns. |
| **Guard Check** | Validate inputs at the start of functions. | We use custom errors for input validation. |

---

## 9. Our Three Patterns — The Core Contribution

### Pattern 1: k-of-n Multisignature Wallet

**Problem it solves:** One person controls all the funds. If their key is stolen, everything is lost.

**Solution:** Require k out of n people to agree before any action executes.

**Real-world analogy:** A bank safe that requires 3 out of 5 managers to turn their keys simultaneously.

```
5 Owners each have a private key
         │
    3 must sign (threshold = 3)
         │
         ▼
┌─────────────────────────────────┐
│  Owner 1: signs ✓               │
│  Owner 2: signs ✓               │
│  Owner 3: signs ✓               │
│  Owner 4: doesn't sign          │
│  Owner 5: doesn't sign          │
│                                 │
│  3 ≥ threshold(3) → EXECUTE ✓  │
└─────────────────────────────────┘
```

**Properties enforced:**
- **P1:** At least k signatures required
- **P2:** No single person can act alone (k ≥ 2)
- **P3:** Each transaction is unique (nonce prevents replay)
- **P4:** Changing the owner set itself requires multisig approval

**Design decisions we made:**

| Decision | What we chose | Alternative | Why |
|----------|--------------|-------------|-----|
| Signature collection | Off-chain | On-chain proposal/confirm | Saves gas — no storage needed for proposals |
| Duplicate detection | Sorted signer order | Mapping of who confirmed | O(n) check without extra storage |
| Replay protection | Nonce in signed hash | Deadline-based | Simpler, strictly ordering |
| Signature format | Packed bytes (65 each) | bytes[] array | Less calldata overhead |

### Pattern 2: Timelock Controller

**Problem it solves:** Even with multisig, a compromised quorum can act instantly. No time for the community to react.

**Solution:** Force a mandatory delay between scheduling an action and executing it. Everyone can see what's queued.

**Real-world analogy:** Publishing a legal notice 30 days before a corporate merger. Anyone affected has time to object.

```
Day 0: Proposer schedules "transfer 1M to new address"
       │
       ▼ (publicly visible on blockchain)

Day 0–Day 1: Anyone can see the pending action
              Canceller can cancel if it looks suspicious
       │
       ▼ (minDelay = 1 day passes)

Day 1+: Executor can now execute the action
       │
       ▼ (GRACE_PERIOD = 14 days)

Day 15+: Action expires, can no longer be executed
```

**Properties enforced:**
- **P5:** No early execution (block.timestamp must be ≥ eta)
- **P6:** Only canceller role can cancel
- **P7:** Expired operations can't execute (grace period)

**Roles in the timelock:**

| Role | Who | Can do |
|------|-----|--------|
| PROPOSER_ROLE | Multisig wallet (in composed setup) | Schedule new operations |
| EXECUTOR_ROLE | Trusted executor | Execute matured operations |
| CANCELLER_ROLE | Guardian/security team | Cancel suspicious operations |
| ADMIN_ROLE | The timelock itself (self-administered) | Grant/revoke roles |

### Pattern 3: Role-Based Access Control (RBAC)

**Problem it solves:** Simple owner checks (`require(msg.sender == owner)`) are all-or-nothing. Real systems need fine-grained permissions.

**Solution:** Map addresses to named roles. Each role has an admin role that controls who can grant or revoke it.

**Real-world analogy:** Company hierarchy. The CEO can hire VPs. VPs can hire managers. Managers can hire staff. But staff can't hire CEOs.

```
DEFAULT_ADMIN_ROLE (bytes32(0))
    │
    ├── administers → OPERATOR_ROLE
    │                    │
    │                    └── (cannot grant ADMIN)
    │
    └── administers → GUARDIAN_ROLE
                         │
                         └── (cannot grant ADMIN)
```

**The two-step grant mechanism:**

```
Step 1: Admin calls proposeGrant(OPERATOR_ROLE, Alice)
        → Sets pendingGrant[OPERATOR_ROLE][Alice] = true
        → Alice does NOT have the role yet

Step 2: Alice calls acceptRole(OPERATOR_ROLE)
        → Checks pendingGrant is true
        → Grants the role to Alice
        → Clears the pending flag
```

**Why two steps?** Prevents mistakes. If admin accidentally grants a role to the wrong address (e.g., a contract that can't interact), the role is never activated because nobody calls `acceptRole` from that address.

**Properties enforced:**
- **P8:** Only the admin of role R can grant/revoke R
- **P9:** Role transfer requires explicit acceptance
- **P10:** No sequence of operations allows unauthorized escalation

### Pattern Composition: Governed Contract

The three patterns compose into a **defense-in-depth** governance pipeline:

```
1. Multisig owners sign off-chain     ─── P1, P2, P3, P4
         │
2. Submit to MultiSigWallet.execute()
         │
3. Which calls timelock.schedule()    ─── P5, P6, P7
         │
4. Wait for delay period
         │
5. Call timelock.execute()
         │
6. Which calls governed.someAction()  ─── P8, P9, P10
         │
7. RBAC verifies the caller role
         │
         ▼
   Action executes
```

**Every permission change must pass ALL three gates.** An attacker would need to:
- Compromise k keys (beat multisig) AND
- Wait out the delay (beat timelock) AND
- Have the correct role (beat RBAC)

---

## 10. Formal Verification — Mathematical Proof

### What is formal verification?

Formal verification is **mathematical proof that software behaves correctly for ALL possible inputs**. Not just testing with some inputs — PROVING for every possible input.

**Testing vs. Formal Verification:**

| Aspect | Testing | Formal Verification |
|--------|---------|---------------------|
| **Coverage** | Specific test cases | ALL possible inputs |
| **Guarantee** | "These 35 cases work" | "It works for every possible case" |
| **Analogy** | Checking 100 doors in a building | Proving the building has no doors that open to the void |
| **Can find bugs?** | Only in tested scenarios | In ANY scenario, including ones you didn't think of |
| **Limitation** | Can't prove absence of bugs | Specs might be wrong; tools might have bugs |

**Example:**

Testing P1 (k signatures required):
```
Test: 3 valid signatures → passes ✓
Test: 2 valid signatures → reverts ✓
Test: 0 signatures → reverts ✓
// But what about 3 signatures where one has s in the upper half-order?
// What about max(uint256) as the nonce? What about a self-referencing call?
```

Formal verification of P1:
```
FOR ALL possible inputs (to, value, data, signatures):
  IF execute() succeeds
  THEN at least k signatures were valid owner signatures
// This covers EVERY possible combination of inputs, including ones
// no human would think to test.
```

### Key formal verification concepts

**Safety invariant:** A property that must ALWAYS be true. "The balance never goes negative." "At least k signatures are required."

**Liveness property:** Something that must EVENTUALLY happen. "A scheduled operation will eventually become executable." (We focus on safety, not liveness.)

**Counterexample:** If the prover finds an input that violates the property, it returns the exact input as a counterexample. "Here's a set of inputs where execute() succeeds with only 2 signatures." If no counterexample exists, the property is verified.

**SMT solver:** The mathematical engine behind formal verification. SAT Modulo Theories — it checks whether a set of logical constraints can be satisfied. If the constraints "property is violated" are unsatisfiable, the property holds.

**Specification:** The formal description of what the contract should do. Written in CVL (Certora Verification Language) for our paper.

### Approaches to formal verification

| Approach | How it works | Tool example | Used in our paper? |
|----------|-------------|-------------|-------------------|
| **Model checking** | Exhaustively explore all reachable states | Spin, TLA+ | No (state space too large for smart contracts) |
| **Theorem proving** | Human writes proof; tool checks it | Coq, Isabelle, Lean | No (too manual) |
| **Symbolic execution** | Explore paths using symbolic inputs instead of concrete values | Mythril, Manticore | Yes (Stage 2) |
| **Static analysis** | Analyze code without running it | Slither, Securify | Yes (Stage 1) |
| **SMT-based verification** | Translate code + specs to SMT constraints | Certora, KEVM | Yes (Stage 3) |
| **Runtime verification** | Check properties during actual execution | OpenZeppelin Defender | No (post-deployment, not preventive) |

---

## 11. Our Verification Tools — The Three-Stage Pipeline

### Why three tools?

Each tool has different strengths and weaknesses. Using three independent tools provides **defense in depth** — a bug that escapes one tool is likely caught by another.

```
                    Solidity Source Code
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ SLITHER  │ │ MYTHRIL  │ │ CERTORA  │
        │ (static) │ │(symbolic)│ │ (formal) │
        └────┬─────┘ └────┬─────┘ └────┬─────┘
             │            │            │
        0 findings   0 paths      10/10 verified
             │            │            │
              └────────────┼────────────┘
                           ▼
                    CONTRACT IS SAFE
```

### Stage 1: Slither (Static Analysis)

**What it is:** A Python-based static analysis framework for Solidity. It reads the code without running it and checks for known vulnerability patterns.

**How it works:** Parses the Solidity AST (Abstract Syntax Tree), builds a control flow graph, and runs ~90 built-in detectors.

**What it catches:**
- Reentrancy vulnerabilities
- Unprotected selfdestruct
- State variable shadowing
- Unchecked return values
- Tx.origin usage (authentication bypass)

**What it can't catch:** Logic errors specific to your application. Slither knows common patterns; it doesn't know your specific business rules.

**Command:**
```bash
slither . --config-file slither.config.json
```

**Expected output for our contracts:**
```
0 high-severity findings
0 medium-severity findings
(possibly some informational notes — these are fine)
```

**Alternatives to Slither:**

| Tool | Key difference |
|------|---------------|
| **Securify2** | ETH Zurich research tool. Pattern-based like Slither but different detector set. |
| **Solhint** | Linter, not security analyzer. Checks code style, not vulnerabilities. |
| **Semgrep** | Generic static analysis. Can be configured for Solidity but less mature. |

### Stage 2: Mythril (Symbolic Execution)

**What it is:** A security analysis tool that uses symbolic execution to explore smart contract execution paths and find exploitable conditions.

**How it works:** Instead of using concrete values (like testing with `amount = 100`), Mythril uses **symbolic values** (like `amount = X` where X can be anything). It then explores all possible execution paths and checks whether any path leads to a vulnerability.

**What it catches:**
- Integer overflows (found concrete inputs that overflow)
- Ether theft (found a path where an attacker can drain funds)
- Assertion violations
- Unprotected selfdestruct

**Transaction depth:** The `-t 3` flag means Mythril simulates up to 3 sequential transactions. This catches multi-step attacks where the attacker calls multiple functions in sequence.

**Command:**
```bash
myth analyze contracts/MultiSigWallet.sol --solv 0.8.20 -t 3
```

**Expected output:**
```
The analysis was completed successfully. No issues were detected.
```

**Alternatives to Mythril:**

| Tool | Key difference |
|------|---------------|
| **Manticore** | Trail of Bits. Also symbolic execution but supports more languages (EVM + x86). Slower. |
| **Echidna** | Fuzz testing (random inputs, not symbolic). Property-based testing approach. |
| **Halmos** | Symbolic testing framework. Newer, Foundry-based. |

### Stage 3: Certora Prover (Formal Verification)

**What it is:** A commercial formal verification platform specifically designed for smart contracts. It's the **strongest** verification method available — mathematical proof.

**How it works:**
1. You write specifications in **CVL (Certora Verification Language)**
2. Certora translates your Solidity code + CVL specs into **SMT constraints**
3. An SMT solver (mathematical reasoning engine) checks whether the property can ever be violated
4. If no violation exists → **VERIFIED** (proven for ALL inputs)
5. If a violation exists → returns a **counterexample** (exact inputs that break the property)

**CVL specification example (from our specs/multisig.spec):**
```
rule authorizationRequiresKSignatures {
    // For all possible inputs...
    env e;
    address to; uint256 value;
    bytes data; bytes sigs;

    // If execute succeeds...
    execute(e, to, value, data, sigs);

    // Then at least threshold signatures were valid
    assert sigCount >= threshold;
}
```

**What Certora proves that testing cannot:**
- "There is NO input combination that allows execute() to succeed with fewer than k signatures"
- "For EVERY possible nonce value, replay is impossible"
- "No matter what sequence of function calls an attacker makes, they cannot escalate privileges"

**Cost:** Certora requires an API key (free for academic use). Verification runs on their cloud.

**Alternatives to Certora:**

| Tool | Key difference |
|------|---------------|
| **KEVM** | Runtime Verification Inc. Verifies at the EVM bytecode level. Lower-level but catches compiler bugs. We mention it as supplementary. |
| **Solidity SMTChecker** | Built into the Solidity compiler. Limited but free. Checks overflow/underflow and user assertions. |
| **Move Prover** | For the Move language (Aptos/Sui). Similar concept but different ecosystem. Referenced in our paper (Park et al.). |
| **Dafny/Coq/Isabelle** | General-purpose theorem provers. Very powerful but require manual proof writing. Not specific to smart contracts. |
| **VerX** | Automated temporal safety property verification for Ethereum. Academic. |

---

## 12. Testing and Development Tools

### Hardhat

**What it is:** A JavaScript-based Ethereum development environment. The most popular tool for developing, testing, and deploying Solidity contracts.

**What it provides:**
- Built-in Ethereum network (Hardhat Network) for testing
- Solidity compilation
- Test framework (Mocha + Chai)
- Debugging (stack traces, console.log in Solidity)
- Network forking (simulate mainnet locally)

**Command examples:**
```bash
npx hardhat compile      # Compile all .sol files
npx hardhat test         # Run all test files
npx hardhat node         # Start a local blockchain
npx hardhat run script   # Run a deployment/profiling script
```

**Alternatives to Hardhat:**

| Tool | Key difference | Why we didn't use it |
|------|---------------|---------------------|
| **Foundry (Forge)** | Rust-based. Tests written in Solidity, not JavaScript. Much faster. | Newer ecosystem; our Java toolkit integrates better with JS tooling |
| **Truffle** | Older JS framework. Was the standard before Hardhat. | Less maintained; Hardhat has better debugging and plugin ecosystem |
| **Brownie** | Python-based. Good for Python developers. | Our paper focuses on Java tooling; Brownie uses Python |
| **Remix IDE** | Browser-based. No setup required. | Not suitable for automated testing or CI |

### Ethers.js (v6)

**What it is:** A JavaScript library for interacting with Ethereum. Used in our tests to:
- Deploy contracts
- Call functions
- Sign messages (EIP-712 signTypedData)
- Read blockchain state

**Alternative:** **web3.js** — the older Ethereum JS library. Ethers.js is more modern, smaller, and has better TypeScript support. We use ethers.js in tests but web3j (Java) in the toolkit.

### Chai

**What it is:** A JavaScript assertion library. Provides readable test assertions:

```javascript
expect(await wallet.isOwner(newOwner.address)).to.be.true;
expect(balAfter - balBefore).to.equal(value);
await expect(wallet.execute(...)).to.be.revertedWithCustomError(wallet, "SignerNotOwner");
```

### Mocha

**What it is:** A JavaScript test framework. Provides `describe`, `it`, `beforeEach`:

```javascript
describe("MultiSigWallet", function () {
  beforeEach(async function () {
    // Deploy fresh contract before each test
  });

  it("should execute with 3 valid signatures", async function () {
    // Test code
  });
});
```

---

## 13. Java Toolkit and CI/CD

### web3j

**What it is:** A lightweight Java library for integrating with Ethereum. Provides:
- Contract deployment and interaction
- Transaction signing
- ABI encoding/decoding
- Type-safe Java wrappers for contracts

**Why Java?** Enterprise teams often use Java. Having a Java toolkit lowers the adoption barrier for organizations that don't use JavaScript/Python.

**Alternatives to web3j:**

| Library | Language | Notes |
|---------|---------|-------|
| **ethers.js** | JavaScript | Most popular. We use this in tests. |
| **web3.js** | JavaScript | Older alternative to ethers.js. |
| **web3.py** | Python | For Python developers. |
| **ethclient** | Go | Part of go-ethereum (geth). |
| **Nethereum** | C#/.NET | For .NET developers. |

### Maven

**What it is:** A Java build tool and dependency manager. Like npm for Java. Our `pom.xml` defines dependencies (web3j, jackson, slf4j) and build settings.

```bash
mvn clean compile     # Compile Java code
mvn exec:java         # Run the main class
mvn test              # Run JUnit tests
```

**Alternatives to Maven:**

| Tool | Key difference |
|------|---------------|
| **Gradle** | Groovy/Kotlin-based build tool. More flexible but steeper learning curve. |
| **Ant** | Older XML-based build tool. Less convention, more configuration. |

### CI/CD (Continuous Integration / Continuous Deployment)

**What it is:** Automatically running builds, tests, and verification every time code changes. Catches regressions immediately.

**Our CI pipeline (.github/workflows/verify.yml):**

```
On every push to main:
  1. Lint & Compile     → Check contracts compile
  2. Slither Analysis   → Static security check
  3. Unit Tests         → 35 tests pass
  4. Adversarial Tests  → 3 attack scenarios blocked
  5. Gas Profiling      → Measure costs
  6. Certora (optional) → Formal proofs
```

**Why this matters for the paper:** We claim verification can be "continuous" — not a one-time audit. The CI pipeline proves this claim.

### GitHub Actions

**What it is:** GitHub's built-in CI/CD platform. Runs workflows defined in YAML files when events occur (push, pull request).

**Alternatives:**

| Platform | Key difference |
|----------|---------------|
| **Jenkins** | Self-hosted. More configurable. Mentioned in paper as compatible. |
| **CircleCI** | Cloud-hosted. Faster builds for some use cases. |
| **GitLab CI** | Built into GitLab. Similar to GitHub Actions. |
| **Travis CI** | One of the first cloud CI platforms. Less popular now. |

---

## 14. Ethereum Standards — EIPs and ERCs

### What are EIPs and ERCs?

- **EIP (Ethereum Improvement Proposal):** A proposal to change something in Ethereum (protocol, standards, tools).
- **ERC (Ethereum Request for Comments):** A subset of EIPs that define application-level standards (token interfaces, signing formats).

### Standards referenced in our paper

| Standard | What it defines | How it relates to our work |
|----------|----------------|---------------------------|
| **EIP-712** | Structured data signing. Defines how to sign typed data in a human-readable way. | Our multisig uses EIP-712 for transaction signing. |
| **ERC-20** | Fungible token interface (transfer, approve, balanceOf). | Antonino et al. verified ERC-20 conformance. Our patterns could protect ERC-20 admin functions. |
| **ERC-1155** | Multi-token standard (fungible + non-fungible in one contract). | Antonino et al. also verified ERC-1155. |
| **EIP-2** | Homestead hard fork. Among other changes, restricts signature `s` values to prevent malleability. | Our ECDSA library enforces EIP-2 by rejecting high-s signatures. |

---

## 15. Real-World Incidents Referenced

### The DAO Hack (2016) — $60M stolen

**What happened:** A decentralized venture capital fund. An attacker exploited a reentrancy bug to drain ~$60M in ETH by recursively calling the withdrawal function before the balance was updated.

**Root cause:** The contract sent ETH before updating the sender's balance. The attacker's contract had a fallback function that called withdraw again.

**How our patterns would have helped:** An RBAC emergency role (P8) could have paused the contract. A timelock (P6) on large withdrawals would have created a window to cancel.

### Parity Multisig Hack (2017) — $150M frozen

**What happened:** Parity's multisig wallet library contract had an unprotected `initWallet()` function. An attacker called it, made themselves the owner, then called `selfdestruct`, destroying the library. All wallets depending on it were permanently frozen.

**Root cause:** No access control on the initialization function. A single unauthorized call changed ownership.

**How our patterns would have helped:** P1 (k-of-n signatures) and P2 (no unilateral execution) would have required multiple signatures for any ownership change. P4 (governance gated) would have prevented single-key initialization.

### Ronin Bridge Attack (2022) — $625M stolen

**What happened:** The Ronin bridge connecting Axie Infinity to Ethereum used a 5-of-9 multisig for validator approvals. An attacker silently compromised 5 keys over months, then submitted a fraudulent withdrawal.

**Root cause:** No timelock on validator operations. Once 5 keys were compromised, the attacker could act instantly.

**How our patterns would have helped:** P5 (timelock delay) would have introduced a mandatory public waiting period. During that window, the community could see the suspicious transaction and P6 (cancellation) would allow stopping it.

---

## 16. Research Methodology Terms

### Systematic review
A methodical literature search following predefined criteria. Azimi et al.'s 144-pattern survey was a systematic review. Ours is not — we build on their findings.

### Threat model
A formal description of who the attacker is, what they can do, and what they're trying to achieve. Our threat model (Section III) defines:
- **Adversary capabilities:** single-key compromise, minority compromise, logic exploitation, governance attack, replay
- **What we defend:** P1-P10
- **What we don't defend:** majority collusion, EVM bugs, physical attacks

### Safety property vs. Liveness property
- **Safety:** "Nothing bad ever happens." (P1: unauthorized execution never succeeds)
- **Liveness:** "Something good eventually happens." (A scheduled operation eventually becomes executable)

Our paper focuses entirely on **safety properties** (P1-P10).

### Empirical evaluation
Collecting real data (measurements, observations) rather than purely theoretical analysis. Our evaluation includes:
- Gas measurements (empirical)
- Test results (empirical)
- Formal proofs (theoretical)
- Usability survey (empirical)

### Likert scale
A 1-5 rating scale commonly used in surveys: 1 = Strongly Disagree → 5 = Strongly Agree. Used in our usability assessment (Section VI-D).

### Retrospective analysis
Analyzing past events using current knowledge. We look at 3 historical exploits and determine whether our patterns would have prevented them. This is NOT the same as predicting future attacks.

### Counterexample
In formal verification: a specific input that violates a property. "Here are exact values of `to`, `value`, `data`, `sigs` that allow execution with only 2 signatures." If the prover finds no counterexample → the property holds for ALL inputs.

---

## 17. Alternative Tools We Did NOT Use

### Blockchain platforms

| Platform | Why we didn't use it |
|----------|---------------------|
| **Solana** | Different VM (not EVM). Rust-based contracts. Different security model. |
| **Cardano** | Haskell-based (Plutus). Different formal verification approach. |
| **Tezos** | Has built-in formal verification (Mi-Cho-Coq). Could be interesting but smaller ecosystem. |
| **Polygon/Arbitrum/Optimism** | EVM-compatible L2s. Our patterns work on them unchanged since they run the same EVM. |

### Testing frameworks

| Tool | Why we didn't use it |
|------|---------------------|
| **Foundry/Forge** | Tests in Solidity (not JS). Faster but newer ecosystem. Would require Java toolkit integration rework. |
| **Echidna** | Fuzz tester. Finds bugs by random input generation. Complementary but less deterministic than our approach. |
| **Brownie** | Python-based. Our paper emphasizes Java tooling for enterprise adoption. |

### Formal verification tools

| Tool | Why we didn't use it |
|------|---------------------|
| **Dafny** | General-purpose verifier. Not Solidity-specific. Requires rewriting contracts. |
| **Coq / Isabelle** | Interactive theorem provers. Very powerful but require significant manual effort. Not practical for developer workflow. |
| **K Framework (KEVM)** | We mention it. Verifies at bytecode level. More complete but harder to write specs. |
| **Solidity SMTChecker** | Built into compiler. Limited: only checks overflow, underflow, and user assertions. Can't express complex properties like P10. |

### Security analysis tools

| Tool | Why we didn't use it |
|------|---------------------|
| **Securify2** | Academic. Less maintained than Slither. |
| **MythX** | Cloud-based version of Mythril + more. Requires paid subscription. |
| **Oyente** | One of the first EVM analysis tools. Outdated. |
| **SmartCheck** | Pattern-based. Less comprehensive than Slither. |
| **Manticore** | Symbolic execution like Mythril. Slower, broader scope. |

### Key management solutions

| Solution | Why we didn't use it |
|----------|---------------------|
| **Hardware Security Modules (HSMs)** | Physical devices. Our patterns are software-based on-chain solutions. |
| **MPC wallets (Fireblocks, etc.)** | Commercial off-chain key management. Complementary but not on-chain patterns. |
| **Social recovery (Argent)** | Wallet-level feature. Not a general smart contract pattern. |

---

## 18. Quick-Reference Glossary (A–Z)

| Term | Definition |
|------|-----------|
| **ABI** | Application Binary Interface. JSON describing a contract's functions and types. |
| **Access control** | Restricting who can call which functions. |
| **Address** | 20-byte Ethereum identifier (e.g., `0xf39F...2266`). |
| **Admin role** | The role that controls who can grant/revoke another role. |
| **Adversarial simulation** | Testing by simulating attacker behavior. |
| **Block** | A batch of transactions added to the chain. |
| **Blockchain** | Distributed, append-only ledger of transactions. |
| **Bytecode** | Compiled machine code that the EVM executes. |
| **Calldata** | Read-only transaction input data. Cheapest memory location in Solidity. |
| **CEI pattern** | Checks-Effects-Interactions. Update state before external calls. |
| **Certora** | Formal verification platform for smart contracts using CVL specs. |
| **CI/CD** | Continuous Integration / Continuous Deployment. Automated build-test-deploy pipelines. |
| **Counterexample** | A specific input that violates a formal property. |
| **CVL** | Certora Verification Language. Used to write formal specifications. |
| **DAO** | Decentralized Autonomous Organization. The 2016 DAO hack lost $60M. |
| **Deploy** | Publishing a contract to the blockchain. Permanent and costs gas. |
| **ECDSA** | Elliptic Curve Digital Signature Algorithm. Signs and verifies messages. |
| **ecrecover** | EVM function that recovers a signer's address from a signature. |
| **EIP** | Ethereum Improvement Proposal. Standards for Ethereum changes. |
| **EIP-712** | Standard for signing structured/typed data. |
| **ERC** | Ethereum Request for Comments. Application-level standards. |
| **ERC-20** | Fungible token standard (transfer, approve, balanceOf). |
| **ETH** | Ether. The native cryptocurrency of Ethereum. |
| **EVM** | Ethereum Virtual Machine. Executes smart contract bytecode. |
| **Formal verification** | Mathematical proof that code satisfies a specification for ALL inputs. |
| **Gas** | Unit of computational effort on Ethereum. |
| **Governed** | Our composition contract wiring multisig + timelock + RBAC together. |
| **Grace period** | Window after ETA during which a timelock operation can still execute. |
| **Gwei** | 10⁻⁹ ETH. Common unit for gas prices. |
| **Hardhat** | JavaScript-based Ethereum development and testing framework. |
| **Immutable** | Cannot be changed after deployment. Smart contract code is immutable. |
| **Invariant** | A property that must always hold true. |
| **k-of-n** | Multisig threshold scheme. k out of n parties must agree. |
| **Keccak-256** | The hash function used throughout Ethereum. |
| **KEVM** | K-framework EVM semantics. Bytecode-level formal verification. |
| **Key management** | Practices for generating, storing, using, and protecting cryptographic keys. |
| **Likert scale** | 1–5 rating scale used in surveys. |
| **Mapping** | Solidity hash table (key → value). |
| **Maven** | Java build tool and dependency manager. |
| **Memory** | Temporary storage in Solidity. Exists only during function execution. |
| **Modifier** | Solidity function wrapper for pre/post checks (e.g., `onlyRole`). |
| **Move** | Smart contract language for Aptos/Sui. Resource-oriented. |
| **Multisig** | Multisignature. Multiple parties must sign to authorize an action. |
| **Mythril** | Symbolic execution tool for finding smart contract vulnerabilities. |
| **Nonce** | Number used once. Prevents replay attacks by making each transaction unique. |
| **OpenSCV** | Taxonomy of 94 smart contract vulnerability classes. |
| **Overhead** | Extra cost (gas, time) of our patterns vs. a baseline. |
| **P1–P10** | Our 10 formal safety properties (authorization, replay, timelock, RBAC). |
| **Packed signatures** | Multiple signatures concatenated into a single bytes blob (65 bytes each). |
| **Privilege escalation** | Gaining permissions you shouldn't have. |
| **RBAC** | Role-Based Access Control. Maps addresses to named roles with admin hierarchy. |
| **Reentrancy** | Attack where a contract is called back before the first call finishes. |
| **Replay attack** | Reusing a previously valid signed transaction. |
| **Revert** | Undo all state changes and refund remaining gas. How errors are handled. |
| **Safety property** | "Nothing bad ever happens." (vs. liveness: "something good eventually happens") |
| **Shamir's Secret Sharing** | Split a secret into N shares; any K can reconstruct it. |
| **Slither** | Static analysis tool for Solidity smart contracts. |
| **SMT solver** | Satisfiability Modulo Theories. Mathematical engine behind formal verification. |
| **Solidity** | Primary programming language for Ethereum smart contracts. |
| **Storage** | Permanent on-chain data in Solidity. Expensive to write. |
| **Symbolic execution** | Exploring program paths with symbolic (not concrete) inputs. |
| **Threat model** | Formal description of the attacker's capabilities and goals. |
| **Timelock** | Mandatory delay between scheduling and executing an action. |
| **Two-step grant** | Propose-then-accept pattern for role assignment. |
| **uint256** | Unsigned 256-bit integer. Can hold values from 0 to 2²⁵⁶ - 1. |
| **Verified** | Formally proved to hold for all possible inputs. Strongest guarantee. |
| **web3j** | Java library for interacting with Ethereum. |

---

*Created: 2026-03-20*
*For: Understanding every concept in "Secure Smart-Contract Permission & Key Management: Patterns, Formal Verification, and Java Tooling"*
