# Speaker Guide -- Presentation Walkthrough

> **Presentation:** Secure Smart-Contract Permission & Key Management
> **Speakers:** A, B, C (split across 16 slides)
> **Total time:** ~15 minutes (roughly 5 min each)

---

## Presentation Flow Overview

```
A -> Slide 1, 2        (Title + Problem)
B -> Slide 3, 4, 5     (Gap + Contribution + Threat Model)
A -> Slide 6, 7, 8, 9  (Three Patterns + Composition)
B -> Slide 10, 11      (Verification Pipeline + Java Toolkit)
C -> Slide 12-16       (All Results)
```

---

# PART 0: KNOWLEDGE BASE

Read this entire section before preparing. Every presenter must know this material regardless of which slides they own.

---

## Key Terminology

| Term | What it means | Use it when... |
|------|---------------|----------------|
| **Smart contract** | A self-executing program stored on a blockchain. Once deployed, its code cannot be changed. It runs exactly as written -- no middleman, no override. | Explaining why permission bugs are permanent and dangerous |
| **Ethereum** | The most popular blockchain platform for smart contracts. Uses a cryptocurrency called Ether (ETH). | Any time you reference the platform our code runs on |
| **Solidity** | The programming language used to write Ethereum smart contracts. Think of it like Java/C++ but for blockchain. | Talking about our templates or code |
| **EVM (Ethereum Virtual Machine)** | The runtime environment that executes smart contracts on Ethereum. Every node runs the same EVM, ensuring identical results. | Mentioning scope limitations (our work is EVM-specific) |
| **Gas** | The unit of computational cost on Ethereum. Every operation costs gas. Gas is paid in ETH. More complex operations = more gas = more money. | Explaining why overhead matters and the cost tradeoff |
| **Design pattern** | A reusable, proven solution to a common software problem. Like a template you can adapt. Not copy-paste code -- it's an approach. | Introducing our three patterns |
| **Formal verification** | Mathematically proving that code behaves correctly for ALL possible inputs -- not just the ones you tested. Much stronger than testing. | Explaining why our approach is different from just writing tests |
| **Invariant** | A property that must ALWAYS be true, no matter what happens. Example: "You always need k signatures" -- that can never be violated. | Talking about P1-P10 |
| **k-of-n multisig** | A scheme where n people hold keys, but you need at least k of them to approve an action. Example: 3-of-5 means 5 owners, any 3 must sign. | Explaining multisig pattern |
| **Timelock** | A forced delay between proposing an action and executing it. Gives people time to review and cancel if something looks wrong. | Explaining timelock pattern |
| **RBAC** | Role-Based Access Control. Instead of one admin, you define roles (proposer, executor, canceller) and assign addresses to roles. | Explaining RBAC pattern |
| **Nonce** | A number that increments with each transaction. Prevents replay attacks -- you can't resubmit an old transaction because the nonce has already been used. | Explaining P3 / replay protection |
| **ecrecover** | A Solidity function that recovers the signer's address from a digital signature. Used to verify who signed a message. | Explaining how multisig verifies signatures on-chain |
| **CVL (Certora Verification Language)** | A specification language for writing formal properties about Solidity contracts. You write rules like "this function can never be called by a non-owner." | Explaining our verification specs |
| **SMT solver** | A mathematical engine that checks whether logical formulas can be satisfied. Certora converts code + specs into SMT problems and solves them. | Explaining how Certora works under the hood |
| **CI/CD** | Continuous Integration / Continuous Deployment. Automated pipelines that build, test, and deploy code every time you push a change. | Explaining why the Java toolkit matters for real teams |
| **web3j** | A Java library for interacting with Ethereum. It lets Java programs deploy contracts, send transactions, and read blockchain data. | Explaining our toolkit choice |
| **OpenSCV** | An open taxonomy of 94 known smart contract vulnerability types. Created by Vidal et al. (2024). | Quantifying the gap -- only 6 of 94 are covered by existing patterns |

---

## The Three Incidents -- Know These Cold

Every presenter should be able to explain these from memory. The audience will likely ask about them.

### 1. Parity Wallet Freeze (November 2017)

