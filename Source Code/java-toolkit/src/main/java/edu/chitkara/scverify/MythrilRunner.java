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

/**
 * Runs the <a href="https://github.com/Consensys/mythril">Mythril</a> symbolic-execution
 * engine as a subprocess and parses the JSON output into a list of {@link Finding}s.
 *
 * <p>Mythril is invoked via {@code myth analyze --solv <version> -o json} so the
 * structured report is written to stdout.</p>
 */
public class MythrilRunner {

    private static final Logger LOG = LoggerFactory.getLogger(MythrilRunner.class);

    /** Default maximum transaction depth for symbolic execution. */
    private static final int DEFAULT_TX_DEPTH = 3;

    /** Maximum seconds to wait for a Mythril run before killing the process. */
    private static final int TIMEOUT_SECONDS = 600;

    /** Solidity compiler version to use (must match the pragma in the contracts). */
    private static final String SOLC_VERSION = "0.8.20";

    private final ObjectMapper mapper = new ObjectMapper();

    /**
     * Analyse a Solidity source file with Mythril using the default transaction depth.
     *
     * @param contractPath path to the Solidity source file
     * @return list of findings from the symbolic-execution analysis
     */
    public List<Finding> analyze(String contractPath) throws IOException, InterruptedException {
        return analyze(contractPath, DEFAULT_TX_DEPTH);
    }

    /**
     * Analyse a Solidity source file with Mythril.
     *
     * @param contractPath path to the Solidity source file
     * @param txDepth      maximum transaction depth for the symbolic executor
     * @return list of findings from the symbolic-execution analysis
     * @throws IOException          if the subprocess cannot be started
     * @throws InterruptedException if the current thread is interrupted while waiting
     */
    public List<Finding> analyze(String contractPath, int txDepth)
            throws IOException, InterruptedException {

        LOG.info("Running Mythril on {} with tx-depth={}", contractPath, txDepth);

        ProcessBuilder pb = new ProcessBuilder(
                "myth", "analyze",
                contractPath,
                "--solv", SOLC_VERSION,
                "--execution-timeout", String.valueOf(TIMEOUT_SECONDS - 30),
                "--max-depth", String.valueOf(txDepth),
                "-o", "json"
        );
        pb.redirectErrorStream(false);

        Process process = pb.start();

        // Capture stdout (JSON report)
        String stdout;
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line);
            }
            stdout = sb.toString();
        }

        // Capture stderr for diagnostic logging
        String stderr;
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(process.getErrorStream(), StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line).append(System.lineSeparator());
            }
            stderr = sb.toString();
        }

        boolean finished = process.waitFor(TIMEOUT_SECONDS, TimeUnit.SECONDS);
        if (!finished) {
            process.destroyForcibly();
            LOG.error("Mythril timed out after {} seconds", TIMEOUT_SECONDS);
            throw new IOException("Mythril process timed out");
        }

        int exitCode = process.exitValue();
        LOG.info("Mythril exited with code {}", exitCode);

        if (!stderr.isBlank()) {
            LOG.debug("Mythril stderr:\n{}", stderr);
        }

        return parseFindings(stdout);
    }

    // ------------------------------------------------------------------
    //  JSON parsing helpers
    // ------------------------------------------------------------------

    /**
     * Parses the Mythril JSON output into a list of {@link Finding}s.
     * The expected structure is:
     * <pre>
     * {
     *   "success": true,
     *   "error": null,
     *   "issues": [
     *     {
     *       "swcID": "SWC-107",
     *       "swcTitle": "Reentrancy",
     *       "severity": "High",
     *       "description": { "head": "...", "tail": "..." },
     *       "sourceMap": "...",
     *       "filename": "...",
     *       "lineno": 42
     *     }
     *   ]
     * }
     * </pre>
     */
    private List<Finding> parseFindings(String json) throws IOException {
        List<Finding> findings = new ArrayList<>();

        if (json == null || json.isBlank()) {
            LOG.warn("Mythril produced no JSON output");
            return findings;
        }

        JsonNode root = mapper.readTree(json);
        JsonNode issues = root.path("issues");

        if (issues.isMissingNode() || !issues.isArray()) {
            LOG.warn("No issues array found in Mythril output");
            return findings;
        }

        for (JsonNode issue : issues) {
            Finding.Severity severity = mapSeverity(issue.path("severity").asText("Low"));

            String swcId = issue.path("swcID").asText("");
            String swcTitle = issue.path("swcTitle").asText("Unknown");
            String title = swcId.isEmpty() ? swcTitle : swcId + ": " + swcTitle;

            // Mythril descriptions have "head" (short) and "tail" (detailed) parts
            JsonNode descNode = issue.path("description");
            String description;
            if (descNode.isObject()) {
                description = descNode.path("head").asText("") + " "
                            + descNode.path("tail").asText("");
            } else {
                description = descNode.asText("");
            }

            String filename = issue.path("filename").asText("unknown");
            int lineno = issue.path("lineno").asInt(0);
            String location = filename + ":" + lineno;

            findings.add(new Finding(severity, title, description.trim(), location));
        }

        LOG.info("Mythril reported {} finding(s)", findings.size());
        return findings;
    }

    /** Maps a Mythril severity string to our internal severity enum. */
    private Finding.Severity mapSeverity(String severity) {
        return switch (severity.toLowerCase()) {
            case "high"   -> Finding.Severity.HIGH;
            case "medium" -> Finding.Severity.MEDIUM;
            case "low"    -> Finding.Severity.LOW;
            default       -> Finding.Severity.INFO;
        };
    }
}
