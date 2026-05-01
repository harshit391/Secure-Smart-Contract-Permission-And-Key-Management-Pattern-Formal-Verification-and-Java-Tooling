# Plagiarism & AI Content Check -- Section-by-Section Checklist

> **How to use:** Go through each topic below one by one. Copy the relevant
> section text from `main.tex` into your plagiarism checker (Turnitin / iThenticate)
> and AI detector (GPTZero / ZeroGPT / Originality.ai) **separately**.
> Mark status after checking. Fix flagged parts before final submission.

---

## Recommended Tools

| Purpose | Free Tools | Paid / Institutional |
|---------|-----------|---------------------|
| Plagiarism | Quetext, SmallSEOTools, Duplichecker | **Turnitin** (via university), iThenticate |
| AI Detection | GPTZero, ZeroGPT, Sapling.ai | Originality.ai, Copyleaks |
| Paraphrasing help | QuillBot (manual rewrite mode) | Wordtune |

**Important:** Run checks on **plain text**, not LaTeX. Strip all `\cite{}`, `\ref{}`,
`\textbf{}`, math `$...$`, and formatting commands before pasting. Just paste the
English sentences.

---

## Section-by-Section Checklist

### 1. Abstract (Lines 93-121 in main.tex)

- [ ] **Plagiarism check** -- paste full abstract text
- [ ] **AI detection check** -- paste full abstract text
- [ ] **Risk level: HIGH** -- Abstracts get the most scrutiny from reviewers

**What to watch for:**
- Phrases like "remain a leading cause of catastrophic" -- generic phrasing AI detectors flag
- Statistics ($150M, $625M) -- make sure these are cited, not presented as original claims
- The "contribution list" structure is common in AI text -- rewrite in your own voice

**How to fix if flagged:**
- Rewrite the opening 2 sentences in your own words describing the problem
- Use specific numbers and your own framing ("our three patterns guarantee...")
- Break up long sentences into shorter, more natural ones

---

### 2. Introduction -- Problem Statement (Lines 131-143)

- [ ] **Plagiarism check**
- [ ] **AI detection check**
- [ ] **Risk level: MEDIUM**

**Text to check:**
> "Smart contracts on programmable blockchains ... inadequate key and permission management."

**What to watch for:**
- The Parity and Ronin incident descriptions -- make sure you're not copying exact phrasing from news articles or the Parity postmortem
- Dollar amounts and dates must have citations

**How to fix if flagged:**
- Rewrite incident descriptions in your own words
- Add your own interpretation ("This single vulnerability rendered $150M permanently inaccessible")

---

### 3. Introduction -- Gap Analysis (Lines 145-175)

- [ ] **Plagiarism check**
- [ ] **AI detection check**
- [ ] **Risk level: HIGH** -- This summarizes other papers, high plagiarism risk

**Text to check:**
> "A natural response is to apply well-known design patterns ... formally verified permission systems."

**What to watch for:**
- When describing what Azimi, Six, Lu, Park, Antonino etc. did -- you're paraphrasing their abstracts, which plagiarism tools will match against the originals
- Specific numbers from other papers (144 patterns, 36 security, 120 patterns) -- these are facts and OK, but surrounding sentences must be your own words

**How to fix if flagged:**
- Don't just rephrase their abstract -- describe what THEY found in YOUR framing
- Example: Instead of copying "catalogued 144 unique patterns across four categories" → write "Their analysis identified 144 distinct patterns, though security was addressed by fewer than a quarter of them"

---

### 4. Introduction -- Contributions (Lines 177-195)

- [ ] **Plagiarism check**
- [ ] **AI detection check**
- [ ] **Risk level: MEDIUM** -- Contribution lists have a standard structure

**Text to check:**
> "In this paper we bridge these three bodies of work ... usability assessment."

**What to watch for:**
- Numbered contribution lists are extremely common in AI-generated papers
- Phrases like "annotation-enriched Solidity templates" and "multi-stage verification pipeline" sound technical but could flag as AI

