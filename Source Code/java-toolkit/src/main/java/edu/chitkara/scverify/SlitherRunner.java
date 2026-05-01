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
 * Runs the <a href="https://github.com/crytic/slither">Slither</a> static-analysis
 * tool as a subprocess and parses the JSON output into a list of {@link Finding}s.
 *
 * <p>Slither is invoked with {@code --json -} so that the structured report is
 * written to stdout, making it straightforward to capture and parse.</p>
 */
public class SlitherRunner {

    private static final Logger LOG = LoggerFactory.getLogger(SlitherRunner.class);

    /** Maximum seconds to wait for a Slither run before killing the process. */
    private static final int TIMEOUT_SECONDS = 300;

    private final ObjectMapper mapper = new ObjectMapper();

    /**
     * Analyse a Solidity source file (or project directory) with Slither.
     *
     * @param contractPath absolute or relative path to the contract file or project root
     * @return list of findings extracted from the Slither JSON report
     * @throws IOException          if the subprocess cannot be started
     * @throws InterruptedException if the current thread is interrupted while waiting
     */
    public List<Finding> analyze(String contractPath) throws IOException, InterruptedException {
        LOG.info("Running Slither on {}", contractPath);

        // Build the command: output JSON to stdout
        ProcessBuilder pb = new ProcessBuilder(
                "slither", contractPath, "--json", "-"
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
            LOG.error("Slither timed out after {} seconds", TIMEOUT_SECONDS);
            throw new IOException("Slither process timed out");
        }

        int exitCode = process.exitValue();
        LOG.info("Slither exited with code {}", exitCode);

        if (!stderr.isBlank()) {
            LOG.debug("Slither stderr:\n{}", stderr);
        }

        // Parse the JSON output
        return parseFindings(stdout);
    }

    // ------------------------------------------------------------------
    //  JSON parsing helpers
    // ------------------------------------------------------------------

    /**
     * Parses the top-level Slither JSON output into a list of {@link Finding}s.
     * The expected structure is:
     * <pre>
     * {
     *   "success": true,
     *   "results": {
     *     "detectors": [ { "impact": "...", "check": "...", ... }, ... ]
     *   }
     * }
     * </pre>
     */
    private List<Finding> parseFindings(String json) throws IOException {
        List<Finding> findings = new ArrayList<>();

        if (json == null || json.isBlank()) {
            LOG.warn("Slither produced no JSON output");
            return findings;
        }

        JsonNode root = mapper.readTree(json);
        JsonNode detectors = root.path("results").path("detectors");

        if (detectors.isMissingNode() || !detectors.isArray()) {
            LOG.warn("No detector results found in Slither output");
            return findings;
        }

        for (JsonNode det : detectors) {
            Finding.Severity severity = mapSeverity(det.path("impact").asText("Informational"));
            String title = det.path("check").asText("unknown");
            String description = det.path("description").asText("");
            String location = extractLocation(det);

            findings.add(new Finding(severity, title, description, location));
        }

        LOG.info("Slither reported {} finding(s)", findings.size());
        return findings;
    }

    /** Maps a Slither impact string to our internal severity enum. */
    private Finding.Severity mapSeverity(String impact) {
        return switch (impact.toLowerCase()) {
            case "high"          -> Finding.Severity.HIGH;
            case "medium"        -> Finding.Severity.MEDIUM;
            case "low"           -> Finding.Severity.LOW;
            default              -> Finding.Severity.INFO;
        };
    }

    /** Extracts a human-readable location string from the first element in the detector. */
    private String extractLocation(JsonNode detector) {
        JsonNode elements = detector.path("elements");
        if (elements.isArray() && !elements.isEmpty()) {
            JsonNode first = elements.get(0);
            String file = first.path("source_mapping").path("filename_short").asText("");
            int startLine = first.path("source_mapping").path("lines").path(0).asInt(0);
            return file.isEmpty() ? "unknown" : file + ":" + startLine;
        }
        return "unknown";
    }
}
