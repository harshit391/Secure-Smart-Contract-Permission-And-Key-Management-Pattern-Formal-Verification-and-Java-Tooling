package edu.chitkara.scverify;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.web3j.crypto.Credentials;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.methods.response.TransactionReceipt;
import org.web3j.protocol.http.HttpService;
import org.web3j.tx.RawTransactionManager;
import org.web3j.tx.TransactionManager;
import org.web3j.tx.gas.DefaultGasProvider;
import org.web3j.tx.gas.ContractGasProvider;
import org.web3j.utils.Convert;

import java.io.FileInputStream;
import java.io.IOException;
import java.math.BigInteger;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Properties;

/**
 * Manages deployment of the four research contracts to a configured Ethereum network
 * using <a href="https://docs.web3j.io/">web3j</a>.
 *
 * <p>Supported networks:</p>
 * <ul>
 *   <li><b>local</b> — Hardhat local node at {@code http://127.0.0.1:8545}</li>
 *   <li><b>sepolia</b> — Sepolia testnet via an RPC endpoint configured in the properties file</li>
 * </ul>
 *
 * <p>Each {@code deployXxx()} method compiles the contract via the Hardhat artifact,
 * deploys it, waits for the receipt, and returns the on-chain address.</p>
 */
public class DeploymentManager {

    private static final Logger LOG = LoggerFactory.getLogger(DeploymentManager.class);

    // ---- Network constants ----
    private static final String LOCAL_RPC_URL     = "http://127.0.0.1:8545";
    private static final long   LOCAL_CHAIN_ID    = 31337;    // Hardhat default
    private static final long   SEPOLIA_CHAIN_ID  = 11155111;

    // ---- Hardhat default funded account (index 0) ----
    private static final String HARDHAT_PRIVATE_KEY =
            "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

    private final Web3j web3j;
    private final TransactionManager txManager;
    private final ContractGasProvider gasProvider;
    private final String network;

    /**
     * Creates a deployment manager for the specified network.
     *
     * @param network        "local" or "sepolia"
     * @param propertiesPath optional path to a {@code .properties} file containing
     *                       {@code sepolia.rpc.url} and {@code sepolia.private.key}.
     *                       May be {@code null} when targeting the local network.
     */
    public DeploymentManager(String network, String propertiesPath) throws IOException {
        this.network = network;
        this.gasProvider = new DefaultGasProvider();

        if ("sepolia".equalsIgnoreCase(network)) {
            Properties props = loadProperties(propertiesPath);
            String rpcUrl    = props.getProperty("sepolia.rpc.url");
            String privKey   = props.getProperty("sepolia.private.key");

            this.web3j     = Web3j.build(new HttpService(rpcUrl));
            Credentials creds = Credentials.create(privKey);
            this.txManager = new RawTransactionManager(web3j, creds, SEPOLIA_CHAIN_ID);

            LOG.info("DeploymentManager initialized for Sepolia (rpc={})", rpcUrl);
        } else {
            // Default: local Hardhat node
            this.web3j     = Web3j.build(new HttpService(LOCAL_RPC_URL));
            Credentials creds = Credentials.create(HARDHAT_PRIVATE_KEY);
            this.txManager = new RawTransactionManager(web3j, creds, LOCAL_CHAIN_ID);

            LOG.info("DeploymentManager initialized for local Hardhat node");
        }
    }

    // ------------------------------------------------------------------
    //  Deployment methods (one per contract)
    // ------------------------------------------------------------------

    /**
     * Deploys the RBAC (Role-Based Access Control) contract.
     *
     * @return the deployed contract address
     */
    public String deployRBAC() throws Exception {
        LOG.info("Deploying RoleBasedAccessControl...");
        String address = deployFromArtifact("RoleBasedAccessControl");
        LOG.info("RoleBasedAccessControl deployed at {}", address);
        return address;
    }

    /**
     * Deploys the TimelockController contract.
     *
     * @return the deployed contract address
     */
    public String deployTimelock() throws Exception {
        LOG.info("Deploying TimelockController...");
        String address = deployFromArtifact("TimelockController");
        LOG.info("TimelockController deployed at {}", address);
        return address;
    }

    /**
     * Deploys the MultiSigWallet contract.
     *
     * @return the deployed contract address
     */
    public String deployMultiSig() throws Exception {
        LOG.info("Deploying MultiSigWallet...");
        String address = deployFromArtifact("MultiSigWallet");
        LOG.info("MultiSigWallet deployed at {}", address);
        return address;
    }

    /**
     * Deploys the GovernedMultiSig contract.
     *
     * @return the deployed contract address
     */
    public String deployGoverned() throws Exception {
        LOG.info("Deploying GovernedMultiSig...");
        String address = deployFromArtifact("GovernedMultiSig");
        LOG.info("GovernedMultiSig deployed at {}", address);
        return address;
    }