**How to fix if flagged:**
- Make contribution statements more specific and less templated
- Add a concrete number or result to each point ("ten safety invariants, all machine-verified in under 6 minutes")

---

### 5. Related Work -- Section II-A: Design Patterns (Lines 209-241)

- [ ] **Plagiarism check**
- [ ] **AI detection check**
- [ ] **Risk level: HIGHEST** -- Directly summarizing other papers

**Text to check:**
> "Azimi et al. conducted the most recent systematic review ... security or permission patterns."

**What to watch for:**
- Every paragraph summarizes a different paper -- plagiarism tools WILL match phrases against the original papers
- Phrases taken from paper abstracts (e.g., "120 blockchain patterns organized into on-chain and on/off-chain meta-categories")

**How to fix if flagged:**
- For each paper, write ONE sentence about what they did, ONE sentence about the gap relative to YOUR work
- Use your own sentence structure, don't mirror the original authors' phrasing
- Focus on what they DIDN'T do (which is your contribution)

---

### 6. Related Work -- Section II-B: Formal Verification (Lines 244-277)

- [ ] **Plagiarism check**
- [ ] **AI detection check**
- [ ] **Risk level: HIGH**

**Text to check:**
> "Tolmach et al. provide the most comprehensive survey ... treats formally verified invariants as the authoritative description of each permission pattern."

**What to watch for:**
- Descriptions of Move Prover, "Specification is Law" paradigm -- these are established terms, but your surrounding sentences must be original
- "combined top-down and bottom-up methodology" is likely from Park et al.'s paper directly

**How to fix if flagged:**
- Replace borrowed phrasing with your own interpretation
- Instead of describing their methodology in their words, describe what the RESULT means for your work

---

### 7. Related Work -- Sections II-C, II-D (Lines 279-315)

- [ ] **Plagiarism check**
- [ ] **AI detection check**
- [ ] **Risk level: HIGH**

**Text to check:**
> "Wu et al. proposed a smart-contract-based secret key sharing scheme ... on-chain administrative permission patterns."

**What to watch for:**
- "Shamir's Secret Sharing" is a standard term (OK to use)
- "three use cases: wallet security, seizure of illicit crypto-assets, and digital-asset inheritance" -- likely from Wu et al.'s paper directly
- "symmetric-key encryption protocol for securing data in off-chain storage" -- likely from Goint et al.

**How to fix if flagged:**
- Condense to 1-2 sentences per paper using your own framing
- Focus on the GAP: "Wu et al. address key custody but not continuous permission management"

---

### 8. Related Work -- Comparison Table & Summary (Lines 317-351)

- [ ] **Plagiarism check** -- check the summary paragraph only (table is data)
- [ ] **AI detection check**
- [ ] **Risk level: LOW** -- Tables aren't checked; summary paragraph is short

---

### 9. Threat Model -- Section III (Lines 354-391)

- [ ] **Plagiarism check**
- [ ] **AI detection check**
- [ ] **Risk level: MEDIUM**

**Text to check:**
> "We consider a smart-contract system governed by ... physical-layer attacks on key holders."

**What to watch for:**
- Threat model language is inherently formulaic ("The adversary's goal is to...")
- Property definitions (P1-P10) should be original -- these are YOUR formal contributions
- "Minority-key compromise" and "Governance attack" are standard threat categories

**How to fix if flagged:**
- This section is mostly original definitions -- low plagiarism risk
- If AI-flagged: add more specific language tied to your contracts ("In our MultiSigWallet, this means...")

---

### 10. Design Patterns -- Section IV-A: Multisig (Lines 405-454)

- [ ] **Plagiarism check**
- [ ] **AI detection check**
- [ ] **Risk level: MEDIUM**

**What to watch for:**
- The concept of off-chain signing + on-chain verification is well-documented (Gnosis Safe, OpenZeppelin)
- Code listings (Listing 1) are YOUR code -- low plagiarism risk, but check that descriptions around them don't echo OpenZeppelin docs
- "monotonically increasing nonce" and "ecrecover" are standard terms (OK)

