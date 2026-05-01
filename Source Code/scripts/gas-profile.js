/**
 * Gas profiling script for the smart-contract permission patterns.
 *
 * Deploys each contract and executes representative operations, recording the
 * gas consumed.  Also deploys a minimal SimpleAdmin baseline (single-owner)
 * for comparison.
 *
 * Usage:
 *   npx hardhat run scripts/gas-profile.js
 */

const { ethers } = require("hardhat");

const gasResults = [];

async function recordGas(label, tx) {
  const receipt = tx.wait ? await tx.wait() : tx;
  const gasUsed = receipt.gasUsed;
  gasResults.push({ label, gasUsed: gasUsed.toString() });
  console.log(`  [GAS] ${label}: ${gasUsed.toString()}`);
}

function printGasTable() {
  const maxLabel = Math.max(...gasResults.map((r) => r.label.length), 40);
  const divider = "-".repeat(maxLabel + 20);

  console.log("\n" + divider);
  console.log(
    `  ${"Operation".padEnd(maxLabel)}  ${"Gas Used".padStart(14)}`
  );
  console.log(divider);

  for (const { label, gasUsed } of gasResults) {
    console.log(
      `  ${label.padEnd(maxLabel)}  ${gasUsed.padStart(14)}`
    );
  }
  console.log(divider + "\n");
}

