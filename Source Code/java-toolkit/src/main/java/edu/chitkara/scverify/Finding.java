package edu.chitkara.scverify;

/**
 * Represents a single finding produced by a static-analysis or symbolic-execution tool
 * (Slither or Mythril).  Immutable value object.
 */
public class Finding {

    /** Severity classification for a finding. */
    public enum Severity {
        HIGH,
        MEDIUM,
        LOW,
        INFO
    }

    private final Severity severity;
    private final String title;
    private final String description;
    private final String location;   // e.g. "MultiSigWallet.sol:42"

    public Finding(Severity severity, String title, String description, String location) {
        this.severity = severity;
        this.title = title;
        this.description = description;
        this.location = location;
    }

    // ---- Getters ----

    public Severity getSeverity() {
        return severity;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public String getLocation() {
        return location;
    }

    // ---- Convenience ----

    /** Returns true when the severity is HIGH or MEDIUM (i.e. actionable). */
    public boolean isActionable() {
        return severity == Severity.HIGH || severity == Severity.MEDIUM;
    }

    @Override
    public String toString() {
        return String.format("[%s] %s — %s (%s)", severity, title, description, location);
    }
}