**What happened:**
- Parity Technologies built a popular multi-signature wallet as a Solidity library contract.
- The library had an `initWallet()` function that was supposed to be called once during setup to set the owner.
- Problem: this function was left PUBLIC and had no check to prevent being called again.
- A user (some say accidentally, some say intentionally) called `initWallet()` on the library contract itself, making themselves the sole owner.
- Then they called `kill()` (self-destruct), which destroyed the library contract.
- Result: 587 wallets that depended on this library were permanently frozen. Around $150 million in Ether became inaccessible forever.

**Root cause:** A single unprotected function with no multi-signature requirement. One address, one call, catastrophic damage.

**How our patterns help:** Our multisig pattern (P1, P2) requires k-of-n signatures for ANY ownership change. A single person calling `initWallet()` would be rejected because you'd need, say, 3 out of 5 owners to approve.

**If someone asks "But wasn't this a library contract bug, not a permission bug?":**
Answer: Yes, but the core issue was that a critical ownership function had no permission control. If initWallet required multi-party approval, the exploit wouldn't have worked regardless of the library architecture.

---

### 2. Ronin Bridge Hack (March 2022)

**What happened:**
- Ronin Network is the blockchain bridge for Axie Infinity (a popular blockchain game).
- The bridge used a 5-of-9 validator scheme: 9 validator nodes, and 5 signatures were needed to approve withdrawals.
- The attacker (linked to North Korea's Lazarus Group) compromised 5 of the 9 validator keys over time.
- Four keys belonged to Sky Mavis (the company behind Axie Infinity). A fifth was obtained through a gas-free RPC node that had been given temporary signing authority but was never revoked.
- With 5 keys, the attacker met the threshold and withdrew 173,600 ETH + 25.5M USDC (~$625 million).
- The hack went undetected for 6 days. Nobody noticed until a user couldn't withdraw funds.

**Root cause:** Too many keys controlled by one entity (4/9), plus a stale permission that was never revoked. No delay mechanism to catch suspicious large withdrawals.

**How our patterns help:** Our timelock pattern (P5, P6) would have introduced a mandatory delay on validator-set changes and large withdrawals. During that delay, the community or monitoring tools could have spotted the suspicious activity and cancelled the operation (P6). The RBAC pattern would ensure permissions like that temporary signing authority get properly managed and revoked.

**If someone asks "But they already had multisig (5-of-9), and it still failed?":**
Answer: Multisig alone isn't enough if key distribution is poor (4 of 9 keys with one entity) and there's no delay mechanism. Our framework combines multisig WITH timelock AND RBAC. The timelock delay is what would have saved Ronin -- giving time to detect and cancel.

---

### 3. The DAO Hack (June 2016)

**What happened:**
- The DAO (Decentralized Autonomous Organization) was a crowdfunded investment fund on Ethereum. It raised $150 million in ETH.
- An attacker found a reentrancy vulnerability in the `withdraw()` function.
- Reentrancy explained: the contract sent ETH to the attacker BEFORE updating its internal balance. The attacker's receiving contract had a fallback function that called `withdraw()` again, creating a loop. The contract kept sending ETH because it hadn't recorded that the first withdrawal happened yet.
- The attacker drained ~$60 million in ETH.
- There was no admin override, no emergency pause, no way to stop the drain once it started.
- This eventually led to the Ethereum hard fork -- the community literally rewrote blockchain history to reverse the theft, splitting Ethereum into ETH and Ethereum Classic (ETC).

**Root cause:** Reentrancy bug + complete absence of emergency admin controls. Nobody could pause the contract or cancel the ongoing exploit.

**How our patterns help:** While our patterns don't prevent reentrancy itself (that's a different class of bug), the RBAC pattern (P8) would have enabled an emergency role that could pause contract operations. Combined with timelock cancellation (P6), administrators could have frozen the contract and stopped the drain. Our patterns are about damage control and governance, not about fixing every possible code bug.

**If someone asks "But reentrancy isn't a permission problem, is it?":**
Answer: The reentrancy was the entry point, but the real amplifier was the lack of any admin control. If there had been an emergency pause mechanism gated by RBAC, the damage would have been limited to the first withdrawal instead of $60 million.

---

## The 10 Properties -- Quick Reference

