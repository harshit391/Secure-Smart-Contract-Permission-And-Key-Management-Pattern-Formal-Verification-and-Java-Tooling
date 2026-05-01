package edu.chitkara.scverify;

/**
 * Represents the outcome of a single Certora formal-verification run for one
 * property / specification rule.  Immutable value object.
 */
public class VerificationResult {

    /** Possible outcomes of a Certora verification run. */
    public enum Status {
        /** The property holds for all reachable states. */
        VERIFIED,
        /** A counter-example was found that violates the property. */
        VIOLATED,
        /** The prover timed out before reaching a conclusion. */
        TIMEOUT
    }

    private final String propertyId;     // P1 through P10
    private final String contractName;   // e.g. "MultiSigWallet"
    private final String specFile;       // e.g. "specs/multisig.spec"
    private final Status status;
    private final double timeSeconds;    // wall-clock time for the run

    public VerificationResult(String propertyId,
                              String contractName,
                              String specFile,
                              Status status,
                              double timeSeconds) {
        this.propertyId = propertyId;
        this.contractName = contractName;
        this.specFile = specFile;
        this.status = status;
        this.timeSeconds = timeSeconds;
    }

    // ---- Getters ----

    public String getPropertyId() {
        return propertyId;
    }

    public String getContractName() {
        return contractName;
    }

    public String getSpecFile() {
        return specFile;
    }

    public Status getStatus() {
        return status;
    }

    public double getTimeSeconds() {
        return timeSeconds;
    }

    // ---- Convenience ----

    /** Returns true only when the property was formally verified. */
    public boolean isVerified() {
        return status == Status.VERIFIED;
    }

    @Override
    public String toString() {
        return String.format("[%s] %s — %s on %s (%.1fs)",
                propertyId, status, specFile, contractName, timeSeconds);
    }
}