async function main() {
  const signers = await ethers.getSigners();
  const [deployer, signer2, signer3, signer4, signer5, recipient] = signers;

  console.log("===================================================");
  console.log("  Gas Profiling: Permission Pattern Contracts");
  console.log("===================================================\n");

  // ==================================================================
  //  1. Baseline: SimpleAdmin
  // ==================================================================
  console.log("[Baseline] Deploying SimpleAdmin...");
  const SimpleAdmin = await ethers.getContractFactory("SimpleAdmin");
  const baselineTx = await SimpleAdmin.deploy();
  const baselineReceipt = await baselineTx.deploymentTransaction().wait();
  const baseline = baselineTx;
  await recordGas("Deploy SimpleAdmin (baseline)", baselineReceipt);

  // Fund baseline
  await deployer.sendTransaction({
    to: await baseline.getAddress(),
    value: ethers.parseEther("1"),
  });

  // Baseline execute
  const baseExecTx = await baseline.execute(recipient.address, 0, "0x");
  await recordGas("Baseline: execute (single admin)", baseExecTx);

  // Baseline grantRole (no-op)
  const baseGrantTx = await baseline.grantRole(signer2.address);
  await recordGas("Baseline: grantRole (single admin)", baseGrantTx);

  // ==================================================================
  //  2. RBACManager
  // ==================================================================
  console.log("\n[RBAC] Deploying RBACManager...");
  const RBAC = await ethers.getContractFactory("RBACManager");
  const rbacTx = await RBAC.deploy();
  const rbacReceipt = await rbacTx.deploymentTransaction().wait();
  const rbac = rbacTx;
  await recordGas("Deploy RBACManager", rbacReceipt);

  // RBAC: proposeGrant + acceptRole
  const OPERATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("OPERATOR_ROLE"));

  const proposeTx = await rbac.proposeGrant(OPERATOR_ROLE, signer2.address);
  await recordGas("RBAC: proposeGrant", proposeTx);

  const acceptTx = await rbac.connect(signer2).acceptRole(OPERATOR_ROLE);
  await recordGas("RBAC: acceptRole", acceptTx);

  // RBAC: revokeRole
  const revokeTx = await rbac.revokeRole(OPERATOR_ROLE, signer2.address);
  await recordGas("RBAC: revokeRole", revokeTx);

  // ==================================================================
  //  3. TimelockController
  // ==================================================================
  console.log("\n[Timelock] Deploying TimelockController...");
  const minDelay = 1; // 1 second for gas profiling
  const Timelock = await ethers.getContractFactory("TimelockController");
  const timelockTx = await Timelock.deploy(
    minDelay,
    [deployer.address],  // proposers
    [deployer.address],  // executors
    [deployer.address],  // cancellers
    deployer.address     // admin
  );
  const timelockReceipt = await timelockTx.deploymentTransaction().wait();
  const timelock = timelockTx;
  await recordGas("Deploy TimelockController", timelockReceipt);

  // Fund the timelock
  await deployer.sendTransaction({
    to: await timelock.getAddress(),
    value: ethers.parseEther("1"),
  });

  // Timelock: schedule + execute
  const targetAddr = recipient.address;
  const value = 0;
  const data = "0x";
  const salt = ethers.keccak256(ethers.toUtf8Bytes("gas-profile-op"));
  const delay = minDelay;

  const opId = await timelock.hashOperation(targetAddr, value, data, salt);

  const scheduleTx = await timelock.schedule(opId, targetAddr, value, data, delay);
  await recordGas("Timelock: schedule operation", scheduleTx);

  // Advance time past delay
  await ethers.provider.send("evm_increaseTime", [delay + 1]);
  await ethers.provider.send("evm_mine", []);

  const executeTx = await timelock.execute(opId, targetAddr, value, data);
  await recordGas("Timelock: execute operation", executeTx);

  // Timelock: cancel
  const salt2 = ethers.keccak256(ethers.toUtf8Bytes("gas-profile-cancel"));
  const opId2 = await timelock.hashOperation(targetAddr, 0, "0x", salt2);
  await timelock.schedule(opId2, targetAddr, 0, "0x", delay);
  const cancelTx = await timelock.cancel(opId2);
  await recordGas("Timelock: cancel operation", cancelTx);

  // ==================================================================
  //  4. MultiSigWallet (3-of-5)
  // ==================================================================
  console.log("\n[MultiSig] Deploying MultiSigWallet...");
  const ownerAddrs = [
    deployer.address,
    signer2.address,
    signer3.address,
    signer4.address,
    signer5.address,
  ];
  const threshold = 3;
  const MultiSig = await ethers.getContractFactory("MultiSigWallet");
  const multisigTx = await MultiSig.deploy(ownerAddrs, threshold);
  const multisigReceipt = await multisigTx.deploymentTransaction().wait();
  const multisig = multisigTx;
  await recordGas("Deploy MultiSigWallet (3-of-5)", multisigReceipt);

  // Fund the multisig
  await deployer.sendTransaction({
    to: await multisig.getAddress(),
    value: ethers.parseEther("1"),
  });

  // MultiSig execute: EIP-712 signed transaction
  const chainId = (await ethers.provider.getNetwork()).chainId;
  const msigDomain = {
    name: "MultiSigWallet",
    version: "1",
    chainId: chainId,
    verifyingContract: await multisig.getAddress(),
  };
  const msigTypes = {
    Execute: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "data", type: "bytes" },
      { name: "nonce", type: "uint256" },
    ],
  };

  const nonce = await multisig.nonce();
  const msigMessage = {
    to: recipient.address,
    value: 0,
    data: "0x",
    nonce,
  };

  // Collect 3 signatures sorted by address
  const msigSigners = [deployer, signer2, signer3];
  const sorted = [...msigSigners].sort((a, b) =>
    a.address.toLowerCase() < b.address.toLowerCase() ? -1 : 1
  );
  const sigs = [];
  for (const s of sorted) {
    const sig = await s.signTypedData(msigDomain, msigTypes, msigMessage);
    sigs.push(sig);
  }
  const packedSigs = ethers.concat(sigs);

  const msigExecTx = await multisig.execute(
    recipient.address,
    0,
    "0x",
    packedSigs
  );
  await recordGas("MultiSig: execute (3-of-5)", msigExecTx);

  // ==================================================================
  //  5. Governed composition contract
  // ==================================================================
  console.log("\n[Governed] Deploying Governed...");
  try {
    const Governed = await ethers.getContractFactory("Governed");
    const multisigAddr = await multisig.getAddress();
    const governedTx = await Governed.deploy(multisigAddr, minDelay);
    const governedReceipt = await governedTx.deploymentTransaction().wait();
    await recordGas("Deploy Governed (composition)", governedReceipt);
  } catch (e) {
    console.log("  Governed deploy skipped:", e.message.slice(0, 80));
  }

  // ==================================================================
  //  Results
  // ==================================================================
  printGasTable();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Gas profiling failed:", error);
    process.exit(1);
  });
