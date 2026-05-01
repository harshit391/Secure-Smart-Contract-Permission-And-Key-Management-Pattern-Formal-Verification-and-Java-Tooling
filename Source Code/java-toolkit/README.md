# Java Verification Orchestration Toolkit

A Maven-based Java CLI tool that orchestrates the full smart-contract verification pipeline: compile, deploy, run static analysis (Slither), symbolic execution (Mythril), formal verification (Certora), and generate consolidated reports.

## Prerequisites

| Requirement | Version |
|-------------|---------|
| Java | 17+ |
| Maven | 3.8+ |
| Node.js | 18+ (for Hardhat compilation) |
| Python | 3.8+ (for Slither / Mythril / Certora CLI) |

External tools (must be on `PATH`):
- `slither` -- `pip install slither-analyzer`
- `myth` -- `pip install mythril`
- `certoraRun` -- `pip install certora-cli` (requires `CERTORAKEY` env var)

## Build

```bash
cd java-toolkit
mvn clean compile
```

## Usage

```bash
# Run with default configuration (analyzes ../contracts against ../specs)
mvn exec:java

# Pass a properties file
mvn exec:java -Dexec.args="pipeline.properties"

# Override individual settings via system properties
mvn exec:java -Dnetwork=sepolia -Dmythril.depth=5
```

## Configuration

Settings can be provided via a `pipeline.properties` file or `-D` system properties:

| Property | Default | Description |
|----------|---------|-------------|
| `contracts.dir` | `../contracts` | Path to Solidity source files |
| `specs.dir` | `../specs` | Path to Certora CVL spec files |
| `output.dir` | `../reports` | Directory for generated reports |
| `network` | `local` | Target network (`local`, `sepolia`) |
| `mythril.depth` | `3` | Mythril transaction depth |

## Pipeline Stages

1. **Compile** -- Invokes `npx hardhat compile`
2. **Deploy** -- Deploys contracts via web3j to the configured network
3. **Slither** -- Static analysis on each contract
4. **Mythril** -- Symbolic execution on each contract
5. **Certora** -- Formal verification against CVL specs
6. **Report** -- Generates JSON + text reports in the output directory

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | All properties verified, no high-severity findings |
| `1` | At least one failure detected |

## Project Structure

```
java-toolkit/
├── pom.xml
└── src/main/java/edu/chitkara/scverify/
    ├── VerificationPipeline.java   # Main orchestration entry point
    ├── SlitherRunner.java          # Slither CLI integration
    ├── MythrilRunner.java          # Mythril CLI integration
    ├── CertoraRunner.java          # Certora CLI integration
    ├── DeploymentManager.java      # Web3j contract deployment
    ├── ReportGenerator.java        # HTML/JSON report generation
    ├── Finding.java                # Finding data model
    └── VerificationResult.java     # Verification result model
```