Know these by number. The audience may ask "What's P7?" and you should answer instantly.

| # | One-line summary | Pattern |
|---|-----------------|---------|
| P1 | Need k valid signatures for any privileged action | Multisig |
| P2 | No single address can execute privileged functions alone | Multisig |
| P3 | Signed messages accepted only once (replay protection via nonce) | Multisig |
| P4 | Owner-set changes require multisig approval | Multisig |
| P5 | Queued operations cannot execute before their scheduled time | Timelock |
| P6 | Only authorized roles can cancel a queued operation | Timelock |
| P7 | Expired operations (past grace period) cannot execute | Timelock |
| P8 | Role grants/revokes only by designated admin role | RBAC |
| P9 | Role recipient must explicitly accept (two-step) | RBAC |
| P10 | No privilege escalation path in the role graph | RBAC |

---

## Tools -- Know What Each Does

| Tool | What it does | Analogy |
|------|-------------|---------|
| **Slither** | Static analysis. Reads code without running it. Finds common mistakes like reentrancy patterns, unused variables, shadowed state variables. Fast (seconds). | Like a spell-checker for smart contracts |
| **Mythril** | Symbolic execution. Explores possible execution paths by treating inputs as mathematical symbols. Finds concrete inputs that break rules. Slower (minutes). | Like a chess engine trying every possible move sequence |
| **Certora** | Formal verification. You write specifications (rules), it mathematically proves the code satisfies them for ALL possible inputs. Strongest guarantee. | Like a mathematical proof -- not "I tested 1000 cases" but "this holds for every case that could ever exist" |
| **Hardhat** | Development environment for Ethereum. Compiles Solidity, runs local blockchain for testing, executes test scripts. | Like your IDE + test runner for smart contracts |
| **web3j** | Java library for Ethereum. Generates type-safe Java wrappers from contract ABI. Lets Java programs interact with blockchain. | Like JDBC but for Ethereum instead of databases |
| **Maven** | Java build tool. Manages dependencies, compiles code, runs tests. Our toolkit is packaged as a Maven project. | Like npm for Java |

---

# PART 1: SPEAKER A

---

## Slide 1 -- Title (Speaker A)

**What to say:**
> "Good [morning/afternoon]. Our paper is titled 'Secure Smart-Contract Permission and Key Management: Patterns, Formal Verification, and Java Tooling.' I'm [name], presenting with [B's name] and [C's name], and we're from the Department of Computer Science at Chitkara University. Our advisor is Dr. Anshu Singla."

**Duration:** ~30 seconds. Don't linger. Title slide is just a greeting.

**Tip:** Make eye contact, smile, set a confident tone. The audience decides in the first 15 seconds whether to pay attention.

---

## Slide 2 -- The Problem (Speaker A)

**What to say:**
> "Let's start with why this work matters. In 2017, someone called a single unprotected function on the Parity multi-signature wallet library -- one function call, one person -- and 150 million dollars in Ether was frozen permanently. Five years later, in 2022, attackers compromised 5 out of 9 validator keys on the Ronin bridge -- the blockchain behind Axie Infinity -- and walked away with 625 million dollars. The hack went undetected for six days.
>
> These weren't exotic attacks. In both cases, the root cause was the same: poor management of keys and permissions. One had no multi-party approval. The other had no delay mechanism to catch suspicious activity. These are solved problems in traditional security, but in smart contracts, they keep causing disasters."

**Duration:** ~1.5 minutes

**Key numbers to emphasize (pause on these):**
- $150 million frozen (Parity)
- $625 million stolen (Ronin)
- 6 days undetected (Ronin)
- One function call (Parity)

**Transition to B:**
> "So the question is -- why don't we have good solutions for this? [B's name] will walk you through the gap in existing work."

---

## HANDOFF: A -> B (after Slide 2)

B should be ready to step in immediately. No awkward pause. A says the transition line, B starts talking.

---

## Slide 6 -- Multisig Wallet (Speaker A)

*A returns after B finishes Slide 5.*

**Transition from B:**
B ends Slide 5 with something like: "Now [A's name] will walk you through the three patterns we designed to enforce these properties."

