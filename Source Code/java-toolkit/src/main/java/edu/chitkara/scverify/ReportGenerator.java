package edu.chitkara.scverify;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.io.PrintWriter;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Aggregates findings from Slither and Mythril together with Certora verification
 * results, then produces:
 * <ol>
 *   <li>A structured <b>JSON report</b> suitable for programmatic consumption.</li>
 *   <li>A human-readable <b>summary text file</b> for quick review.</li>
 * </ol>
 *
 * <p>The report includes a pass/fail status for each research property (P1 through P10)
 * and an overall pipeline verdict.</p>
 */
public class ReportGenerator {

    private static final Logger LOG = LoggerFactory.getLogger(ReportGenerator.class);

    private static final DateTimeFormatter TIMESTAMP_FMT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

    private final ObjectMapper mapper;

    public ReportGenerator() {
        mapper = new ObjectMapper();
        mapper.enable(SerializationFeature.INDENT_OUTPUT);
    }

    /**
     * Generates a full verification report from the three analysis stages.
     *
     * @param slitherFindings findings produced by Slither
     * @param mythrilFindings findings produced by Mythril
     * @param certoraResults  property verification results from Certora
     * @param outputPath      directory where report files will be written
     * @throws IOException if file writing fails
     */
    public void generateReport(List<Finding> slitherFindings,
                               List<Finding> mythrilFindings,
                               List<VerificationResult> certoraResults,
                               String outputPath) throws IOException {

        LOG.info("Generating verification report in {}", outputPath);

        File outputDir = new File(outputPath);
        if (!outputDir.exists() && !outputDir.mkdirs()) {
            throw new IOException("Failed to create output directory: " + outputPath);
        }

        // Determine overall pipeline status
        boolean overallPass = computeOverallPass(slitherFindings, mythrilFindings, certoraResults);

        // Generate JSON report
        String jsonPath = new File(outputDir, "verification-report.json").getAbsolutePath();
        writeJsonReport(slitherFindings, mythrilFindings, certoraResults, overallPass, jsonPath);

        // Generate human-readable summary
        String summaryPath = new File(outputDir, "verification-summary.txt").getAbsolutePath();
        writeSummary(slitherFindings, mythrilFindings, certoraResults, overallPass, summaryPath);

        LOG.info("Report written: {} and {}", jsonPath, summaryPath);
    }

    /**
     * Returns {@code true} if the pipeline passes all gates:
     * <ul>
     *   <li>No HIGH-severity findings from static analysis</li>
     *   <li>All Certora properties verified (no VIOLATED status)</li>
     * </ul>
     */
    public boolean computeOverallPass(List<Finding> slither,
                                       List<Finding> mythril,
                                       List<VerificationResult> certora) {
        boolean noHighFindings =
                slither.stream().noneMatch(f -> f.getSeverity() == Finding.Severity.HIGH) &&
                mythril.stream().noneMatch(f -> f.getSeverity() == Finding.Severity.HIGH);

        boolean allVerified =
                certora.stream().allMatch(VerificationResult::isVerified);

        return noHighFindings && allVerified;
    }

    // ------------------------------------------------------------------
    //  JSON report
    // ------------------------------------------------------------------

    private void writeJsonReport(List<Finding> slither,
                                  List<Finding> mythril,
                                  List<VerificationResult> certora,
                                  boolean overallPass,
                                  String path) throws IOException {
        ObjectNode root = mapper.createObjectNode();

        // Metadata
        root.put("timestamp", LocalDateTime.now().format(TIMESTAMP_FMT));
        root.put("overallStatus", overallPass ? "PASS" : "FAIL");

        // Slither section
        ObjectNode slitherNode = root.putObject("slither");
        slitherNode.put("totalFindings", slither.size());
        slitherNode.put("highCount",
                slither.stream().filter(f -> f.getSeverity() == Finding.Severity.HIGH).count());
        slitherNode.put("mediumCount",
                slither.stream().filter(f -> f.getSeverity() == Finding.Severity.MEDIUM).count());
        ArrayNode slitherArr = slitherNode.putArray("findings");
        for (Finding f : slither) {
            ObjectNode fn = slitherArr.addObject();
            fn.put("severity", f.getSeverity().name());
            fn.put("title", f.getTitle());
            fn.put("description", f.getDescription());
            fn.put("location", f.getLocation());
        }

        // Mythril section
        ObjectNode mythrilNode = root.putObject("mythril");
        mythrilNode.put("totalFindings", mythril.size());
        mythrilNode.put("highCount",
                mythril.stream().filter(f -> f.getSeverity() == Finding.Severity.HIGH).count());
        mythrilNode.put("mediumCount",
                mythril.stream().filter(f -> f.getSeverity() == Finding.Severity.MEDIUM).count());
        ArrayNode mythrilArr = mythrilNode.putArray("findings");
        for (Finding f : mythril) {
            ObjectNode fn = mythrilArr.addObject();
            fn.put("severity", f.getSeverity().name());
            fn.put("title", f.getTitle());
            fn.put("description", f.getDescription());
            fn.put("location", f.getLocation());
        }

        // Certora section
        ObjectNode certoraNode = root.putObject("certora");
        long verifiedCount = certora.stream()
                .filter(r -> r.getStatus() == VerificationResult.Status.VERIFIED).count();
        long violatedCount = certora.stream()
                .filter(r -> r.getStatus() == VerificationResult.Status.VIOLATED).count();
        long timeoutCount = certora.stream()
                .filter(r -> r.getStatus() == VerificationResult.Status.TIMEOUT).count();
        certoraNode.put("totalProperties", certora.size());
        certoraNode.put("verified", verifiedCount);
        certoraNode.put("violated", violatedCount);
        certoraNode.put("timeout", timeoutCount);

        ArrayNode certoraArr = certoraNode.putArray("results");
        for (VerificationResult r : certora) {
            ObjectNode rn = certoraArr.addObject();
            rn.put("propertyId", r.getPropertyId());
            rn.put("contractName", r.getContractName());
            rn.put("specFile", r.getSpecFile());
            rn.put("status", r.getStatus().name());
            rn.put("timeSeconds", r.getTimeSeconds());
        }

        // Per-property summary (P1 through P10)
        ObjectNode propertySummary = root.putObject("propertySummary");
        Map<String, VerificationResult.Status> propertyMap = new LinkedHashMap<>();
        for (VerificationResult r : certora) {
            // If multiple rules map to the same property, worst status wins
            propertyMap.merge(r.getPropertyId(), r.getStatus(), (existing, incoming) -> {
                if (existing == VerificationResult.Status.VIOLATED
                        || incoming == VerificationResult.Status.VIOLATED) {
                    return VerificationResult.Status.VIOLATED;
                }
                if (existing == VerificationResult.Status.TIMEOUT
                        || incoming == VerificationResult.Status.TIMEOUT) {
                    return VerificationResult.Status.TIMEOUT;
                }
                return VerificationResult.Status.VERIFIED;
            });
        }
        for (int i = 1; i <= 10; i++) {
            String pid = "P" + i;
            VerificationResult.Status status = propertyMap.getOrDefault(pid,
                    VerificationResult.Status.TIMEOUT);
            propertySummary.put(pid, status.name());
        }

        mapper.writeValue(new File(path), root);
    }

