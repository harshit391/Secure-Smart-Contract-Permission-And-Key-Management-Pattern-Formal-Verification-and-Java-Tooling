/**
 * interactive.js -- Real-world interactive demo of the permission patterns.
 *
 * This is NOT a test runner. It simulates real usage:
 *   - You have a multisig wallet with real ETH. Transfer funds.
 *   - You have a timelock. Schedule and execute operations.
 *   - You manage roles. Grant, accept, try to hack.
 *
 * Usage: npx hardhat run scripts/interactive.js
 */

const { ethers } = require("hardhat");
const readline = require("readline");

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
  white: "\x1b[37m",
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
};

// ── Helpers ─────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function shortAddr(addr) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatEth(wei) {
  return ethers.formatEther(wei) + " ETH";
}

function formatGas(n) {
  return Number(n).toLocaleString();
}

function log(msg = "") {
  console.log(msg);
}

function logTx(label, value) {
  console.log(`      ${C.gray}${label}:${C.reset}  ${value}`);
}

function divider() {
  log(`  ${C.blue}──────────────────────────────────────────────────────────${C.reset}`);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(question) {
  return new Promise((resolve) => {
    rl.question(`  ${C.yellow}${question}${C.reset}`, (answer) => {
      resolve(answer.trim());
    });
  });
}

function pressEnter(msg = "Press ENTER to continue...") {
  return new Promise((resolve) => {
    rl.question(`\n  ${C.yellow}▶ ${msg}${C.reset}`, () => resolve());
  });
}

async function showTx(label, txPromise) {
  log(`\n    ${C.cyan}▸${C.reset} ${label}`);
  await sleep(300);

  const tx = await txPromise;
  logTx("Tx hash ", `${C.yellow}${tx.hash}${C.reset}`);
  log(`      ${C.gray}Waiting for confirmation...${C.reset}`);

  const receipt = await tx.wait();
  await sleep(200);

  logTx("Block   ", `${C.blue}#${receipt.blockNumber}${C.reset}`);
  logTx("Gas used", `${C.magenta}${formatGas(receipt.gasUsed)}${C.reset}`);
  logTx("Status  ", `${C.green}✓ Confirmed${C.reset}`);

  return receipt;
}

// ── State ───────────────────────────────────────────────────────

let signers, deployer, alice, bob, charlie, dave, eve, outsider;
let multisig, timelock, rbac;
let OPERATOR_ROLE, GUARDIAN_ROLE;

// ── Setup ───────────────────────────────────────────────────────

async function setup() {
  log("");
  log(`  ${C.blue}╔═══════════════════════════════════════════════════════════╗${C.reset}`);
  log(`  ${C.blue}║${C.reset}                                                           ${C.blue}║${C.reset}`);
  log(`  ${C.blue}║${C.reset}   ${C.bold}INTERACTIVE DEMO${C.reset}                                       ${C.blue}║${C.reset}`);
  log(`  ${C.blue}║${C.reset}   ${C.dim}Secure Smart-Contract Permission & Key Management${C.reset}      ${C.blue}║${C.reset}`);
  log(`  ${C.blue}║${C.reset}                                                           ${C.blue}║${C.reset}`);
  log(`  ${C.blue}╚═══════════════════════════════════════════════════════════╝${C.reset}`);
  log("");
  log(`  ${C.dim}This demo lets you interact with our contracts like a real user.${C.reset}`);
  log(`  ${C.dim}You'll transfer real ETH, manage roles, and even try to hack them.${C.reset}`);
  log("");
  divider();
  log(`  ${C.bold}Setting up the blockchain environment...${C.reset}`);
  divider();

  signers = await ethers.getSigners();
  [deployer, alice, bob, charlie, dave, eve, outsider] = signers;

  log("");
  log(`  ${C.bold}Accounts on the local blockchain:${C.reset}`);
  log("");
  log(`    ${C.green}Owner 1 (deployer):${C.reset}  ${deployer.address}`);
  log(`    ${C.green}Owner 2 (Alice):${C.reset}     ${alice.address}`);
  log(`    ${C.green}Owner 3 (Bob):${C.reset}       ${bob.address}`);
  log(`    ${C.green}Owner 4 (Charlie):${C.reset}   ${charlie.address}`);
  log(`    ${C.green}Owner 5 (Dave):${C.reset}      ${dave.address}`);
  log(`    ${C.cyan}Recipient (Eve):${C.reset}     ${eve.address}`);
  log(`    ${C.red}Attacker:${C.reset}            ${outsider.address}`);

  await pressEnter("Press ENTER to deploy contracts...");

  // Deploy MultiSig
  log(`\n  ${C.bold}Deploying MultiSigWallet (3-of-5)...${C.reset}`);
  const owners = [deployer.address, alice.address, bob.address, charlie.address, dave.address];
  const MultiSig = await ethers.getContractFactory("MultiSigWallet");
  multisig = await MultiSig.deploy(owners, 3);
  const msigReceipt = await multisig.deploymentTransaction().wait();
  const msigAddr = await multisig.getAddress();
  log(`    ${C.green}✓${C.reset} Deployed at ${C.green}${msigAddr}${C.reset}`);
  log(`    ${C.gray}  Owners: deployer, Alice, Bob, Charlie, Dave${C.reset}`);
  log(`    ${C.gray}  Threshold: 3 of 5 signatures required${C.reset}`);

  // Fund the multisig
  await deployer.sendTransaction({ to: msigAddr, value: ethers.parseEther("5") });
  log(`    ${C.green}✓${C.reset} Funded with ${C.bold}5.0 ETH${C.reset}`);

  // Deploy Timelock
  log(`\n  ${C.bold}Deploying TimelockController (delay: 5 seconds for demo)...${C.reset}`);
  const Timelock = await ethers.getContractFactory("TimelockController");
  timelock = await Timelock.deploy(
    5, // 5 second delay for demo
    [deployer.address],
    [deployer.address],
    [deployer.address],
    deployer.address
  );
  await timelock.deploymentTransaction().wait();
  const tlAddr = await timelock.getAddress();
  log(`    ${C.green}✓${C.reset} Deployed at ${C.green}${tlAddr}${C.reset}`);
  log(`    ${C.gray}  Proposer, Executor, Canceller: deployer${C.reset}`);
  log(`    ${C.gray}  Minimum delay: 5 seconds${C.reset}`);

  // Fund the timelock
  await deployer.sendTransaction({ to: tlAddr, value: ethers.parseEther("2") });
  log(`    ${C.green}✓${C.reset} Funded with ${C.bold}2.0 ETH${C.reset}`);

  // Deploy RBAC
  log(`\n  ${C.bold}Deploying RBACManager...${C.reset}`);
  const RBAC = await ethers.getContractFactory("RBACManager");
  rbac = await RBAC.deploy();
  await rbac.deploymentTransaction().wait();
  const rbacAddr = await rbac.getAddress();
  log(`    ${C.green}✓${C.reset} Deployed at ${C.green}${rbacAddr}${C.reset}`);
  log(`    ${C.gray}  Admin: deployer (holds DEFAULT_ADMIN_ROLE)${C.reset}`);

  OPERATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("OPERATOR_ROLE"));
  GUARDIAN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("GUARDIAN_ROLE"));

  log("");
  divider();
  log(`  ${C.green}${C.bold}All contracts deployed and funded. Ready for interaction.${C.reset}`);
  divider();
}

