require("@nomicfoundation/hardhat-toolbox");
require("hardhat-gas-reporter");

/**
 * Hardhat configuration for the smart-contract permission patterns project.
 *
 * Networks:
 *   - hardhat   : in-process EVM (default, used by `npx hardhat test`)
 *   - localhost  : standalone Hardhat node (`npx hardhat node`)
 *   - sepolia    : Ethereum Sepolia testnet (requires env vars)
 *
 * Environment variables (for Sepolia deployment):
 *   SEPOLIA_RPC_URL    - JSON-RPC endpoint (e.g. Alchemy / Infura)
 *   SEPOLIA_PRIVATE_KEY - deployer account private key (without 0x prefix)
 */

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },

  networks: {
    // Default in-process network (no configuration needed)
    hardhat: {},

    // Local Hardhat node (start with `npx hardhat node`)
    localhost: {
      url: "http://127.0.0.1:8545",
    },

    // Sepolia testnet
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts:
        process.env.SEPOLIA_PRIVATE_KEY
          ? [process.env.SEPOLIA_PRIVATE_KEY]
          : [],
      chainId: 11155111,
    },
  },

  gasReporter: {
    enabled: true,
    currency: "USD",
    outputFile: "gas-report.txt",
    noColors: true,
  },

  mocha: {
    timeout: 60000,
  },
};