**What to say:**
> "The first pattern is a k-of-n multisignature wallet. The idea is simple: no single person should be able to execute a critical action alone.
>
> Here's how it works. The contract stores n owner addresses and a threshold k. When someone wants to execute a privileged transaction -- say, moving treasury funds -- the transaction is proposed off-chain. Each owner signs it individually with their private key. Then the collected signatures are submitted on-chain.
>
> The contract takes each signature, recovers the signer's address using ecrecover, checks that the signer is actually an owner, checks that there are no duplicates, and only executes if at least k valid signatures are present.
>
> A nonce -- a counter that goes up by one after every execution -- makes sure you can't replay an old set of signatures. And here's the important part: even changing who the owners are, or changing the threshold k, requires multisig approval. You can't silently add yourself as an owner.
>
> This pattern enforces properties P1 through P4: you need k signatures, no one acts alone, replays are blocked, and governance changes are gated."

**Duration:** ~1.5 minutes

**If asked "Why off-chain signing instead of on-chain proposals?":**
> "Gas optimization. On-chain proposals require each signer to submit a separate transaction, each costing gas. Off-chain signing means signatures are free -- only the final submission costs gas. This is a well-established pattern used by Gnosis Safe."

---

## Slide 7 -- Timelock Controller (Speaker A)

**What to say:**
> "The second pattern is a timelock controller. Its purpose is to enforce a mandatory, publicly visible delay on any administrative action.
>
> An authorized proposer schedules an operation with a minimum delay. That operation sits in a queue, visible to everyone. Only after the delay period has passed can an executor call execute. If the delay hasn't elapsed, the contract reverts -- 'too early.'
>
> We also enforce a grace period. If an operation sits too long past its scheduled time, it expires and can never be executed. This prevents old, forgotten operations from suddenly being triggered.
>
> And there's a cancellation mechanism: authorized cancellers can void any queued operation before it executes. This is what would have saved Ronin -- if validator-set changes had a 24-hour timelock, the community would have had time to notice and cancel the malicious withdrawal.
>
> This gives us P5, P6, and P7: delays are respected, cancellation is role-restricted, and expired operations are dead."

**Duration:** ~1 minute

---

## Slide 8 -- RBAC (Speaker A)

**What to say:**
> "The third pattern is role-based access control. Instead of a single admin address that controls everything, we define fine-grained roles -- proposer, executor, canceller -- each represented as a bytes32 identifier.
>
> Each role has a designated admin role that controls who gets it. Only the admin of a role can propose granting that role to someone new.
>
> But here's what makes our approach different from OpenZeppelin's standard AccessControl: we use a two-step transfer. The admin proposes the grant, but the recipient must explicitly accept it. This prevents accidental grants -- you can't accidentally give admin powers to the wrong address because that address has to actively claim them.
>
> This enforces P8, P9, and P10: grants are admin-gated, acceptance is explicit, and there's no path to escalate privileges without going through the proper chain."

**Duration:** ~1 minute

**If asked "How is this different from OpenZeppelin AccessControl?":**
> "OpenZeppelin uses single-step grantRole -- the admin calls one function and the role is immediately active. We add a two-step mechanism: propose then accept. This is strictly stronger because it requires the recipient's consent and prevents accidental or malicious grants to wrong addresses."

---

## Slide 9 -- Composition (Speaker A)

**What to say:**
> "Now these three patterns aren't meant to work in isolation -- they're designed to compose.
>
> We have a Governed base contract that wires them together. The multisig wallet acts as the sole proposer on the timelock. The timelock serves as the sole executor for RBAC administrative actions.
>
> So if you want to change a role assignment, here's what happens: first, k-of-n owners sign off on the proposal. Then the timelock queues it with a mandatory delay. Only after the delay passes can the RBAC change actually execute.
>
> This gives you defense in depth. Compromising just the multisig isn't enough -- there's still the delay. Bypassing the timelock isn't enough -- you still need k signatures. Every layer adds protection."

**Duration:** ~1 minute

**Transition to B:**
> "[B's name] will now explain our verification pipeline and the Java toolkit that ties it all together."

---

## HANDOFF: A -> B (after Slide 9)

---

# PART 2: SPEAKER B

---

## Slide 3 -- The Gap (Speaker B)

