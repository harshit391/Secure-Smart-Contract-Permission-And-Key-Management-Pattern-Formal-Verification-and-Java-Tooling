package edu.chitkara.scverify;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.FileInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Properties;

/**
 * Main orchestrator for the smart-contract verification pipeline.
 *
 * <p>Execution stages:</p>
 * <ol>
 *   <li><b>Compile</b> — invokes {@code npx hardhat compile} on the project.</li>
 *   <li><b>Deploy</b>  — deploys contracts to the configured network via web3j.</li>
 *   <li><b>Slither</b> — runs static analysis on every contract.</li>
 *   <li><b>Mythril</b> — runs symbolic execution on every contract.</li>
 *   <li><b>Certora</b> — runs formal verification against CVL specs.</li>
 *   <li><b>Report</b>  — aggregates results and writes JSON + text reports.</li>
 * </ol>
 *
 * <p>Exit code semantics (for CI gate integration):</p>
 * <ul>
 *   <li>{@code 0} — all properties verified, no HIGH-severity findings</li>
 *   <li>{@code 1} — at least one failure detected</li>
 * </ul>
 *
 * <p>Configuration can be supplied via command-line arguments or a
 * {@code pipeline.properties} file.</p>
 */
public class VerificationPipeline {

    private static final Logger LOG = LoggerFactory.getLogger(VerificationPipeline.class);

    // ---- Default configuration ----
    private static final String DEFAULT_CONTRACTS_DIR = "../contracts";
    private static final String DEFAULT_SPECS_DIR     = "../specs";
    private static final String DEFAULT_OUTPUT_DIR    = "../reports";
    private static final String DEFAULT_NETWORK       = "local";
    private static final int    DEFAULT_MYTHRIL_DEPTH = 3;

    /** Contracts to analyse (filename without .sol). */
    private static final String[] CONTRACT_NAMES = {
            "MultiSigWallet",
            "TimelockController",
            "RoleBasedAccessControl",
            "GovernedMultiSig"
    };

    /** Mapping of contract name to its Certora spec file. */
    private static final Map<String, String> SPEC_MAP = Map.of(
            "MultiSigWallet",        "multisig.spec",
            "TimelockController",    "timelock.spec",
            "RoleBasedAccessControl", "rbac.spec",
            "GovernedMultiSig",      "governed.spec"
    );

    // ---- Instance fields ----
    private final Properties config;

    public VerificationPipeline(Properties config) {
        this.config = config;
    }

    // ==================================================================
    //  Main entry point
    // ==================================================================

    public static void main(String[] args) {
        LOG.info("========== Smart Contract Verification Pipeline ==========");

        try {
            Properties config = loadConfig(args);
            VerificationPipeline pipeline = new VerificationPipeline(config);
            boolean success = pipeline.run();

            if (success) {
                LOG.info("Pipeline completed: ALL PASS");
                System.exit(0);
            } else {
                LOG.warn("Pipeline completed: FAILURE DETECTED");
                System.exit(1);
            }
        } catch (Exception e) {
            LOG.error("Pipeline terminated with an unexpected error", e);
            System.exit(1);
        }
    }

    // ==================================================================
    //  Pipeline orchestration
    // ==================================================================

    /**
     * Executes the full verification pipeline and returns {@code true} if every
     * stage passes.
     */
    public boolean run() throws Exception {
        String contractsDir = config.getProperty("contracts.dir", DEFAULT_CONTRACTS_DIR);
        String specsDir     = config.getProperty("specs.dir",     DEFAULT_SPECS_DIR);
        String outputDir    = config.getProperty("output.dir",    DEFAULT_OUTPUT_DIR);
        String network      = config.getProperty("network",       DEFAULT_NETWORK);
        int mythrilDepth    = Integer.parseInt(
                config.getProperty("mythril.depth", String.valueOf(DEFAULT_MYTHRIL_DEPTH)));

        // ---- Stage 1: Compile ----
        LOG.info("[1/6] Compiling contracts...");
        compile(contractsDir);

        // ---- Stage 2: Deploy ----
        LOG.info("[2/6] Deploying contracts to '{}' network...", network);
        deploy(network);

        // ---- Stage 3: Slither ----
        LOG.info("[3/6] Running Slither static analysis...");
        SlitherRunner slitherRunner = new SlitherRunner();
        List<Finding> slitherFindings = runSlither(slitherRunner, contractsDir);

        // ---- Stage 4: Mythril ----
        LOG.info("[4/6] Running Mythril symbolic execution (depth={})...", mythrilDepth);
        MythrilRunner mythrilRunner = new MythrilRunner();
        List<Finding> mythrilFindings = runMythril(mythrilRunner, contractsDir, mythrilDepth);

        // ---- Stage 5: Certora ----
        LOG.info("[5/6] Running Certora formal verification...");
        CertoraRunner certoraRunner = new CertoraRunner();
        List<VerificationResult> certoraResults = runCertora(certoraRunner, contractsDir, specsDir);

        // ---- Stage 6: Report ----
        LOG.info("[6/6] Generating verification report...");
        ReportGenerator reportGen = new ReportGenerator();
        reportGen.generateReport(slitherFindings, mythrilFindings, certoraResults, outputDir);

        // Compute and return overall pass/fail
        boolean overallPass = reportGen.computeOverallPass(
                slitherFindings, mythrilFindings, certoraResults);

        printSummaryBanner(slitherFindings, mythrilFindings, certoraResults, overallPass);
        return overallPass;
    }

    // ==================================================================
    //  Stage implementations
    // ==================================================================

