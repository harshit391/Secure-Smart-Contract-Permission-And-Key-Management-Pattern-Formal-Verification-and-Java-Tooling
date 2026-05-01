const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TimelockController", function () {
  let timelock;
  let proposer, executor, canceller, unauthorized;
  let target; // EOA target for simplicity

  const MIN_DELAY = 3600; // 1 hour in seconds

  // Helper: advance block timestamp
  async function increaseTime(seconds) {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine", []);
  }

  beforeEach(async function () {
    const signers = await ethers.getSigners();
    proposer = signers[0];
    executor = signers[1];
    canceller = signers[2];
    unauthorized = signers[3];
    target = signers[4]; // EOA target

    const Factory = await ethers.getContractFactory("TimelockController");
    timelock = await Factory.deploy(
      MIN_DELAY,
      [proposer.address],   // proposers
      [executor.address],   // executors
      [canceller.address],  // cancellers
      proposer.address      // admin
    );
    await timelock.waitForDeployment();

    // Fund the timelock so it can send value
    await proposer.sendTransaction({
      to: await timelock.getAddress(),
      value: ethers.parseEther("5"),
    });
  });

  // ---------- Schedule and execute after delay (happy path) ----------
  describe("Schedule and execute after delay", function () {
    it("should schedule an operation and execute it after the delay", async function () {
      const targetAddr = target.address;
      const value = ethers.parseEther("1");
      const data = "0x";
      const salt = ethers.keccak256(ethers.toUtf8Bytes("salt-1"));
      const delay = MIN_DELAY + 60;

      const id = await timelock.hashOperation(targetAddr, value, data, salt);

      // Schedule
      await timelock.connect(proposer).schedule(id, targetAddr, value, data, delay);

      // Verify it is scheduled (eta > 0)
      const eta = await timelock.getTimestamp(id);
      expect(eta).to.be.gt(0);

      // Advance time past eta
      await increaseTime(delay + 120);

      // Execute
      const balBefore = await ethers.provider.getBalance(targetAddr);
      await timelock.connect(executor).execute(id, targetAddr, value, data);
      const balAfter = await ethers.provider.getBalance(targetAddr);

      expect(balAfter - balBefore).to.equal(value);

      // Verify the timestamp is now the sentinel value (1 = done)
      expect(await timelock.getTimestamp(id)).to.equal(1);
    });
  });

  // ---------- P5: Reject early execution ----------
  describe("Reject early execution (P5)", function () {
    it("should revert when execute is called before the scheduled time", async function () {
      const targetAddr = target.address;
      const value = 0;
      const data = "0x";
      const salt = ethers.keccak256(ethers.toUtf8Bytes("salt-early"));
      const delay = MIN_DELAY + 3600; // schedule far in the future

      const id = await timelock.hashOperation(targetAddr, value, data, salt);

      await timelock.connect(proposer).schedule(id, targetAddr, value, data, delay);

      // Do NOT advance time — still before eta
      await expect(
        timelock.connect(executor).execute(id, targetAddr, value, data)
      ).to.be.revertedWithCustomError(timelock, "OperationNotReady");
    });
  });

  // ---------- P7: Reject expired execution ----------
  describe("Reject expired execution (P7)", function () {
    it("should revert when execute is called after eta + GRACE_PERIOD", async function () {
      const targetAddr = target.address;
      const value = 0;
      const data = "0x";
      const salt = ethers.keccak256(ethers.toUtf8Bytes("salt-expired"));
      const delay = MIN_DELAY;

      const id = await timelock.hashOperation(targetAddr, value, data, salt);

      await timelock.connect(proposer).schedule(id, targetAddr, value, data, delay);

      // GRACE_PERIOD is 14 days = 1209600 seconds
      // Advance time past eta + GRACE_PERIOD
      await increaseTime(delay + 1209600 + 120);

      await expect(
        timelock.connect(executor).execute(id, targetAddr, value, data)
      ).to.be.revertedWithCustomError(timelock, "OperationExpired");
    });
  });

  // ---------- Cancel by authorized canceller ----------
  describe("Cancel by authorized canceller", function () {
    it("should allow the canceller to cancel a scheduled operation", async function () {
      const targetAddr = target.address;
      const value = 0;
      const data = "0x";
      const salt = ethers.keccak256(ethers.toUtf8Bytes("salt-cancel"));
      const delay = MIN_DELAY;

      const id = await timelock.hashOperation(targetAddr, value, data, salt);

      await timelock.connect(proposer).schedule(id, targetAddr, value, data, delay);
      expect(await timelock.getTimestamp(id)).to.be.gt(0);

      // Cancel
      await timelock.connect(canceller).cancel(id);

      // Timestamp should be cleared (back to 0)
      expect(await timelock.getTimestamp(id)).to.equal(0);
    });
  });

  // ---------- P6: Reject cancel by unauthorized account ----------
  describe("Reject cancel by unauthorized account (P6)", function () {
    it("should revert when an unauthorized account tries to cancel", async function () {
      const targetAddr = target.address;
      const value = 0;
      const data = "0x";
      const salt = ethers.keccak256(ethers.toUtf8Bytes("salt-unauth-cancel"));
      const delay = MIN_DELAY;

      const id = await timelock.hashOperation(targetAddr, value, data, salt);

      await timelock.connect(proposer).schedule(id, targetAddr, value, data, delay);

      await expect(
        timelock.connect(unauthorized).cancel(id)
      ).to.be.revertedWithCustomError(timelock, "AccessDenied");
    });
  });

  // ---------- Edge case: double execution ----------
  describe("Double execution prevention", function () {
    it("should revert on second execution of the same operation", async function () {
      const targetAddr = target.address;
      const value = 0;
      const data = "0x";
      const salt = ethers.keccak256(ethers.toUtf8Bytes("salt-double"));
      const delay = MIN_DELAY;

      const id = await timelock.hashOperation(targetAddr, value, data, salt);

      await timelock.connect(proposer).schedule(id, targetAddr, value, data, delay);
      await increaseTime(delay + 120);
      await timelock.connect(executor).execute(id, targetAddr, value, data);

      // Attempt re-execution
      await expect(
        timelock.connect(executor).execute(id, targetAddr, value, data)
      ).to.be.revertedWithCustomError(timelock, "OperationAlreadyExecuted");
    });
  });
});