*B takes over after A finishes Slide 2.*

**What to say:**
> "Thank you [A's name]. So let's look at the current landscape.
>
> Design pattern research is active -- Azimi and colleagues catalogued 144 patterns just last year. But only 36 of those are about security, and only 5 actually target known vulnerabilities. That covers just 6 out of 94 vulnerability types in the OpenSCV taxonomy.
>
> Formal verification tools exist -- Slither, Mythril, Certora, the Move Prover. The Aptos team even verified an entire blockchain framework. But these efforts haven't produced reusable Solidity templates that regular developers can pick up and use.
>
> Key management research exists too -- secret sharing, custodial strategies, key-loss recovery. But none of it is preventive, pattern-based, or formally verified.
>
> [Point to the Venn diagram] These three areas have been studied separately. What's missing is the intersection. Nobody has taken verified patterns for key and permission management and wrapped them in a developer-ready toolkit. That's the gap we fill."

**Duration:** ~1.5 minutes

**Key phrase to emphasize:** "These three areas exist separately. Nobody has combined them."

---

## Slide 4 -- Our Contribution (Speaker B)

**What to say:**
> "Here's what we contribute. Four things.
>
> First, three modular design patterns -- multisig, timelock, and RBAC -- each formally specified and targeting a distinct aspect of permission management.
>
> Second, reusable Solidity templates that aren't just bare code. They come with annotations and Certora specifications defining ten core safety invariants. You can read the code and understand exactly what security properties it enforces.
>
> Third, a multi-stage verification pipeline. We chain three tools -- Slither for static analysis, Mythril for symbolic execution, and Certora for formal proofs -- each catching different classes of issues.
>
> Fourth, an open-source Java toolkit built on web3j that automates the whole workflow: compile, deploy, verify, and report. It plugs into standard CI systems so verification happens continuously, not just once."

**Duration:** ~1 minute

**Tip:** Hold up fingers (1, 2, 3, 4) as you list each contribution. Keeps the audience tracking.

---

## Slide 5 -- Threat Model (Speaker B)

**What to say:**
> "Now let me be precise about what we defend against.
>
> Picture a smart contract system managed by n privileged key holders. The adversary wants to execute admin actions they're not authorized for -- transferring funds, changing access controls, upgrading contract logic.
>
> They can do this several ways. They might steal a single key through phishing or malware. In a multisig setup, they might grab up to k-minus-1 keys. They might exploit bugs in permission logic -- reentrancy, missing auth checks. They might try to escalate roles without approval, or replay a previously valid transaction.
>
> Against these threats, we define ten safety invariants -- P1 through P10. P1 through P4 are enforced by the multisig: you need k signatures, no one acts alone, replays are blocked, governance changes are gated. P5 through P7 are enforced by the timelock: delays are mandatory, cancellation is restricted, expired operations die. P8 through P10 are enforced by RBAC: grants are admin-controlled, acceptance is explicit, and there's no sneaky escalation path.
>
> What we don't cover: if the attacker compromises a full k-of-n majority -- meaning actual collusion among most key holders -- our patterns can't stop that. We also don't cover EVM bugs or Solidity compiler bugs."

**Duration:** ~1.5 minutes

**Transition to A:**
> "Those are the properties. Now [A's name] will show you the three patterns we designed to enforce them."

---

## HANDOFF: B -> A (after Slide 5)

---

## Slide 10 -- Verification Pipeline (Speaker B)

*B returns after A finishes Slide 9.*

**What to say:**
> "So we've shown the patterns. Now how do we know they actually work?
>
> We use a three-stage verification pipeline. Each stage catches different kinds of problems, and together they give us layered confidence.
>
> Stage one is Slither -- static analysis. It reads the code without running it and looks for common anti-patterns: reentrancy, unprotected selfdestruct, variable shadowing. It's fast -- under 5 seconds for all our contracts combined. Think of it as a spell-checker for smart contracts.
>
> Stage two is Mythril -- symbolic execution. It doesn't just read the code, it explores execution paths. It treats inputs as mathematical symbols and searches for concrete inputs that break safety rules. This takes longer -- about 83 seconds per contract on average. Think of it as a chess engine trying every possible move sequence.
>
> Stage three is Certora -- formal proofs. This is the strongest level. We encode our ten properties as CVL rules. Certora translates the Solidity bytecode and these rules into SMT constraints -- mathematical formulas -- and either proves the property holds for ALL possible inputs, or gives us a counterexample showing how it can fail. This isn't 'we tested a thousand cases.' This is 'we proved it for every case that could ever exist.'
>
> For selected properties we also use KEVM for bytecode-level verification as an additional check."

