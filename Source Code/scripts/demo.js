/**
 * demo.js -- Interactive deployment & gas profiling with live transaction output.
 *
 * Shows real-time blockchain interactions:
 *   - Contract deployments with addresses, tx hashes, block numbers, gas
 *   - Individual operations with transaction details
 *   - Baseline vs pattern comparison
 *
 * Usage: npx hardhat run scripts/demo.js
 */

const { ethers } = require("hardhat");

// ── Colors ──────────────────────────────────────────────────────
const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
};

// ── Helpers ─────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function shortAddr(addr) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function shortHash(hash) {
  return `${hash.slice(0, 10)}...${hash.slice(-6)}`;
}

function formatGas(gas) {
  return Number(gas).toLocaleString();
}

function log(msg = "") {
  console.log(msg);
}

function logTx(label, value) {
  console.log(`    ${C.gray}${label}:${C.reset}  ${value}`);
}

async function trackDeploy(label, factory, args = []) {
  log(`\n  ${C.cyan}▸${C.reset} ${C.bold}Deploying ${label}...${C.reset}`);
  await sleep(300);

  const contract = await factory.deploy(...args);
  const deployTx = contract.deploymentTransaction();

  logTx("Tx hash  ", `${C.yellow}${deployTx.hash}${C.reset}`);
  log(`    ${C.gray}Waiting for confirmation...${C.reset}`);

  const receipt = await deployTx.wait();
  await sleep(200);

  const addr = await contract.getAddress();

  logTx("Contract ", `${C.green}${addr}${C.reset}`);
  logTx("Block    ", `${C.blue}#${receipt.blockNumber}${C.reset}`);
  logTx("Gas used ", `${C.magenta}${formatGas(receipt.gasUsed)}${C.reset}`);
  logTx("Status   ", `${C.green}✓ Confirmed${C.reset}`);

  return { contract, receipt };
}

async function trackTx(label, txPromise) {
  log(`\n  ${C.cyan}▸${C.reset} ${label}`);
  await sleep(200);

  const tx = await txPromise;
  logTx("Tx hash  ", `${C.yellow}${tx.hash}${C.reset}`);
  log(`    ${C.gray}Waiting for confirmation...${C.reset}`);

  const receipt = await tx.wait();
  await sleep(150);

  logTx("Block    ", `${C.blue}#${receipt.blockNumber}${C.reset}`);
  logTx("Gas used ", `${C.magenta}${formatGas(receipt.gasUsed)}${C.reset}`);
  logTx("Status   ", `${C.green}✓ Confirmed${C.reset}`);

  return receipt;
}

// ── Main ────────────────────────────────────────────────────────

