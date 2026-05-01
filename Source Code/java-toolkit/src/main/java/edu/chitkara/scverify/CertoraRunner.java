package edu.chitkara.scverify;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Runs the <a href="https://www.certora.com/">Certora Prover</a> CLI
 * ({@code certoraRun}) as a subprocess and parses the output to determine
 * whether each specified property was VERIFIED or VIOLATED.
 *
 * <p>Unlike Slither and Mythril, Certora performs formal verification against
 * user-supplied specifications (CVL rules), so this runner requires both a
 * contract path and a spec file path.</p>
 */
public class CertoraRunner {

    private static final Logger LOG = LoggerFactory.getLogger(CertoraRunner.class);

    /** Maximum seconds to wait for a Certora run. */
    private static final int TIMEOUT_SECONDS = 900;

    /** Regex to capture rule verification results from Certora output. */
    private static final Pattern RULE_RESULT_PATTERN =
            Pattern.compile("Rule\\s+(\\S+)\\s*:\\s*(VERIFIED|VIOLATED|TIMEOUT)", Pattern.CASE_INSENSITIVE);

    private final ObjectMapper mapper = new ObjectMapper();

    /**
     * Verify a contract against a Certora spec file.
     *
     * @param contractPath path to the Solidity source file
     * @param specPath     path to the CVL specification file
     * @return list of verification results (one per rule in the spec)
     * @throws IOException          if the subprocess cannot be started
     * @throws InterruptedException if the current thread is interrupted while waiting
     */
    public List<VerificationResult> verify(String contractPath, String specPath)
            throws IOException, InterruptedException {

        LOG.info("Running Certora Prover: contract={}, spec={}", contractPath, specPath);

        ProcessBuilder pb = new ProcessBuilder(
                "certoraRun",
                contractPath,
                "--verify", extractContractName(contractPath) + ":" + specPath
        );
        pb.redirectErrorStream(true);   // merge stderr into stdout for simpler parsing

        long startMs = System.currentTimeMillis();
        Process process = pb.start();

        // Capture combined output
        String output;
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line).append(System.lineSeparator());
                LOG.debug("[certora] {}", line);
            }
            output = sb.toString();
        }

        boolean finished = process.waitFor(TIMEOUT_SECONDS, TimeUnit.SECONDS);
        double elapsedSec = (System.currentTimeMillis() - startMs) / 1000.0;

        if (!finished) {
            process.destroyForcibly();
            LOG.error("Certora timed out after {} seconds", TIMEOUT_SECONDS);
            // Return a single TIMEOUT result for the whole spec
            List<VerificationResult> results = new ArrayList<>();
            results.add(new VerificationResult(
                    "ALL", extractContractName(contractPath), specPath,
                    VerificationResult.Status.TIMEOUT, elapsedSec));
            return results;
        }

        int exitCode = process.exitValue();
        LOG.info("Certora exited with code {} in {:.1f}s", exitCode, elapsedSec);

        return parseResults(output, contractPath, specPath, elapsedSec);
    }

    // ------------------------------------------------------------------
    //  Output parsing
    // ------------------------------------------------------------------

    /**
     * Parses Certora CLI output for rule-level VERIFIED/VIOLATED/TIMEOUT lines and
     * maps each to a {@link VerificationResult}.
     */
    private List<VerificationResult> parseResults(String output,
                                                   String contractPath,
                                                   String specPath,
                                                   double totalTimeSec) {
        List<VerificationResult> results = new ArrayList<>();
        String contractName = extractContractName(contractPath);

        Matcher matcher = RULE_RESULT_PATTERN.matcher(output);
        while (matcher.find()) {
            String ruleName = matcher.group(1);
            String statusStr = matcher.group(2).toUpperCase();

            VerificationResult.Status status = switch (statusStr) {
                case "VERIFIED" -> VerificationResult.Status.VERIFIED;
                case "VIOLATED" -> VerificationResult.Status.VIOLATED;
                default         -> VerificationResult.Status.TIMEOUT;
            };

            // Derive property ID from rule name (e.g. "rule_P3_noUnauthorizedExec" -> "P3")
            String propertyId = extractPropertyId(ruleName);

            results.add(new VerificationResult(propertyId, contractName, specPath, status, totalTimeSec));
        }

        if (results.isEmpty()) {
            LOG.warn("Could not parse any rule results from Certora output; " +
                     "adding a single aggregate result based on exit code");
            // Fallback: treat the whole run as a single result
            VerificationResult.Status fallback = output.contains("VERIFIED")
                    ? VerificationResult.Status.VERIFIED
                    : VerificationResult.Status.VIOLATED;
            results.add(new VerificationResult(
                    "ALL", contractName, specPath, fallback, totalTimeSec));
        }

        LOG.info("Certora produced {} result(s) for {}", results.size(), contractName);
        return results;
    }

    // ------------------------------------------------------------------
    //  Utility helpers
    // ------------------------------------------------------------------

    /**
     * Extracts the contract name from a file path.
     * e.g. "contracts/MultiSigWallet.sol" -> "MultiSigWallet"
     */
    private String extractContractName(String contractPath) {
        String fileName = contractPath.contains("/")
                ? contractPath.substring(contractPath.lastIndexOf('/') + 1)
                : contractPath.contains("\\")
                    ? contractPath.substring(contractPath.lastIndexOf('\\') + 1)
                    : contractPath;
        return fileName.replace(".sol", "");
    }

    /**
     * Extracts a property identifier (P1-P10) from a Certora rule name.
     * Convention: rules are named like {@code rule_P3_noUnauthorizedExec}.
     * If the pattern is not found, the full rule name is returned.
     */
    private String extractPropertyId(String ruleName) {
        Pattern pidPattern = Pattern.compile("P(\\d+)");
        Matcher m = pidPattern.matcher(ruleName);
        if (m.find()) {
            return "P" + m.group(1);
        }
        return ruleName;
    }
}
