# Final Evaluation TODO -- Detailed Guide

---

## 1. Run Certora Prover (MUST DO)

### What is this?
Certora is a cloud-based formal verification tool. You send your Solidity contracts + CVL spec files to their cloud, and it mathematically proves (or disproves) that your properties P1-P10 hold for ALL possible inputs. Your specs are already written in `implementation/specs/`.

### Step-by-step

```bash
# Step 1: Navigate to implementation folder
cd ~/ResearchPaper

# Step 2: Create .env file with your Certora key
cp .env.example .env
# Then open .env and replace "your_certora_api_key" with your real key:
#   CERTORAKEY=paste_your_actual_key_here

# Step 3: Install Certora CLI (one-time)
pip3 install certora-cli

# Step 4: Verify installation
certoraRun --version

# Step 5: Run verification for each contract separately
# --- MultiSigWallet (P1, P2, P3, P4) ---
certoraRun contracts/MultiSigWallet.sol \
  --verify MultiSigWallet:specs/multisig.spec \
  --solc solc \
  --optimistic_loop \
  --loop_iter 3 \
  --packages @openzeppelin/contracts=node_modules/@openzeppelin/contracts \
  --msg "MultiSig P1-P4"

# --- TimelockController (P5, P6, P7) ---
certoraRun contracts/TimelockController.sol \
  --verify TimelockController:specs/timelock.spec \
  --solc solc \
  --optimistic_loop \
  --loop_iter 3 \
  --packages @openzeppelin/contracts=node_modules/@openzeppelin/contracts \
  --msg "Timelock P5-P7"

# --- RBACManager (P8, P9, P10) ---
certoraRun contracts/RBACManager.sol \
  --verify RBACManager:specs/rbac.spec \
  --solc solc \
  --optimistic_loop \
  --loop_iter 3 \
  --packages @openzeppelin/contracts=node_modules/@openzeppelin/contracts \
  --msg "RBAC P8-P10"
```

### What to expect
- Each command uploads to Certora cloud and gives you a **web link** (e.g., `https://prover.certora.com/output/...`)
- Open the link in browser -- it shows each rule as PASS/FAIL with time taken
- Screenshot or note down:
  - **Result**: Verified / Violated / Timeout for each rule
  - **Time**: seconds per rule (shown on the results page)

### What to record
For each property (P1 through P10), note:
- Rule name (e.g., `authorizationRequiresKSignatures`)
- Result (should say "Verified")
- Time in seconds

### Where to update in the paper (`paper/main.tex`)

**Table II (lines 675-686):** Replace projected times with real ones:
```latex
P1  & MultiSig  & Certora & Verified & <REAL_TIME> \\
P2  & MultiSig  & Certora & Verified & <REAL_TIME> \\
...
\multicolumn{4}{l}{\textbf{Total}} & \textbf{<REAL_TOTAL>} \\
```

**Line 890 (Conclusion):** Update total time:
```
total Certora proof time: 327\,s  -->  total Certora proof time: <REAL_TOTAL>\,s
```

### Troubleshooting
- **"solc not found"**: Certora needs `solc` binary. Install with: `pip3 install solc-select && solc-select install 0.8.20 && solc-select use 0.8.20`
- **"CERTORAKEY not set"**: Make sure `.env` has your key, or export it: `export CERTORAKEY=your_key`
- **Timeout on P10**: P10 (noEscalationPath) involves cross-function reasoning. If it times out, that's normal -- note it as "Timeout (bounded)" in the paper, which is already acknowledged in CLAUDE_CONTEXT
- **Rule fails (counterexample)**: The Certora link will show a concrete counterexample. This means a bug in the contract -- read the counterexample trace carefully

---

## 2. Run Mythril (MUST DO -- pick Option A or B)

### What is this?
Mythril is a symbolic execution tool. It explores all possible execution paths in your contract up to a configurable depth and looks for security vulnerabilities (reentrancy, integer overflow, unauthorized access, etc.).