    // ------------------------------------------------------------------
    //  Human-readable summary
    // ------------------------------------------------------------------

    private void writeSummary(List<Finding> slither,
                               List<Finding> mythril,
                               List<VerificationResult> certora,
                               boolean overallPass,
                               String path) throws IOException {
        try (PrintWriter pw = new PrintWriter(new FileWriter(path))) {
            pw.println("==========================================================");
            pw.println("  Smart Contract Verification Report");
            pw.printf("  Generated: %s%n", LocalDateTime.now().format(TIMESTAMP_FMT));
            pw.println("==========================================================");
            pw.println();

            // Overall status
            pw.printf("  OVERALL STATUS: %s%n%n", overallPass ? "PASS" : "FAIL");

            // Slither summary
            pw.println("----------------------------------------------------------");
            pw.println("  Slither Static Analysis");
            pw.println("----------------------------------------------------------");
            pw.printf("  Total findings: %d%n", slither.size());
            printFindingsByLevel(pw, slither);
            pw.println();

            // Mythril summary
            pw.println("----------------------------------------------------------");
            pw.println("  Mythril Symbolic Execution");
            pw.println("----------------------------------------------------------");
            pw.printf("  Total findings: %d%n", mythril.size());
            printFindingsByLevel(pw, mythril);
            pw.println();

            // Certora summary
            pw.println("----------------------------------------------------------");
            pw.println("  Certora Formal Verification");
            pw.println("----------------------------------------------------------");
            long verified = certora.stream()
                    .filter(r -> r.getStatus() == VerificationResult.Status.VERIFIED).count();
            pw.printf("  Properties verified: %d / %d%n", verified, certora.size());
            pw.println();
            pw.printf("  %-8s %-24s %-30s %-10s %8s%n",
                    "Prop", "Contract", "Spec", "Status", "Time(s)");
            pw.println("  " + "-".repeat(84));
            for (VerificationResult r : certora) {
                pw.printf("  %-8s %-24s %-30s %-10s %8.1f%n",
                        r.getPropertyId(),
                        r.getContractName(),
                        r.getSpecFile(),
                        r.getStatus(),
                        r.getTimeSeconds());
            }
            pw.println();

            // Property matrix
            pw.println("----------------------------------------------------------");
            pw.println("  Property Matrix (P1 - P10)");
            pw.println("----------------------------------------------------------");
            Map<String, String> matrix = new LinkedHashMap<>();
            for (VerificationResult r : certora) {
                matrix.putIfAbsent(r.getPropertyId(), r.getStatus().name());
            }
            for (int i = 1; i <= 10; i++) {
                String pid = "P" + i;
                String status = matrix.getOrDefault(pid, "N/A");
                String marker = "VERIFIED".equals(status) ? "PASS" : "FAIL";
                pw.printf("  %s: %-10s [%s]%n", pid, status, marker);
            }

            pw.println();
            pw.println("==========================================================");
            pw.println("  End of Report");
            pw.println("==========================================================");
        }
    }

    /** Prints a breakdown of findings by severity level. */
    private void printFindingsByLevel(PrintWriter pw, List<Finding> findings) {
        Map<Finding.Severity, Long> counts = findings.stream()
                .collect(Collectors.groupingBy(Finding::getSeverity, Collectors.counting()));
        for (Finding.Severity sev : Finding.Severity.values()) {
            pw.printf("    %s: %d%n", sev, counts.getOrDefault(sev, 0L));
        }
    }
}
