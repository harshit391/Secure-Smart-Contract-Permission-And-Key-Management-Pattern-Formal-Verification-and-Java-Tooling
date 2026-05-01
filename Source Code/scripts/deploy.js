/**
 * Hardhat deployment script for the smart-contract permission patterns.
 *
 * Deployment order:
 *   1. RBACManager           — standalone, no dependencies
 *   2. TimelockController    — standalone, no dependencies
 *   3. MultiSigWallet        — standalone, no dependencies
 *   4. Governed              — deploys its own TimelockController internally
 *
 * Usage:
 *   npx hardhat run scripts/deploy.js --network localhost
 *   npx hardhat run scripts/deploy.js --network sepolia
 */

const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log(
    "Account balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "ETH"
  );
  console.log("---------------------------------------------------");

  // ---- 1. RBACManager ----
  console.log("\n[1/4] Deploying RBACManager...");
  const RBAC = await ethers.getContractFactory("RBACManager");
  const rbac = await RBAC.deploy();
  await rbac.waitForDeployment();
  const rbacAddress = await rbac.getAddress();
  console.log("  RBACManager deployed at:", rbacAddress);

  // ---- 2. TimelockController ----
  console.log("\n[2/4] Deploying TimelockController...");
  const minDelay = 86400; // 1 day in seconds
  const proposers = [deployer.address];
  const executors = [deployer.address];
  const cancellers = [deployer.address];

  const Timelock = await ethers.getContractFactory("TimelockController");
  const timelock = await Timelock.deploy(
    minDelay,
    proposers,
    executors,
    cancellers,
    deployer.address // admin
  );
  await timelock.waitForDeployment();
  const timelockAddress = await timelock.getAddress();
  console.log("  TimelockController deployed at:", timelockAddress);

  // ---- 3. MultiSigWallet ----
  console.log("\n[3/4] Deploying MultiSigWallet...");
  const ownerAddresses = [deployer.address];
  for (let i = 1; i < 5; i++) {
    const wallet = ethers.Wallet.createRandom();
    ownerAddresses.push(wallet.address);
  }
  const threshold = 3;

  const MultiSig = await ethers.getContractFactory("MultiSigWallet");
  const multisig = await MultiSig.deploy(ownerAddresses, threshold);
  await multisig.waitForDeployment();
  const multisigAddress = await multisig.getAddress();
  console.log("  MultiSigWallet deployed at:", multisigAddress);
  console.log("  Owners:", ownerAddresses);
  console.log("  Threshold:", threshold);

  // ---- 4. Governed ----
  console.log("\n[4/4] Deploying Governed...");
  const Governed = await ethers.getContractFactory("Governed");
  const governed = await Governed.deploy(
    multisigAddress, // multisig address
    minDelay         // timelock delay (creates its own TimelockController)
  );
  await governed.waitForDeployment();
  const governedAddress = await governed.getAddress();
  console.log("  Governed deployed at:", governedAddress);

  // ---- Summary ----
  console.log("\n===================================================");
  console.log("  Deployment Summary");
  console.log("===================================================");
  console.log("  RBACManager            :", rbacAddress);
  console.log("  TimelockController     :", timelockAddress);
  console.log("  MultiSigWallet         :", multisigAddress);
  console.log("  Governed               :", governedAddress);
  console.log("===================================================");

  return {
    rbac: rbacAddress,
    timelock: timelockAddress,
    multisig: multisigAddress,
    governed: governedAddress,
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