### Option A: Install and Run Mythril (preferred -- gives real data)

```bash
# Step 1: Install Visual C++ Build Tools (REQUIRED on Windows)
# Download from: https://visualstudio.microsoft.com/visual-cpp-build-tools/
# During install, check "Desktop development with C++"
# This is ~6 GB -- takes a while

# Step 2: Install Mythril
pip3 install mythril

# Step 3: Verify
myth version

# Step 4: Run against each contract
cd ~/ResearchPaper

# --- MultiSigWallet ---
myth analyze contracts/MultiSigWallet.sol \
  --solc-json mythril-solc.json \
  --execution-timeout 120 \
  --max-depth 3 \
  -o json > reports/mythril-multisig.json
# Note the time it takes (use a stopwatch or `time` command)

# --- TimelockController ---
myth analyze contracts/TimelockController.sol \
  --solc-json mythril-solc.json \
  --execution-timeout 120 \
  --max-depth 3 \
  -o json > reports/mythril-timelock.json

# --- RBACManager ---
myth analyze contracts/RBACManager.sol \
  --solc-json mythril-solc.json \
  --execution-timeout 120 \
  --max-depth 3 \
  -o json > reports/mythril-rbac.json
```

You may need a `mythril-solc.json` file for remappings:
```json
{
  "remappings": [
    "@openzeppelin/contracts=node_modules/@openzeppelin/contracts"
  ]
}
```

**What to record:**
- Number of issues found per contract (expect 0 critical, possibly same warnings as Slither)
- Time per contract in seconds
- Save JSON output in `reports/`

**Where to update in paper:**
Line 689 (Table II footnote):
```
Mythril (depth=3): 0 exploitable paths (avg. 83s per contract)
-->
Mythril (depth=3): 0 exploitable paths (avg. <REAL_AVG>s per contract)
```

### Option B: Fix wording without running Mythril

If you can't install Mythril (C++ Build Tools too heavy), change line 689 in `main.tex` from:

```latex
% CURRENT (claims measured data):
\multicolumn{5}{l}{\footnotesize Mythril (depth\,=\,3): 0 exploitable paths (avg.\ 83\,s per contract).}
```

To:

```latex
% HONEST (describes pipeline design):
\multicolumn{5}{l}{\footnotesize Mythril (depth\,=\,3) is configured as Stage~2 for symbolic path exploration.}
```

And in Section V-A Stage 2 paragraph (lines 616-620), make sure it reads as pipeline design, not as measured results.

---

## 3. Compile LaTeX and Verify (MUST DO)

### What is this?
You need to compile `main.tex` into a PDF to check page count (must be 6-8 for IEEE), table rendering, and code listing formatting.

### Option A: Overleaf (easiest)

```
1. Go to https://www.overleaf.com (sign up free if needed)
2. Click "New Project" -> "Upload Project"
3. Create a zip with ONLY these two files:
     paper/main.tex
     paper/references.bib
4. Upload the zip
5. Overleaf auto-compiles -- check the PDF preview
```

### Option B: Local MiKTeX

```bash
# Install MiKTeX from https://miktex.org/download (Windows installer)
# Then:
cd ~/ResearchPaper/paper
pdflatex main.tex      # First pass (generates .aux)
bibtex main            # Process references
pdflatex main.tex      # Second pass (resolves citations)
pdflatex main.tex      # Third pass (resolves cross-refs)
# Open main.pdf
```