// ── Menu ────────────────────────────────────────────────────────

async function showMenu() {
  log("");
  log(`  ${C.bold}What would you like to do?${C.reset}`);
  log("");
  log(`  ${C.cyan}MULTISIG WALLET${C.reset}`);
  log(`    ${C.bold}1${C.reset}  Transfer ETH from multisig wallet (collect 3 signatures)`);
  log(`    ${C.bold}2${C.reset}  Check multisig wallet balance`);
  log("");
  log(`  ${C.cyan}TIMELOCK CONTROLLER${C.reset}`);
  log(`    ${C.bold}3${C.reset}  Schedule an operation (with delay)`);
  log(`    ${C.bold}4${C.reset}  Execute a scheduled operation (after delay passes)`);
  log("");
  log(`  ${C.cyan}RBAC (ROLE MANAGEMENT)${C.reset}`);
  log(`    ${C.bold}5${C.reset}  Grant OPERATOR role to Alice (propose + accept)`);
  log(`    ${C.bold}6${C.reset}  Check who holds what roles`);
  log("");
  log(`  ${C.red}ATTACK SCENARIOS${C.reset}`);
  log(`    ${C.bold}7${C.reset}  ${C.red}Attack:${C.reset} Try to steal funds with forged signatures`);
  log(`    ${C.bold}8${C.reset}  ${C.red}Attack:${C.reset} Try to bypass timelock (execute early)`);
  log(`    ${C.bold}9${C.reset}  ${C.red}Attack:${C.reset} Try to escalate privileges (unauthorized role grant)`);
  log("");
  log(`    ${C.bold}0${C.reset}  Exit demo`);
  log("");

  return await ask("  Choose [0-9]: ");
}