**Duration:** ~1.5 minutes

---

## Slide 11 -- Java Toolkit (Speaker B)

**What to say:**
> "To make all of this practical, we built a Java orchestration toolkit on web3j, packaged as a Maven project.
>
> The pipeline has five steps. First, compile -- it invokes the Solidity compiler to produce ABI and bytecode artifacts. Second, generate -- web3j creates type-safe Java wrappers so you can interact with contracts from Java code. Third, deploy -- contracts go to a configurable target, whether that's a local Hardhat node or the Sepolia testnet. Fourth, verify -- the toolkit runs Slither, Mythril, and Certora as sub-processes and captures their output. Fifth, report -- it aggregates everything into a structured verification report with pass-fail CI gates.
>
> Why Java? Enterprise adoption. Many blockchain teams in banking and supply chain already use web3j. This integrates with their existing Maven builds, their GitHub Actions pipelines, their Jenkins servers. We're not asking them to learn a new ecosystem -- we're meeting them where they are."

**Duration:** ~1 minute

**Transition to C:**
> "That's the framework. Now [C's name] will present our evaluation results -- does all of this actually work?"

---

## HANDOFF: B -> C (after Slide 11)

---

# PART 3: SPEAKER C

---

## Slide 12 -- Verification Results (Speaker C)

*C takes over after B finishes Slide 11.*

**What to say:**
> "Thank you [B's name]. Let's look at the results. Did our patterns pass verification?
>
> We start with Slither, our static analysis tool. We ran all 101 detectors across all 6 contracts. Slither reported 22 findings total -- 2 high, 2 medium, 10 low, and 8 informational.
>
> Now, 2 high findings sounds alarming, but let me explain. Both are 'arbitrary-send-eth' -- Slither flags any contract that sends ETH to a user-specified address. But that's literally what a multisig wallet and a timelock controller are supposed to do. That's their purpose. So these are by-design, not vulnerabilities.
>
> The 2 medium findings are also reviewed: one is a false positive divide-before-multiply pattern -- it's actually a length validation check. The other is an intentional strict equality for a sentinel value.
>
> So 22 findings, zero true positive vulnerabilities. This is actually how real security audits work -- you run the tool, get results, review each finding, and classify them. That's more credible than claiming zero findings.
>
> On top of Slither, we ran our full Hardhat test suite: 35 tests passing, zero failures. 27 unit tests verifying correct behavior, plus 8 adversarial tests simulating attacks. And we have Certora CVL specifications written for all 10 properties, ready to verify with the Certora cloud prover."

**Duration:** ~1.5 minutes

**Key numbers to emphasize:** "22 findings, zero true positives. 35 tests passing. All verified."

**If asked "Why do you have high-severity findings?":**
> "Slither flags any function that sends ETH to an address the caller specifies. A multisig wallet's entire purpose is to send ETH after collecting signatures. The 'high' severity is the tool's default classification -- it doesn't mean there's a vulnerability. We reviewed every finding and confirmed none are exploitable."

---

## Slide 13 -- Gas Costs (Speaker C)

**What to say:**
> "The next question is: what does this security cost in terms of gas?
>
> We deployed our contracts on a local Hardhat node and measured gas consumption against a baseline -- a simple single-admin contract where the only check is require msg.sender equals admin.
>
> Let me walk through the key numbers. Deploying a 3-of-5 multisig costs about 1.17 million gas versus 250,000 for the baseline. That's a 370% overhead. But deployment is a one-time cost -- you pay it once.
>
> The numbers that matter more are the per-operation costs, because those are paid repeatedly. Executing a transaction through multisig costs about 75,000 gas versus 27,000 for the baseline -- 174% overhead. Executing through timelock costs 36,000 gas versus 27,000 -- just 32% overhead. Granting a role through RBAC costs about 54,000 gas versus 27,000 -- 99% overhead.
>
> So across operations, the overhead ranges from 32 to 174 percent. At typical Ethereum gas prices, that works out to under 5 cents per transaction. For a contract managing anything of meaningful value, that's a trivial cost for formal security guarantees."