**How to fix if flagged:**
- Emphasize what's different about YOUR implementation vs OpenZeppelin
- Add references to design decisions you made ("We chose sorted signature verification over mapping-based deduplication for gas efficiency")

---

### 11. Design Patterns -- Section IV-B: Timelock (Lines 457-499)

- [ ] **Plagiarism check**
- [ ] **AI detection check**
- [ ] **Risk level: MEDIUM**

**Same approach as multisig above.** Watch for phrasing borrowed from OpenZeppelin's TimelockController documentation.

---

### 12. Design Patterns -- Section IV-C: RBAC (Lines 502-533)

- [ ] **Plagiarism check**
- [ ] **AI detection check**
- [ ] **Risk level: MEDIUM**

**What to watch for:**
- OpenZeppelin's AccessControl contract has similar concepts -- don't echo their docs
- "Two-step transfer mechanism (propose → accept)" is your design choice -- frame it as such

---

### 13. Design Patterns -- Section IV-D: Composition (Lines 536-545)

- [ ] **Plagiarism check**
- [ ] **AI detection check**
- [ ] **Risk level: LOW** -- Short, mostly original architecture description

---

### 14. Verification & Toolchain -- Section V-A: Pipeline (Lines 553-577)

- [ ] **Plagiarism check**
- [ ] **AI detection check**
- [ ] **Risk level: MEDIUM-HIGH**

**What to watch for:**
- Tool descriptions (Slither, Mythril, Certora) may echo their official papers or docs
- "intra- and inter-procedural data-flow analysis" is likely from Slither's paper
- "explores execution paths up to a configurable depth" is standard Mythril description

**How to fix if flagged:**
- Keep tool descriptions to 1 sentence each
- Focus on WHY you chose each tool and HOW they complement each other
- That's your original contribution, not the tool descriptions themselves

---

### 15. Verification & Toolchain -- Section V-B: Java Toolkit (Lines 580-602)

- [ ] **Plagiarism check**
- [ ] **AI detection check**
- [ ] **Risk level: LOW** -- Describes YOUR tool, mostly original

---

### 16. Evaluation -- Section VI-A: Verification Results (Lines 610-643)

- [ ] **Plagiarism check**
- [ ] **AI detection check**
- [ ] **Risk level: LOW** -- Mostly tables and numbers (your data)

**Note:** Tables with numbers are not plagiarism-checkable. Only check the prose paragraphs.

---

### 17. Evaluation -- Section VI-B: Adversarial Simulation (Lines 646-664)

- [ ] **Plagiarism check**
- [ ] **AI detection check**
- [ ] **Risk level: LOW** -- Describes YOUR test scenarios

---

### 18. Evaluation -- Section VI-C: Gas Profiling (Lines 667-690)

- [ ] **Plagiarism check**
- [ ] **AI detection check**
- [ ] **Risk level: LOW** -- YOUR measured data

---

### 19. Evaluation -- Section VI-D: Developer Usability (Lines 693-725)

- [ ] **Plagiarism check**
- [ ] **AI detection check**
- [ ] **Risk level: MEDIUM**

**What to watch for:**
- Usability study methodology language can sound templated
- Likert scale descriptions are standard but may flag AI detectors

**How to fix if flagged:**
- Add specific details about YOUR study setup (where, when, who)
- Include real participant quotes if possible

---

### 20. Evaluation -- Section VI-E: Retrospective Analysis (Lines 728-773)

- [ ] **Plagiarism check**
- [ ] **AI detection check**
- [ ] **Risk level: MEDIUM**

**What to watch for:**
- Descriptions of Parity, Ronin, DAO incidents -- many articles describe these, phrases may match
- Make sure you cite the incident reports and write your own analysis of HOW your patterns help

---

### 21. Discussion -- Section VII (Lines 778-744)

- [ ] **Plagiarism check**
- [ ] **AI detection check**
- [ ] **Risk level: MEDIUM**