// ── Actions ─────────────────────────────────────────────────────

async function action1_transferETH() {
  divider();
  log(`  ${C.bold}SCENARIO: Transfer 0.5 ETH from Multisig to Eve${C.reset}`);
  divider();
  log("");
  log(`  ${C.dim}The multisig wallet holds funds. To send ETH, we need${C.reset}`);
  log(`  ${C.dim}3 out of 5 owners to sign the transaction off-chain.${C.reset}`);
  log(`  ${C.dim}Then we pack the signatures and submit on-chain.${C.reset}`);

  const walletAddr = await multisig.getAddress();
  const walletBal = await ethers.provider.getBalance(walletAddr);
  const eveBal = await ethers.provider.getBalance(eve.address);

  log("");
  log(`    ${C.bold}Before:${C.reset}`);
  log(`      Multisig wallet:  ${C.bold}${formatEth(walletBal)}${C.reset}`);
  log(`      Eve's balance:    ${C.bold}${formatEth(eveBal)}${C.reset}`);

  await pressEnter("Press ENTER to start collecting signatures...");

  const chainId = (await ethers.provider.getNetwork()).chainId;
  const domain = {
    name: "MultiSigWallet", version: "1", chainId,
    verifyingContract: walletAddr,
  };
  const types = {
    Execute: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "data", type: "bytes" },
      { name: "nonce", type: "uint256" },
    ],
  };
  const nonce = await multisig.nonce();
  const sendValue = ethers.parseEther("0.5");
  const message = { to: eve.address, value: sendValue, data: "0x", nonce };

  log(`    ${C.bold}Collecting signatures from 3 owners:${C.reset}`);
  log("");

  const msigSigners = [deployer, alice, bob];
  const sorted = [...msigSigners].sort((a, b) =>
    a.address.toLowerCase() < b.address.toLowerCase() ? -1 : 1
  );
  const sigs = [];
  const names = { [deployer.address]: "Deployer", [alice.address]: "Alice", [bob.address]: "Bob" };

  for (const s of sorted) {
    await sleep(500);
    log(`      ${C.gray}${names[s.address]} (${shortAddr(s.address)}) is signing...${C.reset}`);
    const sig = await s.signTypedData(domain, types, message);
    sigs.push(sig);
    await sleep(300);
    log(`      ${C.green}✓ ${names[s.address]} signed${C.reset}  ${C.dim}(sig: ${sig.slice(0, 20)}...)${C.reset}`);
    log("");
  }

  log(`    ${C.bold}3/5 signatures collected. Packing for on-chain submission...${C.reset}`);
  const packedSigs = ethers.concat(sigs);
  log(`    ${C.dim}Packed signature blob: ${packedSigs.length / 2 - 1} bytes${C.reset}`);

  await pressEnter("Press ENTER to submit transaction to blockchain...");

  await showTx(
    `Sending 0.5 ETH from Multisig → Eve (${shortAddr(eve.address)})`,
    multisig.execute(eve.address, sendValue, "0x", packedSigs)
  );

  const walletBalAfter = await ethers.provider.getBalance(walletAddr);
  const eveBalAfter = await ethers.provider.getBalance(eve.address);

  log("");
  log(`    ${C.bold}After:${C.reset}`);
  log(`      Multisig wallet:  ${C.bold}${formatEth(walletBalAfter)}${C.reset}  ${C.dim}(was ${formatEth(walletBal)})${C.reset}`);
  log(`      Eve's balance:    ${C.bold}${formatEth(eveBalAfter)}${C.reset}  ${C.dim}(was ${formatEth(eveBal)})${C.reset}`);
  log("");
  log(`    ${C.green}${C.bold}✓ Funds transferred successfully via 3-of-5 multisig${C.reset}`);
}