    /**
     * Compiles contracts by invoking {@code npx hardhat compile}.
     */
    private void compile(String contractsDir) throws IOException, InterruptedException {
        Path projectRoot = Path.of(contractsDir).getParent();
        if (projectRoot == null) {
            projectRoot = Path.of(".");
        }

        ProcessBuilder pb = new ProcessBuilder("npx", "hardhat", "compile");
        pb.directory(projectRoot.toFile());
        pb.inheritIO();

        Process process = pb.start();
        int exitCode = process.waitFor();

        if (exitCode != 0) {
            throw new RuntimeException("Hardhat compilation failed with exit code " + exitCode);
        }
        LOG.info("Compilation successful");
    }

    /**
     * Deploys all contracts to the specified network.
     */
    private void deploy(String network) throws Exception {
        String propsPath = config.getProperty("deployment.properties", null);
        DeploymentManager dm = new DeploymentManager(network, propsPath);
        try {
            Map<String, String> addresses = dm.deployAll();
            LOG.info("Deployed contracts:");
            addresses.forEach((name, addr) -> LOG.info("  {} -> {}", name, addr));
        } finally {
            dm.shutdown();
        }
    }

    /**
     * Runs Slither on all contracts and collects findings.
     */
    private List<Finding> runSlither(SlitherRunner runner, String contractsDir)
            throws IOException, InterruptedException {
        List<Finding> allFindings = new ArrayList<>();
        for (String name : CONTRACT_NAMES) {
            String path = contractsDir + "/" + name + ".sol";
            if (Files.exists(Path.of(path))) {
                List<Finding> findings = runner.analyze(path);
                allFindings.addAll(findings);
                LOG.info("  {} — {} finding(s)", name, findings.size());
            } else {
                LOG.warn("  {} — file not found, skipping", path);
            }
        }
        return allFindings;
    }

    /**
     * Runs Mythril on all contracts and collects findings.
     */
    private List<Finding> runMythril(MythrilRunner runner, String contractsDir, int depth)
            throws IOException, InterruptedException {
        List<Finding> allFindings = new ArrayList<>();
        for (String name : CONTRACT_NAMES) {
            String path = contractsDir + "/" + name + ".sol";
            if (Files.exists(Path.of(path))) {
                List<Finding> findings = runner.analyze(path, depth);
                allFindings.addAll(findings);
                LOG.info("  {} — {} finding(s)", name, findings.size());
            } else {
                LOG.warn("  {} — file not found, skipping", path);
            }
        }
        return allFindings;
    }

    /**
     * Runs Certora verification on all contracts against their respective spec files.
     */
    private List<VerificationResult> runCertora(CertoraRunner runner,
                                                 String contractsDir,
                                                 String specsDir)
            throws IOException, InterruptedException {
        List<VerificationResult> allResults = new ArrayList<>();
        for (String name : CONTRACT_NAMES) {
            String contractPath = contractsDir + "/" + name + ".sol";
            String specFile = SPEC_MAP.get(name);
            if (specFile == null) {
                LOG.warn("  {} — no spec file mapped, skipping", name);
                continue;
            }
            String specPath = specsDir + "/" + specFile;

            if (!Files.exists(Path.of(contractPath))) {
                LOG.warn("  {} — contract not found, skipping", contractPath);
                continue;
            }
            if (!Files.exists(Path.of(specPath))) {
                LOG.warn("  {} — spec not found, skipping", specPath);
                continue;
            }

            List<VerificationResult> results = runner.verify(contractPath, specPath);
            allResults.addAll(results);
            LOG.info("  {} — {} result(s)", name, results.size());
        }
        return allResults;
    }

    // ==================================================================
    //  Configuration loading
    // ==================================================================

    /**
     * Loads configuration from command-line arguments or a properties file.
     *
     * <p>Usage: {@code java VerificationPipeline [pipeline.properties]}</p>
     * <p>Or pass individual overrides: {@code -Dnetwork=sepolia -Dmythril.depth=5}</p>
     */
    private static Properties loadConfig(String[] args) {
        Properties config = new Properties();

        // Load from properties file if specified
        if (args.length > 0) {
            String propsPath = args[0];
            try (FileInputStream fis = new FileInputStream(propsPath)) {
                config.load(fis);
                LOG.info("Loaded configuration from {}", propsPath);
            } catch (IOException e) {
                LOG.warn("Could not load properties file '{}', using defaults", propsPath);
            }
        }

        // System properties override file-based config (e.g. -Dnetwork=sepolia)
        for (String key : List.of("contracts.dir", "specs.dir", "output.dir",
                                   "network", "mythril.depth", "deployment.properties")) {
            String sysVal = System.getProperty(key);
            if (sysVal != null) {
                config.setProperty(key, sysVal);
            }
        }

        return config;
    }

    // ==================================================================
    //  Summary banner
    // ==================================================================

    private void printSummaryBanner(List<Finding> slither,
                                     List<Finding> mythril,
                                     List<VerificationResult> certora,
                                     boolean overallPass) {
        long highFindings = slither.stream()
                .filter(f -> f.getSeverity() == Finding.Severity.HIGH).count()
                + mythril.stream()
                .filter(f -> f.getSeverity() == Finding.Severity.HIGH).count();
        long verified = certora.stream()
                .filter(VerificationResult::isVerified).count();

        LOG.info("==========================================================");
        LOG.info("  PIPELINE RESULT: {}", overallPass ? "PASS" : "FAIL");
        LOG.info("  Slither findings: {} ({} HIGH)",
                slither.size(),
                slither.stream().filter(f -> f.getSeverity() == Finding.Severity.HIGH).count());
        LOG.info("  Mythril findings: {} ({} HIGH)",
                mythril.size(),
                mythril.stream().filter(f -> f.getSeverity() == Finding.Severity.HIGH).count());
        LOG.info("  Certora verified: {} / {}", verified, certora.size());
        LOG.info("==========================================================");
    }
}