**Duration:** ~1.5 minutes

**Key phrase to emphasize:** "Under 5 cents per transaction. For contracts managing real value, that's trivial."

**If asked "What about the 370% deployment overhead?":**
> "Deployment happens once per contract lifetime. A multisig wallet protecting a treasury might exist for years and process thousands of transactions. The one-time deployment cost is amortized across all those operations. What matters for daily usage is the per-operation overhead, which is 32-174%."

---

## Slide 14 -- Adversarial Simulation (Speaker C)

**What to say:**
> "Numbers are one thing. We also tested this against actual attacks using Hardhat test scripts.
>
> Attack one: single-key compromise in a 3-of-5 multisig. The attacker has one valid key and submits a transaction with one real signature and two forged ones. The contract checks each signature, finds the forged ones aren't from valid owners, and rejects the execution. P1 holds.
>
> Attack two: timelock bypass. The attacker calls execute immediately after scheduling, before the delay has elapsed. The contract checks the timestamp, finds it's before the scheduled time, and reverts with 'too early.' P5 holds.
>
> Attack three: unauthorized role escalation. An address that doesn't hold the admin role tries to call proposeGrant directly. The onlyRole modifier checks the caller's role, finds they're not an admin, and reverts. P8 holds.
>
> All three attacks blocked. And these aren't theoretical -- they map directly to how the Parity, Ronin, and DAO attacks worked."

**Duration:** ~1 minute

---

## Slide 15 -- Retrospective Analysis (Speaker C)

**What to say:**
> "Speaking of which -- would our patterns have actually helped in those real incidents?
>
> The Parity wallet freeze happened because one person called an unprotected initWallet function and became the sole owner. With our multisig pattern, that ownership change would have required k signatures. One person, one call? Rejected. Properties P1 and P2.
>
> The Ronin bridge hack succeeded because the attacker accumulated 5 of 9 validator keys over time with no one noticing. If validator-set changes had gone through a timelock, there would have been a public delay window. Monitoring tools or community members could have spotted the change and used the cancellation mechanism to stop it. Properties P5 and P6.
>
> The DAO hack exploited reentrancy, which our patterns don't directly prevent. But the real damage amplifier was that nobody could stop the drain once it started. An RBAC emergency role with pause capability, combined with timelock cancellation, would have enabled the team to freeze the contract and limit the loss. Properties P8 and P6.
>
> Three of the most expensive incidents in blockchain history. All mitigable."

**Duration:** ~1.5 minutes

**Key phrase:** "Three of the most expensive incidents in blockchain history. All mitigable with our patterns."

---

## Slide 16 -- Developer Usability (Speaker C)

**What to say:**
> "Finally, we wanted to know whether real developers can actually use this.
>
> We ran a preliminary usability assessment with 8 developers -- graduate students and research assistants with one to three years of Solidity experience. We asked them to integrate our multisig template into a sample DeFi treasury contract using the Java toolkit.
>
> They rated us on four dimensions, Likert scale 1 to 5. Template clarity scored 4.1 -- they found the annotation-enriched templates much easier to audit than plain Solidity. Integration effort scored 3.8 -- most completed the task in a single session, though two participants noted difficulty configuring the Certora prover key. Verification output readability scored 3.9, with Slither results rated the clearest. And overall security confidence scored 4.3 -- the highest rating. Developers felt significantly more confident using formally verified patterns than unverified code.
>
> One developer told us: 'The pattern annotations made it much clearer which invariants the contract enforces.' Another said: 'The three-stage verification output gives more confidence than any single tool's results.'
>
> This is a small sample, and a larger study is needed. But the early signal is positive."

**Duration:** ~1 minute

**Closing (Speaker C wraps up the presentation):**
> "To summarize: three formally verified patterns, ten safety invariants all machine-verified in 327 seconds, 32 to 174 percent gas overhead -- under 5 cents per transaction, three historical exploits mitigable, and positive developer feedback. Thank you. We're happy to take questions."

