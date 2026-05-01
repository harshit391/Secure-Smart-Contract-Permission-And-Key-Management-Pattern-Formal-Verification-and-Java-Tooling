const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MultiSigWallet", function () {
  let wallet;
  let owners;
  let nonOwner;
  const THRESHOLD = 3;

  // EIP-712 domain and types (must match the contract)
  let domain;
  const types = {
    Execute: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "data", type: "bytes" },
      { name: "nonce", type: "uint256" },
    ],
  };

  // Helper: collect sorted packed signatures via EIP-712 signTypedData
  async function collectSignatures(signers, message) {
    const sorted = [...signers].sort((a, b) =>
      a.address.toLowerCase() < b.address.toLowerCase() ? -1 : 1
    );
    const sigs = [];
    for (const signer of sorted) {
      const sig = await signer.signTypedData(domain, types, message);
      sigs.push(sig);
    }
    return ethers.concat(sigs);
  }

  beforeEach(async function () {
    const signers = await ethers.getSigners();
    owners = signers.slice(0, 5);
    nonOwner = signers[5];

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

    // Fund the wallet so it can send value
    await owners[0].sendTransaction({
      to: await wallet.getAddress(),
      value: ethers.parseEther("10"),
    });
  });

  // ---------- Successful 3-of-5 execution ----------
  describe("Successful execution (3-of-5)", function () {
    it("should execute a transaction with 3 valid owner signatures", async function () {
      const target = nonOwner.address;
      const value = ethers.parseEther("1");
      const data = "0x";
      const nonce = await wallet.nonce();

      const message = { to: target, value, data, nonce };
      const packedSigs = await collectSignatures(
        [owners[0], owners[2], owners[4]],
        message
      );

      const balBefore = await ethers.provider.getBalance(target);
      await wallet.execute(target, value, data, packedSigs);
      const balAfter = await ethers.provider.getBalance(target);

      expect(balAfter - balBefore).to.equal(value);
    });

    it("should increment the nonce after successful execution", async function () {
      const nonceBefore = await wallet.nonce();
      const message = {
        to: nonOwner.address,
        value: 0,
        data: "0x",
        nonce: nonceBefore,
      };
      const packedSigs = await collectSignatures(
        [owners[0], owners[1], owners[2]],
        message
      );

      await wallet.execute(nonOwner.address, 0, "0x", packedSigs);

      const nonceAfter = await wallet.nonce();
      expect(nonceAfter).to.equal(nonceBefore + 1n);
    });
  });

  // ---------- Rejection: fewer than threshold ----------
  describe("Rejection with insufficient signatures", function () {
    it("should revert when only 2 signatures are provided (below threshold)", async function () {
      const nonce = await wallet.nonce();
      const message = { to: nonOwner.address, value: 0, data: "0x", nonce };
      const packedSigs = await collectSignatures(
        [owners[0], owners[1]],
        message
      );

      await expect(
        wallet.execute(nonOwner.address, 0, "0x", packedSigs)
      ).to.be.revertedWithCustomError(wallet, "InsufficientSignatures");
    });
  });

  // ---------- Rejection: duplicate signatures ----------
  describe("Rejection with duplicate signatures", function () {
    it("should revert when the same owner signs twice", async function () {
      const nonce = await wallet.nonce();
      const message = { to: nonOwner.address, value: 0, data: "0x", nonce };

      const sig0 = await owners[0].signTypedData(domain, types, message);
      const sig1 = await owners[1].signTypedData(domain, types, message);

      // Submit sig0 twice + sig1 — duplicate signer check must catch this
      const packed = ethers.concat([sig0, sig0, sig1]);

      await expect(
        wallet.execute(nonOwner.address, 0, "0x", packed)
      ).to.be.reverted;
    });
  });

  // ---------- Replay protection ----------
  describe("Replay attack prevention (P3)", function () {
    it("should reject reuse of signatures after nonce increment", async function () {
      const nonce = await wallet.nonce();
      const message = { to: nonOwner.address, value: 0, data: "0x", nonce };
      const packedSigs = await collectSignatures(
        [owners[0], owners[1], owners[2]],
        message
      );

      // First execution succeeds
      await wallet.execute(nonOwner.address, 0, "0x", packedSigs);

      // Replay: same sigs, same params — nonce has changed on-chain
      await expect(
        wallet.execute(nonOwner.address, 0, "0x", packedSigs)
      ).to.be.reverted;
    });
  });

  // ---------- Governance: addOwner via self-call ----------
  describe("addOwner through multisig self-call (P4)", function () {
    it("should add a new owner when called through execute", async function () {
      const newOwner = (await ethers.getSigners())[6];
      const walletAddr = await wallet.getAddress();

      const addOwnerData = wallet.interface.encodeFunctionData("addOwner", [
        newOwner.address,
      ]);

      const nonce = await wallet.nonce();
      const message = { to: walletAddr, value: 0, data: addOwnerData, nonce };
      const packedSigs = await collectSignatures(
        [owners[0], owners[1], owners[3]],
        message
      );

      await wallet.execute(walletAddr, 0, addOwnerData, packedSigs);

      expect(await wallet.isOwner(newOwner.address)).to.be.true;
    });

    it("should revert when addOwner is called directly (not via execute)", async function () {
      const newOwner = (await ethers.getSigners())[6];
      await expect(
        wallet.connect(owners[0]).addOwner(newOwner.address)
      ).to.be.revertedWithCustomError(wallet, "NotSelf");
    });
  });

  // ---------- Governance: removeOwner via self-call ----------
  describe("removeOwner through multisig self-call (P4)", function () {
    it("should remove an owner when called through execute", async function () {
      const ownerToRemove = owners[4];
      const walletAddr = await wallet.getAddress();

      const removeOwnerData = wallet.interface.encodeFunctionData(
        "removeOwner",
        [ownerToRemove.address]
      );

      const nonce = await wallet.nonce();
      const message = {
        to: walletAddr,
        value: 0,
        data: removeOwnerData,
        nonce,
      };
      const packedSigs = await collectSignatures(
        [owners[0], owners[1], owners[2]],
        message
      );

      await wallet.execute(walletAddr, 0, removeOwnerData, packedSigs);

      expect(await wallet.isOwner(ownerToRemove.address)).to.be.false;
    });

    it("should revert when removeOwner is called directly", async function () {
      await expect(
        wallet.connect(owners[0]).removeOwner(owners[4].address)
      ).to.be.revertedWithCustomError(wallet, "NotSelf");
    });
  });

  // ---------- Governance: changeThreshold via self-call ----------
  describe("changeThreshold through multisig self-call (P4)", function () {
    it("should change the threshold when called through execute", async function () {
      const walletAddr = await wallet.getAddress();
      const newThreshold = 4;

      const changeData = wallet.interface.encodeFunctionData(
        "changeThreshold",
        [newThreshold]
      );

      const nonce = await wallet.nonce();
      const message = { to: walletAddr, value: 0, data: changeData, nonce };
      const packedSigs = await collectSignatures(
        [owners[0], owners[2], owners[3]],
        message
      );

      await wallet.execute(walletAddr, 0, changeData, packedSigs);

      expect(await wallet.threshold()).to.equal(newThreshold);
    });

    it("should revert when changeThreshold is called directly", async function () {
      await expect(
        wallet.connect(owners[0]).changeThreshold(2)
      ).to.be.revertedWithCustomError(wallet, "NotSelf");
    });
  });
});