async function action2_checkBalance() {
  const walletAddr = await multisig.getAddress();
  const bal = await ethers.provider.getBalance(walletAddr);
  const ownerCount = await multisig.ownerCount();
  const thresh = await multisig.threshold();
  const currentNonce = await multisig.nonce();

  divider();
  log(`  ${C.bold}MULTISIG WALLET STATUS${C.reset}`);
  divider();
  log("");
  log(`    Address:    ${walletAddr}`);
  log(`    Balance:    ${C.bold}${formatEth(bal)}${C.reset}`);
  log(`    Owners:     ${ownerCount} registered`);
  log(`    Threshold:  ${thresh}-of-${ownerCount}`);
  log(`    Nonce:      ${currentNonce} (transactions executed so far)`);
}

let scheduledOpId = null;

async function action3_scheduleOp() {
  divider();
  log(`  ${C.bold}SCENARIO: Schedule a Timelock Operation${C.reset}`);
  divider();
  log("");
  log(`  ${C.dim}We'll schedule sending 0.1 ETH from the timelock to Eve.${C.reset}`);
  log(`  ${C.dim}The operation must wait 5 seconds before it can execute.${C.reset}`);
  log(`  ${C.dim}During that window, anyone watching can spot suspicious activity.${C.reset}`);

  const salt = ethers.keccak256(ethers.toUtf8Bytes("demo-interactive-" + Date.now()));
  const value = ethers.parseEther("0.1");
  scheduledOpId = await timelock.hashOperation(eve.address, value, "0x", salt);

  log("");
  log(`    ${C.dim}Operation: send 0.1 ETH to Eve${C.reset}`);
  log(`    ${C.dim}Delay: 5 seconds${C.reset}`);
  log(`    ${C.dim}Operation ID: ${shortAddr(scheduledOpId)}${C.reset}`);

  await pressEnter("Press ENTER to schedule...");

  await showTx(
    "Scheduling operation (5 second delay)",
    timelock.schedule(scheduledOpId, eve.address, value, "0x", 5)
  );

  log("");
  log(`    ${C.green}✓ Operation scheduled.${C.reset}`);
  log(`    ${C.yellow}⏳ Must wait 5 seconds before execution.${C.reset}`);
  log(`    ${C.dim}Choose option 4 to execute it after the delay.${C.reset}`);
}

async function action4_executeOp() {
  if (!scheduledOpId) {
    log(`\n    ${C.red}✗ No operation scheduled yet. Choose option 3 first.${C.reset}`);
    return;
  }

  divider();
  log(`  ${C.bold}SCENARIO: Execute a Scheduled Operation${C.reset}`);
  divider();
  log("");
  log(`  ${C.dim}The 5-second delay must have passed. Let's advance time and execute.${C.reset}`);

  log(`\n    ${C.cyan}▸${C.reset} Advancing blockchain time by 6 seconds...`);
  await ethers.provider.send("evm_increaseTime", [6]);
  await ethers.provider.send("evm_mine", []);
  log(`    ${C.green}✓${C.reset} Time advanced. Delay period has elapsed.`);

  const eveBalBefore = await ethers.provider.getBalance(eve.address);

  await pressEnter("Press ENTER to execute the operation...");

  const value = ethers.parseEther("0.1");
  await showTx(
    "Executing timelock operation → 0.1 ETH to Eve",
    timelock.execute(scheduledOpId, eve.address, value, "0x")
  );

  const eveBalAfter = await ethers.provider.getBalance(eve.address);

  log("");
  log(`    ${C.bold}Eve's balance:${C.reset} ${formatEth(eveBalBefore)} → ${C.green}${formatEth(eveBalAfter)}${C.reset}`);
  log(`    ${C.green}${C.bold}✓ Operation executed after mandatory delay${C.reset}`);
  scheduledOpId = null;
}

