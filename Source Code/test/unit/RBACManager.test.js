const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RBACManager", function () {
  let rbac;
  let admin, userA, userB, nonAdmin;

  // Role identifiers — arbitrary bytes32 values (the contract is generic)
  const DEFAULT_ADMIN_ROLE = ethers.ZeroHash; // bytes32(0)
  const OPERATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("OPERATOR_ROLE"));
  const GUARDIAN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("GUARDIAN_ROLE"));

  beforeEach(async function () {
    const signers = await ethers.getSigners();
    admin = signers[0];
    userA = signers[1];
    userB = signers[2];
    nonAdmin = signers[3];

    const Factory = await ethers.getContractFactory("RBACManager");
    // Constructor takes no arguments; deployer gets DEFAULT_ADMIN_ROLE
    rbac = await Factory.deploy();
    await rbac.waitForDeployment();
  });

  // ---------- Two-step role grant: propose then accept ----------
  describe("Two-step role grant (P9)", function () {
    it("should grant a role only after propose + accept", async function () {
      // userA does not have OPERATOR_ROLE
      expect(await rbac.hasRole(OPERATOR_ROLE, userA.address)).to.be.false;

      // Admin proposes the grant
      await rbac.connect(admin).proposeGrant(OPERATOR_ROLE, userA.address);

      // Role is NOT yet granted
      expect(await rbac.hasRole(OPERATOR_ROLE, userA.address)).to.be.false;

      // Pending flag is set
      expect(
        await rbac.isPendingGrant(OPERATOR_ROLE, userA.address)
      ).to.be.true;

      // userA accepts
      await rbac.connect(userA).acceptRole(OPERATOR_ROLE);

      // Now the role IS granted
      expect(await rbac.hasRole(OPERATOR_ROLE, userA.address)).to.be.true;

      // Pending flag cleared
      expect(
        await rbac.isPendingGrant(OPERATOR_ROLE, userA.address)
      ).to.be.false;
    });
  });

  // ---------- Reject direct grant without proposal ----------
  describe("Reject acceptRole without prior proposal (P9)", function () {
    it("should revert acceptRole when there is no pending grant", async function () {
      await expect(
        rbac.connect(userB).acceptRole(OPERATOR_ROLE)
      ).to.be.revertedWithCustomError(rbac, "NoPendingGrant");
    });
  });

  // ---------- Reject proposeGrant from non-admin (P8) ----------
  describe("Reject proposeGrant from non-admin (P8)", function () {
    it("should revert when a non-admin calls proposeGrant", async function () {
      await expect(
        rbac.connect(nonAdmin).proposeGrant(OPERATOR_ROLE, userA.address)
      ).to.be.revertedWithCustomError(rbac, "AccessDenied");
    });

    it("should revert when a holder of OPERATOR_ROLE tries to grant OPERATOR_ROLE", async function () {
      // Give userA the OPERATOR_ROLE via proper two-step
      await rbac.connect(admin).proposeGrant(OPERATOR_ROLE, userA.address);
      await rbac.connect(userA).acceptRole(OPERATOR_ROLE);
      expect(await rbac.hasRole(OPERATOR_ROLE, userA.address)).to.be.true;

      // OPERATOR_ROLE holders are NOT the admin of OPERATOR_ROLE
      await expect(
        rbac.connect(userA).proposeGrant(OPERATOR_ROLE, userB.address)
      ).to.be.revertedWithCustomError(rbac, "AccessDenied");
    });
  });

  // ---------- Revoke role by admin ----------
  describe("Revoke role by admin", function () {
    it("should allow admin to revoke a role from a holder", async function () {
      // Grant OPERATOR_ROLE to userA
      await rbac.connect(admin).proposeGrant(OPERATOR_ROLE, userA.address);
      await rbac.connect(userA).acceptRole(OPERATOR_ROLE);
      expect(await rbac.hasRole(OPERATOR_ROLE, userA.address)).to.be.true;

      // Admin revokes
      await rbac.connect(admin).revokeRole(OPERATOR_ROLE, userA.address);

      expect(await rbac.hasRole(OPERATOR_ROLE, userA.address)).to.be.false;
    });

    it("should revert when a non-admin tries to revoke a role", async function () {
      // Grant OPERATOR_ROLE to userA
      await rbac.connect(admin).proposeGrant(OPERATOR_ROLE, userA.address);
      await rbac.connect(userA).acceptRole(OPERATOR_ROLE);

      // nonAdmin tries to revoke
      await expect(
        rbac.connect(nonAdmin).revokeRole(OPERATOR_ROLE, userA.address)
      ).to.be.revertedWithCustomError(rbac, "AccessDenied");
    });
  });

  // ---------- Renounce role by holder ----------
  describe("Renounce role by holder", function () {
    it("should allow a role holder to renounce their own role", async function () {
      // Grant OPERATOR_ROLE to userA
      await rbac.connect(admin).proposeGrant(OPERATOR_ROLE, userA.address);
      await rbac.connect(userA).acceptRole(OPERATOR_ROLE);
      expect(await rbac.hasRole(OPERATOR_ROLE, userA.address)).to.be.true;

      // userA renounces (must pass their own address)
      await rbac.connect(userA).renounceRole(OPERATOR_ROLE, userA.address);

      expect(await rbac.hasRole(OPERATOR_ROLE, userA.address)).to.be.false;
    });
  });

  // ---------- No privilege escalation (P10) ----------
  describe("No privilege escalation (P10)", function () {
    it("should prevent a non-admin from granting themselves an admin role", async function () {
      // nonAdmin does not hold DEFAULT_ADMIN_ROLE
      expect(await rbac.hasRole(DEFAULT_ADMIN_ROLE, nonAdmin.address)).to.be
        .false;

      // nonAdmin attempts to propose granting DEFAULT_ADMIN_ROLE to themselves
      await expect(
        rbac
          .connect(nonAdmin)
          .proposeGrant(DEFAULT_ADMIN_ROLE, nonAdmin.address)
      ).to.be.revertedWithCustomError(rbac, "AccessDenied");
    });

    it("should not allow OPERATOR role holder to grant GUARDIAN role", async function () {
      // Grant OPERATOR_ROLE to userA
      await rbac.connect(admin).proposeGrant(OPERATOR_ROLE, userA.address);
      await rbac.connect(userA).acceptRole(OPERATOR_ROLE);

      // OPERATOR trying to grant GUARDIAN (admin of GUARDIAN is DEFAULT_ADMIN_ROLE)
      await expect(
        rbac.connect(userA).proposeGrant(GUARDIAN_ROLE, userB.address)
      ).to.be.revertedWithCustomError(rbac, "AccessDenied");
    });

    it("should not change admin mappings when a role is granted", async function () {
      // Record admin of GUARDIAN_ROLE before granting OPERATOR_ROLE
      const adminBefore = await rbac.getRoleAdmin(GUARDIAN_ROLE);

      // Grant OPERATOR_ROLE to userA
      await rbac.connect(admin).proposeGrant(OPERATOR_ROLE, userA.address);
      await rbac.connect(userA).acceptRole(OPERATOR_ROLE);

      // Admin of GUARDIAN_ROLE must be unchanged
      const adminAfter = await rbac.getRoleAdmin(GUARDIAN_ROLE);
      expect(adminAfter).to.equal(adminBefore);
    });
  });
});