**What to watch for:**
- Limitation discussions are inherently templated ("Our work is limited to...")
- "Implications" paragraph may flag AI -- make it specific to your results

---

### 22. Conclusion -- Section VIII (Lines 749-766)

- [ ] **Plagiarism check**
- [ ] **AI detection check**
- [ ] **Risk level: MEDIUM**

**What to watch for:**
- Conclusions that merely restate the abstract -- very common AI pattern
- Future work items should be specific, not generic ("investigating zero-knowledge proofs" is specific -- good)

---

## General Tips for Reducing AI Detection Scores

1. **Vary sentence length.** AI tends to write uniform medium-length sentences. Mix short punchy sentences with longer complex ones.

2. **Use first person strategically.** "We observed that..." sounds more human than "It was observed that..."

3. **Add domain-specific jargon naturally.** AI detectors trust text with natural technical vocabulary more than text with perfectly smooth transitions.

4. **Break the "claim → evidence → implication" pattern.** AI text follows this structure robotically. Occasionally lead with the evidence or the implication.

5. **Include imperfect hedging.** Phrases like "we believe", "our preliminary results suggest", "to the best of our knowledge" are natural in academic writing and less common in AI text.

6. **Reference specific details from YOUR work.** "As shown in Listing 1, line 8" or "Table III row 3" -- these specific internal references are hard for AI to generate and signal originality.

7. **Don't paraphrase AI output -- rewrite from scratch.** If a section is flagged, don't just swap synonyms. Close the paper, understand the point, and write it fresh in your own words.

---

## Tracking Sheet

| # | Section | Plagiarism | AI Check | Risk | Status |
|---|---------|-----------|----------|------|--------|
| 1 | Abstract | [ ] | [ ] | HIGH | Pending |
| 2 | Intro -- Problem | [ ] | [ ] | MED | Pending |
| 3 | Intro -- Gap | [ ] | [ ] | HIGH | Pending |
| 4 | Intro -- Contributions | [ ] | [ ] | MED | Pending |
| 5 | Related Work -- Patterns (II-A) | [ ] | [ ] | HIGHEST | Pending |
| 6 | Related Work -- Verification (II-B) | [ ] | [ ] | HIGH | Pending |
| 7 | Related Work -- Key Mgmt (II-C, II-D) | [ ] | [ ] | HIGH | Pending |
| 8 | Related Work -- Summary Table (II-E) | [ ] | [ ] | LOW | Pending |
| 9 | Threat Model (III) | [ ] | [ ] | MED | Pending |
| 10 | Patterns -- Multisig (IV-A) | [ ] | [ ] | MED | Pending |
| 11 | Patterns -- Timelock (IV-B) | [ ] | [ ] | MED | Pending |
| 12 | Patterns -- RBAC (IV-C) | [ ] | [ ] | MED | Pending |
| 13 | Patterns -- Composition (IV-D) | [ ] | [ ] | LOW | Pending |
| 14 | Verification -- Pipeline (V-A) | [ ] | [ ] | MED-HIGH | Pending |
| 15 | Verification -- Java Toolkit (V-B) | [ ] | [ ] | LOW | Pending |
| 16 | Eval -- Verification Results (VI-A) | [ ] | [ ] | LOW | Pending |
| 17 | Eval -- Adversarial Sim (VI-B) | [ ] | [ ] | LOW | Pending |
| 18 | Eval -- Gas Profiling (VI-C) | [ ] | [ ] | LOW | Pending |
| 19 | Eval -- Usability (VI-D) | [ ] | [ ] | MED | Pending |
| 20 | Eval -- Retrospective (VI-E) | [ ] | [ ] | MED | Pending |
| 21 | Discussion (VII) | [ ] | [ ] | MED | Pending |
| 22 | Conclusion (VIII) | [ ] | [ ] | MED | Pending |

**Priority order:** Start with #5, #6, #7 (Related Work -- highest risk), then #1 (Abstract), then #3 (Intro Gap), then everything else.

---

*Created: 2026-03-13*