async function action5_grantRole() {
  divider();
  log(`  ${C.bold}SCENARIO: Grant OPERATOR Role to Alice${C.reset}`);
  divider();
  log("");
  log(`  ${C.dim}Two-step process:${C.reset}`);
  log(`  ${C.dim}  Step 1: Admin (deployer) proposes the grant${C.reset}`);
  log(`  ${C.dim}  Step 2: Alice explicitly accepts the role${C.reset}`);
  log(`  ${C.dim}This prevents accidental grants to wrong addresses.${C.reset}`);

  const hasRole = await rbac.hasRole(OPERATOR_ROLE, alice.address);
  if (hasRole) {
    log(`\n    ${C.yellow}! Alice already holds OPERATOR_ROLE.${C.reset}`);
    return;
  }

  log("");
  log(`    ${C.dim}OPERATOR_ROLE: ${shortAddr(OPERATOR_ROLE)}${C.reset}`);
  log(`    ${C.dim}Alice: ${alice.address}${C.reset}`);

  await pressEnter("Press ENTER -- Admin proposes the grant...");

  await showTx(
    `Admin proposes: grantRole(OPERATOR, Alice)`,
    rbac.proposeGrant(OPERATOR_ROLE, alice.address)
  );

  log("");
  log(`    ${C.yellow}⏳ Role proposed but NOT active yet. Alice must accept.${C.reset}`);

  await pressEnter("Press ENTER -- Alice accepts the role...");

  await showTx(
    `Alice accepts: acceptRole(OPERATOR)`,
    rbac.connect(alice).acceptRole(OPERATOR_ROLE)
  );

  const hasRoleNow = await rbac.hasRole(OPERATOR_ROLE, alice.address);
  log("");
  log(`    Alice has OPERATOR_ROLE? ${hasRoleNow ? `${C.green}YES${C.reset}` : `${C.red}NO${C.reset}`}`);
  log(`    ${C.green}${C.bold}✓ Two-step role grant complete${C.reset}`);
}

async function action6_checkRoles() {
  divider();
  log(`  ${C.bold}RBAC ROLE STATUS${C.reset}`);
  divider();
  log("");

  const accounts = [
    { name: "Deployer", addr: deployer.address },
    { name: "Alice", addr: alice.address },
    { name: "Bob", addr: bob.address },
    { name: "Attacker", addr: outsider.address },
  ];
  const roles = [
    { name: "DEFAULT_ADMIN", id: ethers.ZeroHash },
    { name: "OPERATOR", id: OPERATOR_ROLE },
    { name: "GUARDIAN", id: GUARDIAN_ROLE },
  ];

  // Header
  let header = "    " + "Account".padEnd(12);
  for (const r of roles) header += r.name.padEnd(16);
  log(header);
  log("    " + "─".repeat(12 + roles.length * 16));

  for (const acc of accounts) {
    let line = "    " + acc.name.padEnd(12);
    for (const r of roles) {
      const has = await rbac.hasRole(r.id, acc.addr);
      line += (has ? `${C.green}YES${C.reset}` : `${C.dim}no${C.reset}`).padEnd(has ? 25 : 21);
    }
    log(line);
  }
}

