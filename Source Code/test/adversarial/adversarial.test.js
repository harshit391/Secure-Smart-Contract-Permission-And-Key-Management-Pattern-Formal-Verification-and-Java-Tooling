const { expect } = require("chai");
const { ethers } = require("hardhat");

/**
 * Adversarial Simulation Tests
 *
 * These tests correspond to the three attack scenarios described in Section VI-B
 * of the paper "Secure Smart-Contract Permission & Key Management."
 *
 * Scenario 1: Single-key compromise in 3-of-5 multisig
 * Scenario 2: Timelock bypass attempt
 * Scenario 3: Unauthorized role escalation
 */
describe("Adversarial Simulations", function () {
  // ========================================================================
  // Scenario 1: Single-key compromise in 3-of-5 multisig
  // ========================================================================
  describe("Scenario 1: Single-key compromise -- forged signatures rejected", function () {
    let wallet;
    let owners;
    let attacker;
    let innocentTarget;

    const THRESHOLD = 3;

    let domain;
    const types = {
      Execute: [
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "data", type: "bytes" },
        { name: "nonce", type: "uint256" },
      ],
    };

    beforeEach(async function () {
      const signers = await ethers.getSigners();
      owners = signers.slice(0, 5);
      attacker = signers[0]; // attacker compromised owner[0]'s key
      innocentTarget = signers[6];

      const Factory = await ethers.getContractFactory("MultiSigWallet");
      wallet = await Factory.deploy(
        owners.map((o) => o.address),
        THRESHOLD
      );
      await wallet.waitForDeployment();

      const chainId = (await ethers.provider.getNetwork()).chainId;
      domain = {
        name: "MultiSigWallet",
        version: "1",
        chainId: chainId,
        verifyingContract: await wallet.getAddress(),
      };

      // Fund the wallet
      await signers[7].sendTransaction({
        to: await wallet.getAddress(),
        value: ethers.parseEther("10"),
      });
    });

    it("should reject execution when attacker has 1 real key and forges 2 others", async function () {
      const drainTarget = innocentTarget.address;
      const drainValue = ethers.parseEther("10");
      const data = "0x";
      const nonce = await wallet.nonce();

      const message = { to: drainTarget, value: drainValue, data, nonce };

      // Attacker signs with the compromised key (owner[0])
      const realSig = await attacker.signTypedData(domain, types, message);

      // Attacker creates two random wallets and signs with them (forged sigs)
      const forger1 = ethers.Wallet.createRandom();
      const forger2 = ethers.Wallet.createRandom();
      const forgedSig1 = await forger1.signTypedData(domain, types, message);
      const forgedSig2 = await forger2.signTypedData(domain, types, message);

      // Sort signatures by signer address to satisfy ordering requirement
      const sigPairs = [
        { sig: realSig, addr: attacker.address },
        { sig: forgedSig1, addr: forger1.address },
        { sig: forgedSig2, addr: forger2.address },
      ].sort((a, b) =>
        a.addr.toLowerCase() < b.addr.toLowerCase() ? -1 : 1
      );
      const packedSigs = ethers.concat(sigPairs.map((p) => p.sig));

      // The contract must reject because forger1 and forger2 are not owners
      await expect(
        wallet.execute(drainTarget, drainValue, data, packedSigs)
      ).to.be.revertedWithCustomError(wallet, "SignerNotOwner");
    });

    it("should reject execution when attacker supplies only their own signature", async function () {
      const nonce = await wallet.nonce();
      const message = {
        to: innocentTarget.address,
        value: ethers.parseEther("5"),
        data: "0x",
        nonce,
      };

      const sig = await attacker.signTypedData(domain, types, message);
      const packedSigs = sig; // single 65-byte sig

      // Only 1 of 3 required signatures
      await expect(
        wallet.execute(
          innocentTarget.address,
          ethers.parseEther("5"),
          "0x",
          packedSigs
        )
      ).to.be.revertedWithCustomError(wallet, "InsufficientSignatures");
    });
  });

  // ========================================================================
  // Scenario 2: Timelock bypass
  // ========================================================================
  describe("Scenario 2: Timelock bypass attempt -- early execution rejected", function () {
    let timelock;
    let proposer, executor;
    let targetAddr;

    const MIN_DELAY = 3600;

    beforeEach(async function () {
      const signers = await ethers.getSigners();
      proposer = signers[0];
      executor = signers[1]; // attacker has EXECUTOR_ROLE
      targetAddr = signers[4].address;

      const Factory = await ethers.getContractFactory("TimelockController");
      timelock = await Factory.deploy(
        MIN_DELAY,
        [proposer.address],
        [executor.address],
        [signers[2].address], // canceller
        proposer.address      // admin
      );
      await timelock.waitForDeployment();
    });

    it("should revert when attacker with EXECUTOR_ROLE tries to execute before eta", async function () {
      const value = 0;
      const data = "0x";
      const salt = ethers.keccak256(ethers.toUtf8Bytes("adversarial-bypass"));
      const delay = MIN_DELAY + 7200; // 3 hours total

      const id = await timelock.hashOperation(targetAddr, value, data, salt);

      await timelock.connect(proposer).schedule(id, targetAddr, value, data, delay);

      // Attacker immediately tries to execute (no time advancement)
      await expect(
        timelock.connect(executor).execute(id, targetAddr, value, data)
      ).to.be.revertedWithCustomError(timelock, "OperationNotReady");
    });

    it("should revert even 1 second before eta", async function () {
      const value = 0;
      const data = "0x";
      const salt = ethers.keccak256(ethers.toUtf8Bytes("adversarial-1sec"));
      const delay = MIN_DELAY + 60;

      const id = await timelock.hashOperation(targetAddr, value, data, salt);

      await timelock.connect(proposer).schedule(id, targetAddr, value, data, delay);

      // Advance time to just under eta (delay - 2 seconds to account for block)
      await ethers.provider.send("evm_increaseTime", [delay - 2]);
      await ethers.provider.send("evm_mine", []);

      await expect(
        timelock.connect(executor).execute(id, targetAddr, value, data)
      ).to.be.revertedWithCustomError(timelock, "OperationNotReady");
    });
  });

  // ========================================================================
  // Scenario 3: Unauthorized role escalation
  // ========================================================================
  describe("Scenario 3: Unauthorized role escalation -- proposeGrant rejected", function () {
    let rbac;
    let admin, attacker;

    const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
    const OPERATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("OPERATOR_ROLE"));
    const GUARDIAN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("GUARDIAN_ROLE"));

    beforeEach(async function () {
      const signers = await ethers.getSigners();
      admin = signers[0];
      attacker = signers[3]; // no roles assigned

      const Factory = await ethers.getContractFactory("RBACManager");
      rbac = await Factory.deploy();
      await rbac.waitForDeployment();
    });

    it("should revert when attacker proposes DEFAULT_ADMIN_ROLE for themselves", async function () {
      // Verify attacker has no admin role
      expect(await rbac.hasRole(DEFAULT_ADMIN_ROLE, attacker.address)).to.be
        .false;

      await expect(
        rbac
          .connect(attacker)
          .proposeGrant(DEFAULT_ADMIN_ROLE, attacker.address)
      ).to.be.revertedWithCustomError(rbac, "AccessDenied");

      // Confirm attacker still has no role
      expect(await rbac.hasRole(DEFAULT_ADMIN_ROLE, attacker.address)).to.be
        .false;
    });

    it("should revert when attacker proposes OPERATOR_ROLE for themselves", async function () {
      await expect(
        rbac.connect(attacker).proposeGrant(OPERATOR_ROLE, attacker.address)
      ).to.be.revertedWithCustomError(rbac, "AccessDenied");
    });

    it("should revert when attacker proposes a role for an accomplice", async function () {
      const accomplice = (await ethers.getSigners())[5];

      await expect(
        rbac
          .connect(attacker)
          .proposeGrant(GUARDIAN_ROLE, accomplice.address)
      ).to.be.revertedWithCustomError(rbac, "AccessDenied");
    });

    it("should revert when OPERATOR holder tries to escalate to ADMIN", async function () {
      // First, legitimately grant OPERATOR_ROLE to attacker via admin
      await rbac.connect(admin).proposeGrant(OPERATOR_ROLE, attacker.address);
      await rbac.connect(attacker).acceptRole(OPERATOR_ROLE);
      expect(await rbac.hasRole(OPERATOR_ROLE, attacker.address)).to.be.true;

      // Now attacker (OPERATOR) tries to grant themselves DEFAULT_ADMIN_ROLE
      await expect(
        rbac
          .connect(attacker)
          .proposeGrant(DEFAULT_ADMIN_ROLE, attacker.address)
      ).to.be.revertedWithCustomError(rbac, "AccessDenied");

      // Confirm no escalation occurred
      expect(await rbac.hasRole(DEFAULT_ADMIN_ROLE, attacker.address)).to.be
        .false;
    });
  });
});