    /**
     * Deploys all four contracts in the correct order and returns a map of
     * contract name to deployed address.
     *
     * <p>Deployment order: RBAC -> Timelock -> MultiSig -> Governed.
     * This ordering ensures any cross-contract constructor dependencies are
     * satisfied (e.g. Governed may reference the RBAC address).</p>
     *
     * @return ordered map of contract names to addresses
     */
    public Map<String, String> deployAll() throws Exception {
        Map<String, String> addresses = new LinkedHashMap<>();
        addresses.put("RoleBasedAccessControl", deployRBAC());
        addresses.put("TimelockController",     deployTimelock());
        addresses.put("MultiSigWallet",         deployMultiSig());
        addresses.put("GovernedMultiSig",       deployGoverned());
        return addresses;
    }

    // ------------------------------------------------------------------
    //  Deployment internals
    // ------------------------------------------------------------------

    /**
     * Reads the compiled Hardhat artifact for the given contract, extracts the
     * bytecode, and sends a deployment transaction.
     *
     * <p>The artifact is expected at
     * {@code ../artifacts/contracts/<Name>.sol/<Name>.json} relative to the
     * java-toolkit directory.</p>
     *
     * @param contractName the Solidity contract name (without .sol)
     * @return the on-chain address once the transaction is mined
     */
    private String deployFromArtifact(String contractName) throws Exception {
        // Read the bytecode from the Hardhat artifact JSON
        String artifactPath = String.format(
                "../artifacts/contracts/%s.sol/%s.json", contractName, contractName);

        com.fasterxml.jackson.databind.ObjectMapper jsonMapper =
                new com.fasterxml.jackson.databind.ObjectMapper();
        com.fasterxml.jackson.databind.JsonNode artifact =
                jsonMapper.readTree(new java.io.File(artifactPath));

        String bytecode = artifact.path("bytecode").asText();
        if (bytecode == null || bytecode.isBlank() || "0x".equals(bytecode)) {
            throw new IllegalStateException(
                    "No bytecode found in artifact for " + contractName +
                    ". Run 'npx hardhat compile' first.");
        }

        // Send the deployment transaction
        org.web3j.protocol.core.methods.response.EthSendTransaction txResponse =
                txManager.sendTransaction(
                        gasProvider.getGasPrice("deploy"),
                        gasProvider.getGasLimit("deploy"),
                        null,       // no 'to' address for contract creation
                        bytecode,
                        BigInteger.ZERO
                );

        if (txResponse.hasError()) {
            throw new RuntimeException("Deployment transaction failed: "
                    + txResponse.getError().getMessage());
        }

        String txHash = txResponse.getTransactionHash();
        LOG.debug("Deployment tx hash: {}", txHash);

        // Wait for the transaction to be mined and retrieve the receipt
        TransactionReceipt receipt = waitForReceipt(txHash);
        String contractAddress = receipt.getContractAddress();

        if (contractAddress == null || contractAddress.isBlank()) {
            throw new RuntimeException("No contract address in receipt for " + contractName);
        }

        return contractAddress;
    }

    /**
     * Polls for a transaction receipt until it is available.
     */
    private TransactionReceipt waitForReceipt(String txHash) throws Exception {
        int attempts = 0;
        while (attempts < 60) {
            var receiptResponse = web3j.ethGetTransactionReceipt(txHash).send();
            if (receiptResponse.getTransactionReceipt().isPresent()) {
                return receiptResponse.getTransactionReceipt().get();
            }
            Thread.sleep(1000);
            attempts++;
        }
        throw new RuntimeException("Transaction receipt not found after 60 seconds: " + txHash);
    }

    // ------------------------------------------------------------------
    //  Utilities
    // ------------------------------------------------------------------

    private Properties loadProperties(String path) throws IOException {
        Properties props = new Properties();
        if (path != null) {
            try (FileInputStream fis = new FileInputStream(path)) {
                props.load(fis);
            }
        }
        // Allow environment-variable overrides
        if (System.getenv("SEPOLIA_RPC_URL") != null) {
            props.setProperty("sepolia.rpc.url", System.getenv("SEPOLIA_RPC_URL"));
        }
        if (System.getenv("SEPOLIA_PRIVATE_KEY") != null) {
            props.setProperty("sepolia.private.key", System.getenv("SEPOLIA_PRIVATE_KEY"));
        }
        return props;
    }

    /** Gracefully shuts down the web3j connection. */
    public void shutdown() {
        if (web3j != null) {
            web3j.shutdown();
        }
    }
}