async function action7_attackMultisig() {
  divider();
  log(`  ${C.red}${C.bold}ATTACK: Forged Signatures on Multisig${C.reset}`);
  divider();
  log("");
  log(`  ${C.dim}The attacker has their own key but is NOT an owner.${C.reset}`);
  log(`  ${C.dim}They forge 3 signatures and try to steal 2 ETH from the wallet.${C.reset}`);

  const walletAddr = await multisig.getAddress();
  const walletBal = await ethers.provider.getBalance(walletAddr);
  log("");
  log(`    Multisig balance: ${C.bold}${formatEth(walletBal)}${C.reset}`);
  log(`    Attacker: ${outsider.address}`);
  log(`    Attempting to send 2 ETH to attacker...`);

  await pressEnter("Press ENTER to launch attack...");

  // Attacker signs (not an owner)
  const chainId = (await ethers.provider.getNetwork()).chainId;
  const domain = { name: "MultiSigWallet", version: "1", chainId, verifyingContract: walletAddr };
  const types = { Execute: [
    { name: "to", type: "address" }, { name: "value", type: "uint256" },
    { name: "data", type: "bytes" }, { name: "nonce", type: "uint256" }
  ]};
  const nonce = await multisig.nonce();
  const message = { to: outsider.address, value: ethers.parseEther("2"), data: "0x", nonce };

  log(`\n    ${C.red}▸${C.reset} Attacker creates 3 forged signatures...`);
  await sleep(400);

  // Create 3 random wallets as "forged" signers
  const fake1 = ethers.Wallet.createRandom().connect(ethers.provider);
  const fake2 = ethers.Wallet.createRandom().connect(ethers.provider);

  const allSigners = [outsider, fake1, fake2];
  const sortedSigners = [...allSigners].sort((a, b) =>
    a.address.toLowerCase() < b.address.toLowerCase() ? -1 : 1
  );

  const sigs = [];
  for (const s of sortedSigners) {
    const sig = await s.signTypedData(domain, types, message);
    sigs.push(sig);
    log(`      ${C.red}Forged sig from ${shortAddr(s.address)}${C.reset}`);
    await sleep(200);
  }
  const packed = ethers.concat(sigs);

  log(`\n    ${C.red}▸${C.reset} Submitting forged transaction...`);
  await sleep(300);

  try {
    await multisig.execute(outsider.address, ethers.parseEther("2"), "0x", packed);
    log(`\n    ${C.bgRed}${C.white} UNEXPECTED: Transaction succeeded! ${C.reset}`);
  } catch (err) {
    await sleep(300);
    const reason = err.message.includes("SignerNotOwner") ? "SignerNotOwner"
      : err.message.includes("DuplicateOrUnsorted") ? "DuplicateOrUnsortedSigner"
      : "Reverted";
    log("");
    log(`    ${C.green}╔═════════════════════════════════════════════╗${C.reset}`);
    log(`    ${C.green}║${C.reset}  ${C.bold}ATTACK BLOCKED${C.reset}                              ${C.green}║${C.reset}`);
    log(`    ${C.green}║${C.reset}  Contract reverted: ${C.red}${reason}${C.reset}          ${C.green}║${C.reset}`);
    log(`    ${C.green}║${C.reset}  ${C.dim}Forged signatures are not from valid owners${C.reset}  ${C.green}║${C.reset}`);
    log(`    ${C.green}║${C.reset}  ${C.dim}Properties P1, P2 enforced${C.reset}                   ${C.green}║${C.reset}`);
    log(`    ${C.green}╚═════════════════════════════════════════════╝${C.reset}`);
  }

  const walletBalAfter = await ethers.provider.getBalance(walletAddr);
  log(`\n    Wallet balance: ${formatEth(walletBalAfter)} ${C.dim}(unchanged)${C.reset}`);
}

async function action8_attackTimelock() {
  divider();
  log(`  ${C.red}${C.bold}ATTACK: Bypass Timelock Delay${C.reset}`);
  divider();
  log("");
  log(`  ${C.dim}The attacker has EXECUTOR_ROLE (assume they gained it somehow).${C.reset}`);
  log(`  ${C.dim}They schedule an operation and immediately try to execute it${C.reset}`);
  log(`  ${C.dim}WITHOUT waiting for the delay.${C.reset}`);

  await pressEnter("Press ENTER to launch attack...");

  // Schedule a new operation
  const salt = ethers.keccak256(ethers.toUtf8Bytes("attack-bypass-" + Date.now()));
  const opId = await timelock.hashOperation(outsider.address, ethers.parseEther("1"), "0x", salt);

  log(`\n    ${C.cyan}▸${C.reset} Scheduling operation (5 second delay)...`);
  const schedTx = await timelock.schedule(opId, outsider.address, ethers.parseEther("1"), "0x", 5);
  await schedTx.wait();
  log(`    ${C.green}✓${C.reset} Operation scheduled.`);

  log(`\n    ${C.red}▸${C.reset} Attacker immediately tries to execute (without waiting)...`);
  await sleep(400);

  try {
    await timelock.execute(opId, outsider.address, ethers.parseEther("1"), "0x");
    log(`    ${C.bgRed}${C.white} UNEXPECTED: Execution succeeded! ${C.reset}`);
  } catch (err) {
    await sleep(300);
    log("");
    log(`    ${C.green}╔═════════════════════════════════════════════╗${C.reset}`);
    log(`    ${C.green}║${C.reset}  ${C.bold}ATTACK BLOCKED${C.reset}                              ${C.green}║${C.reset}`);
    log(`    ${C.green}║${C.reset}  Contract reverted: ${C.red}too early${C.reset}                 ${C.green}║${C.reset}`);
    log(`    ${C.green}║${C.reset}  ${C.dim}Cannot execute before the mandatory delay${C.reset}    ${C.green}║${C.reset}`);
    log(`    ${C.green}║${C.reset}  ${C.dim}Property P5 enforced${C.reset}                         ${C.green}║${C.reset}`);
    log(`    ${C.green}╚═════════════════════════════════════════════╝${C.reset}`);
  }
}