### What to check in the compiled PDF
1. **Page count**: Must be 6-8 pages. If over 8, you'll need to cut content. If under 6, the figures could help fill space.
2. **Tables**: All 4 tables (comparison, verification, gas, retrospective) should render cleanly without overflow
3. **Code listings**: The 3 Solidity listings should fit within single column width. If any line overflows, it will show as text running off the margin.
4. **References**: Should show [1] through [18] at the end. Check none say "??" (that means a `\cite{}` didn't resolve).
5. **No "??" anywhere**: Search for "??" in the PDF -- this indicates unresolved cross-references

---

## 4. Usability Study (SHOULD DO)

### What is this?
Section VI-D of the paper claims you conducted a usability study with 8 developers. Currently the numbers are projected (made up). You have two options.

### Option A: Run a real study (recommended)

**Who to ask:** 5-8 classmates/peers who know some Solidity (even basic).

**What to do:**
1. Give them: the `MultiSigWallet.sol` template + the Java toolkit README
2. Task: "Integrate this multisig template into a sample contract and run the verification pipeline"
3. After they finish, have them rate (1-5 scale):
   - **Template clarity**: "How easy was the annotated template to understand?"
   - **Integration effort**: "How easy was it to integrate the pattern?"
   - **Verification output readability**: "How clear was the Slither/verification output?"
   - **Overall security confidence**: "How confident are you in the security of the result?"
4. Ask for one sentence of qualitative feedback

**How to calculate:**
- Mean = sum of scores / number of participants
- Standard deviation (sigma) = use Excel `=STDEV()` or calculator

**Where to update:** Replace the numbers in `main.tex` lines 772-784 with real means and sigmas.

### Option B: Soften the wording

If you don't run the study, change line 765 from:
```
We conducted a preliminary usability assessment with 8
```
to something like:
```
We plan to conduct a usability assessment with 8
```
And add a note that this is future work. But this weakens the paper significantly.

---

## 5. Tone Consistency (SHOULD DO)

### What is this?
Sections I-III were rewritten in a conversational tone ("boom", "That one?", "some folks"). Sections IV-VIII use standard academic prose ("We provide an open-source Java toolkit..."). A reviewer might find the tonal shift jarring.

### Options
- **Unify to academic**: Rewrite Sections I-III to match IV-VIII's academic style. Safer for IEEE.
- **Unify to conversational**: Rewrite Sections IV-VIII to match I-III. Riskier -- some IEEE reviewers dislike informal writing.
- **Leave as-is**: The content is correct either way. Some reviewers won't notice.

### If rewriting
The file `guides/writing/RESEARCH_TEXT_ONLY.md` has all 47 text blocks. Blocks 24-47 (Sections IV-VIII) still have original academic prose. You can rewrite those to match the conversational tone of blocks 1-23, or rewrite blocks 1-23 back to academic.

---

## 6. Figures (OPTIONAL)

### What is this?
The paper has zero figures. IEEE papers don't require them, but figures make the paper more visually appealing and easier to follow. They also help fill pages if you're under 6 pages.

### Suggested figures (pick any)
1. **Architecture diagram**: Show the 3-layer composition (MultiSig -> Timelock -> RBAC) as boxes with arrows
2. **Pipeline flowchart**: Solidity code -> Slither -> Mythril -> Certora -> Report (3-stage pipeline)
3. **Gas comparison bar chart**: Side-by-side bars for baseline vs. pattern for each operation
4. **Threat model diagram**: Adversary capabilities mapped to which properties block them

### How to create
- **Canva/draw.io**: Create as PNG, include with `\includegraphics` in LaTeX
- **TikZ**: Write directly in LaTeX (harder but looks more professional)
- **Overleaf**: Has built-in draw.io integration

---

## 7. Ref 9 PDF (OPTIONAL)

### What is this?
Reference [9] (Takei & Shudo 2024) PDF failed to download. The file `references/ieee_10634356.pdf` is a 244-byte HTML stub, not a real PDF.

### How to get it
- Go to: `https://doi.org/10.1109/ICBC59979.2024.10634356`
- If you have IEEE Xplore access through Chitkara University, download from there
- If not, try Sci-Hub or ask your professor (Dr. Anshu Singla) for access

### Impact if you don't get it
None for the paper itself. The bib entry is complete with title, authors, venue, year, and DOI. The paper will compile and cite correctly. You just won't have the PDF for your own reading/reference.

---

*Created: 2026-03-26*