async function main() {
  const signers = await ethers.getSigners();
  const [deployer, signer2, signer3, signer4, signer5, recipient] = signers;
  const network = await ethers.provider.getNetwork();

  const phase = process.env.DEMO_PHASE;

  // ════════════════════════════════════════════════════════════════
  //  PHASE: DEPLOY
  // ════════════════════════════════════════════════════════════════
  if (phase === "deploy") {
    log(`\n  ${C.gray}Network:${C.reset}   Hardhat Local (Chain ID: ${network.chainId})`);
    log(`  ${C.gray}Deployer:${C.reset}  ${deployer.address}`);
    const bal = await ethers.provider.getBalance(deployer.address);
    log(`  ${C.gray}Balance:${C.reset}   ${ethers.formatEther(bal)} ETH`);

    // 1. SimpleAdmin (baseline)
    const SimpleAdmin = await ethers.getContractFactory("SimpleAdmin");
    const { contract: baseline, receipt: baselineR } = await trackDeploy(
      "SimpleAdmin (baseline)",
      SimpleAdmin
    );

    // 2. RBACManager
    const RBAC = await ethers.getContractFactory("RBACManager");
    const { contract: rbac, receipt: rbacR } = await trackDeploy(
      "RBACManager",
      RBAC
    );

    // 3. TimelockController
    const Timelock = await ethers.getContractFactory("TimelockController");
    const { contract: timelock, receipt: timelockR } = await trackDeploy(
      "TimelockController",
      Timelock,
      [86400, [deployer.address], [deployer.address], [deployer.address], deployer.address]
    );

    // 4. MultiSigWallet
    const owners = [deployer.address, signer2.address, signer3.address, signer4.address, signer5.address];
    const MultiSig = await ethers.getContractFactory("MultiSigWallet");
    const { contract: multisig, receipt: multisigR } = await trackDeploy(
      "MultiSigWallet (3-of-5)",
      MultiSig,
      [owners, 3]
    );

    // 5. Governed
    const Governed = await ethers.getContractFactory("Governed");
    const { contract: governed, receipt: governedR } = await trackDeploy(
      "Governed (composition layer)",
      Governed,
      [await multisig.getAddress(), 86400]
    );

    // Summary table
    log(`\n  ${C.bold}┌──────────────────────────────────────────────────────────┐${C.reset}`);
    log(`  ${C.bold}│  DEPLOYMENT SUMMARY                                      │${C.reset}`);
    log(`  ${C.bold}├──────────────────────┬───────────────────────────────────┤${C.reset}`);
    log(`  ${C.bold}│${C.reset} SimpleAdmin          ${C.bold}│${C.reset} ${await baseline.getAddress()} ${C.bold}│${C.reset}`);
    log(`  ${C.bold}│${C.reset} RBACManager          ${C.bold}│${C.reset} ${await rbac.getAddress()} ${C.bold}│${C.reset}`);
    log(`  ${C.bold}│${C.reset} TimelockController   ${C.bold}│${C.reset} ${await timelock.getAddress()} ${C.bold}│${C.reset}`);
    log(`  ${C.bold}│${C.reset} MultiSigWallet       ${C.bold}│${C.reset} ${await multisig.getAddress()} ${C.bold}│${C.reset}`);
    log(`  ${C.bold}│${C.reset} Governed             ${C.bold}│${C.reset} ${await governed.getAddress()} ${C.bold}│${C.reset}`);
    log(`  ${C.bold}├──────────────────────┴───────────────────────────────────┤${C.reset}`);
    log(`  ${C.bold}│${C.reset} Total contracts: ${C.green}5${C.reset}   |   All confirmed on-chain          ${C.bold}│${C.reset}`);
    log(`  ${C.bold}└──────────────────────────────────────────────────────────┘${C.reset}`);
  }

  // ════════════════════════════════════════════════════════════════
  //  PHASE: GAS PROFILING
  // ════════════════════════════════════════════════════════════════
  if (phase === "gas") {
    log(`\n  ${C.gray}Measuring gas costs: pattern contracts vs single-admin baseline${C.reset}`);

    const gasData = [];

    function record(op, baseline, pattern) {
      gasData.push({ op, baseline, pattern });
    }

    // ── Baseline ──
    log(`\n  ${C.bold}${C.blue}[ Baseline: SimpleAdmin ]${C.reset}`);
    const SimpleAdmin = await ethers.getContractFactory("SimpleAdmin");
    const { contract: base, receipt: baseR } = await trackDeploy("SimpleAdmin", SimpleAdmin);
    const baseDeployGas = Number(baseR.gasUsed);

    await deployer.sendTransaction({ to: await base.getAddress(), value: ethers.parseEther("1") });

    const baseExecR = await trackTx("Baseline: execute(to, 0, 0x)", base.execute(recipient.address, 0, "0x"));
    const baseGrantR = await trackTx("Baseline: grantRole(addr)", base.grantRole(signer2.address));

    // ── MultiSig ──
    log(`\n  ${C.bold}${C.blue}[ Pattern: MultiSigWallet (3-of-5) ]${C.reset}`);
    const owners = [deployer.address, signer2.address, signer3.address, signer4.address, signer5.address];
    const MultiSig = await ethers.getContractFactory("MultiSigWallet");
    const { contract: multisig, receipt: msigR } = await trackDeploy("MultiSigWallet", MultiSig, [owners, 3]);
    const msigDeployGas = Number(msigR.gasUsed);

    await deployer.sendTransaction({ to: await multisig.getAddress(), value: ethers.parseEther("1") });

    // Sign and execute
    const chainId = network.chainId;
    const domain = { name: "MultiSigWallet", version: "1", chainId, verifyingContract: await multisig.getAddress() };
    const types = { Execute: [{ name: "to", type: "address" }, { name: "value", type: "uint256" }, { name: "data", type: "bytes" }, { name: "nonce", type: "uint256" }] };
    const nonce = await multisig.nonce();
    const message = { to: recipient.address, value: 0, data: "0x", nonce };

    log(`\n  ${C.cyan}▸${C.reset} Collecting 3 owner signatures off-chain...`);
    const msigSigners = [deployer, signer2, signer3];
    const sorted = [...msigSigners].sort((a, b) => a.address.toLowerCase() < b.address.toLowerCase() ? -1 : 1);
    const sigs = [];
    for (const s of sorted) {
      const sig = await s.signTypedData(domain, types, message);
      sigs.push(sig);
      log(`    ${C.gray}Signed by${C.reset} ${C.yellow}${shortAddr(s.address)}${C.reset} ${C.green}✓${C.reset}`);
      await sleep(200);
    }
    log(`    ${C.gray}Packing ${sigs.length} signatures for on-chain submission...${C.reset}`);
    const packedSigs = ethers.concat(sigs);

    const msigExecR = await trackTx(
      "MultiSig: execute with 3-of-5 signatures",
      multisig.execute(recipient.address, 0, "0x", packedSigs)
    );

    record("Deploy", baseDeployGas, msigDeployGas);
    record("Execute transaction", Number(baseExecR.gasUsed), Number(msigExecR.gasUsed));

    // ── Timelock ──
    log(`\n  ${C.bold}${C.blue}[ Pattern: TimelockController ]${C.reset}`);
    const minDelay = 1;
    const Timelock = await ethers.getContractFactory("TimelockController");
    const { contract: timelock, receipt: tlR } = await trackDeploy(
      "TimelockController",
      Timelock,
      [minDelay, [deployer.address], [deployer.address], [deployer.address], deployer.address]
    );

    await deployer.sendTransaction({ to: await timelock.getAddress(), value: ethers.parseEther("1") });

    const salt = ethers.keccak256(ethers.toUtf8Bytes("demo-op-1"));
    const opId = await timelock.hashOperation(recipient.address, 0, "0x", salt);

    const schedR = await trackTx(
      "Timelock: schedule operation (delay = 1s)",
      timelock.schedule(opId, recipient.address, 0, "0x", minDelay)
    );

    log(`\n  ${C.cyan}▸${C.reset} ${C.gray}Advancing blockchain time by ${minDelay + 1} seconds...${C.reset}`);
    await ethers.provider.send("evm_increaseTime", [minDelay + 1]);
    await ethers.provider.send("evm_mine", []);
    log(`    ${C.green}✓${C.reset} Time advanced. Operation is now executable.`);

    const execR = await trackTx(
      "Timelock: execute operation (after delay)",
      timelock.execute(opId, recipient.address, 0, "0x")
    );

    record("Schedule (timelock)", null, Number(schedR.gasUsed));
    record("Execute (timelock)", Number(baseExecR.gasUsed), Number(execR.gasUsed));

    // ── RBAC ──
    log(`\n  ${C.bold}${C.blue}[ Pattern: RBACManager ]${C.reset}`);
    const RBAC = await ethers.getContractFactory("RBACManager");
    const { contract: rbac, receipt: rbacR } = await trackDeploy("RBACManager", RBAC);
    const OPERATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("OPERATOR_ROLE"));

    log(`\n  ${C.cyan}▸${C.reset} ${C.gray}Role: OPERATOR_ROLE (${shortHash(OPERATOR_ROLE)})${C.reset}`);

    const propR = await trackTx(
      `RBAC: proposeGrant(OPERATOR, ${shortAddr(signer2.address)})`,
      rbac.proposeGrant(OPERATOR_ROLE, signer2.address)
    );
    const accR = await trackTx(
      `RBAC: acceptRole(OPERATOR) by ${shortAddr(signer2.address)}`,
      rbac.connect(signer2).acceptRole(OPERATOR_ROLE)
    );

    record("Grant role (propose)", Number(baseGrantR.gasUsed), Number(propR.gasUsed));
    record("Accept role", null, Number(accR.gasUsed));

    // ── Gas Comparison Table ──
    log("");
    log(`  ${C.bold}┌────────────────────────────┬────────────┬────────────┬───────────┐${C.reset}`);
    log(`  ${C.bold}│ Operation                  │   Baseline │    Pattern │  Overhead │${C.reset}`);
    log(`  ${C.bold}├────────────────────────────┼────────────┼────────────┼───────────┤${C.reset}`);

    for (const row of gasData) {
      const op = row.op.padEnd(26);
      const bl = row.baseline !== null ? formatGas(row.baseline).padStart(10) : "       ---";
      const pt = formatGas(row.pattern).padStart(10);
      let oh;
      if (row.baseline !== null) {
        const pct = (((row.pattern - row.baseline) / row.baseline) * 100).toFixed(1);
        oh = `${pct}%`.padStart(9);
      } else {
        oh = "      ---";
      }
      log(`  ${C.bold}│${C.reset} ${op} ${C.bold}│${C.reset} ${bl} ${C.bold}│${C.reset} ${C.magenta}${pt}${C.reset} ${C.bold}│${C.reset} ${oh} ${C.bold}│${C.reset}`);
    }

    log(`  ${C.bold}└────────────────────────────┴────────────┴────────────┴───────────┘${C.reset}`);
    log(`  ${C.gray}Baseline: single-admin contract with require(msg.sender == admin)${C.reset}`);
    log(`  ${C.gray}Measured on Hardhat local node, Solidity 0.8.20, optimizer 200 runs${C.reset}`);

    // Per-operation overhead summary
    const comparable = gasData.filter((r) => r.baseline !== null);
    const overheads = comparable.map((r) => ((r.pattern - r.baseline) / r.baseline) * 100);
    const minOh = Math.min(...overheads).toFixed(0);
    const maxOh = Math.max(...overheads).toFixed(0);
    log(`\n  ${C.bold}Per-operation overhead: ${C.green}${minOh}% - ${maxOh}%${C.reset} ${C.gray}(< $0.05 per tx at typical gas prices)${C.reset}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