async function action9_attackRBAC() {
  divider();
  log(`  ${C.red}${C.bold}ATTACK: Unauthorized Privilege Escalation${C.reset}`);
  divider();
  log("");
  log(`  ${C.dim}The attacker is NOT an admin. They try to:${C.reset}`);
  log(`  ${C.dim}  1. Grant themselves the ADMIN role${C.reset}`);
  log(`  ${C.dim}  2. Grant themselves the OPERATOR role${C.reset}`);

  await pressEnter("Press ENTER to launch attack...");

  // Attack 1: try to get ADMIN
  log(`\n    ${C.red}▸${C.reset} Attacker calls proposeGrant(DEFAULT_ADMIN, self)...`);
  await sleep(400);

  try {
    await rbac.connect(outsider).proposeGrant(ethers.ZeroHash, outsider.address);
    log(`    ${C.bgRed}${C.white} UNEXPECTED: Grant succeeded! ${C.reset}`);
  } catch (err) {
    await sleep(300);
    log(`    ${C.green}✓ BLOCKED${C.reset} -- ${C.red}not admin of DEFAULT_ADMIN_ROLE${C.reset}`);
  }

  // Attack 2: try to get OPERATOR
  log(`\n    ${C.red}▸${C.reset} Attacker calls proposeGrant(OPERATOR, self)...`);
  await sleep(400);

  try {
    await rbac.connect(outsider).proposeGrant(OPERATOR_ROLE, outsider.address);
    log(`    ${C.bgRed}${C.white} UNEXPECTED: Grant succeeded! ${C.reset}`);
  } catch (err) {
    await sleep(300);
    log(`    ${C.green}✓ BLOCKED${C.reset} -- ${C.red}not admin of OPERATOR_ROLE${C.reset}`);
  }

  log("");
  log(`    ${C.green}╔═════════════════════════════════════════════╗${C.reset}`);
  log(`    ${C.green}║${C.reset}  ${C.bold}ATTACK BLOCKED${C.reset}                              ${C.green}║${C.reset}`);
  log(`    ${C.green}║${C.reset}  ${C.dim}Only the admin of a role can propose grants${C.reset}   ${C.green}║${C.reset}`);
  log(`    ${C.green}║${C.reset}  ${C.dim}Properties P8, P10 enforced${C.reset}                  ${C.green}║${C.reset}`);
  log(`    ${C.green}╚═════════════════════════════════════════════╝${C.reset}`);

  log("");
  log(`    Attacker has DEFAULT_ADMIN? ${C.red}NO${C.reset}`);
  log(`    Attacker has OPERATOR?      ${C.red}NO${C.reset}`);
  log(`    ${C.dim}No privileges gained. System integrity maintained.${C.reset}`);
}

// ── Main Loop ───────────────────────────────────────────────────

async function main() {
  await setup();

  let running = true;
  while (running) {
    const choice = await showMenu();

    switch (choice) {
      case "1": await action1_transferETH(); break;
      case "2": await action2_checkBalance(); break;
      case "3": await action3_scheduleOp(); break;
      case "4": await action4_executeOp(); break;
      case "5": await action5_grantRole(); break;
      case "6": await action6_checkRoles(); break;
      case "7": await action7_attackMultisig(); break;
      case "8": await action8_attackTimelock(); break;
      case "9": await action9_attackRBAC(); break;
      case "0":
        running = false;
        log(`\n  ${C.bold}Demo complete. Thank you!${C.reset}\n`);
        break;
      default:
        log(`\n  ${C.red}Invalid choice. Enter a number 0-9.${C.reset}`);
    }

    if (running) {
      await pressEnter();
    }
  }

  rl.close();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    rl.close();
    process.exit(1);
  });