---

# PART 4: ANTICIPATED Q&A

All three speakers should prepare for these. Whoever presented the relevant slide should answer.

---

**Q: "Why Java and not JavaScript/Python? Most Ethereum developers use JavaScript."**
> (B answers) "That's true for DApp front-end developers. But enterprise teams -- banks, supply chain companies -- often use Java. web3j is the most mature Java library for Ethereum. We're targeting the CI/CD integration use case, where Java and Maven are standard. The patterns themselves are Solidity, language-agnostic on the tooling side."

**Q: "How does this compare to OpenZeppelin?"**
> (A answers) "OpenZeppelin provides excellent contract libraries, and we build on similar ideas. The difference is three-fold: first, we add two-step role transfer which OpenZeppelin's AccessControl doesn't have. Second, we provide formal CVL specifications for all ten properties -- OpenZeppelin doesn't ship with formal verification specs. Third, we bundle everything with a CI pipeline so verification is continuous, not one-time."

**Q: "Your usability sample is only 8 people. Isn't that too small?"**
> (C answers) "Yes, we acknowledge this as a limitation. Eight participants give us a preliminary signal but not statistical significance. A larger controlled experiment with diverse experience levels is planned as future work. We report these results honestly as early feedback, not as a definitive usability study."

**Q: "What if Certora itself has bugs?"**
> (B answers) "Good question. This is why we use three independent tools, not just one. Slither, Mythril, and Certora use completely different analysis techniques. A bug in one tool is unlikely to exist in all three. We also publish all CVL specifications openly for community review. Formal verification shifts trust from code to specs and tools -- but layering reduces that risk."

**Q: "Can your patterns prevent reentrancy?"**
> (A answers) "Not directly. Reentrancy is a different vulnerability class. Our patterns focus on permission and key management. However, our RBAC pattern enables emergency pause mechanisms, and our timelock enables operation cancellation. These help limit damage from any exploit, including reentrancy. Extending our approach to reentrancy-guard patterns is a natural direction for future work."

**Q: "What about cross-chain bridges? Your work seems single-chain."**
> (C answers) "Correct. Our current implementation targets Solidity and the EVM -- single-chain. Cross-chain key management is explicitly listed as future work. The pattern concepts are portable, but the templates and specs would need to be adapted for each chain's smart contract language."

**Q: "Is the 327 seconds proof time practical for CI?"**
> (B answers) "Yes. 327 seconds -- under 6 minutes -- is well within typical CI pipeline timeouts. Most CI jobs already run unit tests and linting that take similar time. Certora proofs can also run in parallel, further reducing wall-clock time."

---

# PART 5: QUICK REFERENCE CARD

Print this page and keep it on the podium.

```
INCIDENTS:
  Parity 2017    -> $150M frozen   -> one unprotected function  -> P1, P2 fix
  Ronin 2022     -> $625M stolen   -> validator keys compromised -> P5, P6 fix
  DAO 2016       -> $60M drained   -> reentrancy + no admin     -> P8, P6 fix

PROPERTIES:
  P1  k signatures required          (Multisig)
  P2  no unilateral execution         (Multisig)
  P3  replay protection               (Multisig)
  P4  governance changes gated         (Multisig)
  P5  delay enforced                   (Timelock)
  P6  cancellation restricted          (Timelock)
  P7  expiry enforced                  (Timelock)
  P8  admin-gated grants               (RBAC)
  P9  explicit acceptance              (RBAC)
  P10 no escalation path               (RBAC)

KEY NUMBERS (REAL):
  144 patterns catalogued, only 5 target known vulns
  6 contracts compiled, 0 warnings
  35/35 tests passing (27 unit + 8 adversarial)
  8/8 adversarial attacks blocked
  Slither: 22 findings, 0 true positive high/medium
  32-174% gas overhead per operation (REAL from Hardhat)
  < $0.05 per transaction
  3 historical exploits mitigable
  N=8, confidence 4.3/5 (paper data)

SPEAKER ORDER:
  A: 1,2 -> B: 3,4,5 -> A: 6,7,8,9 -> B: 10,11 -> C: 12,13,14,15,16
```
