import { expect } from "chai";
import { ethers } from "hardhat";
import { ReputationTracker } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("ReputationTracker", function () {
  let tracker: ReputationTracker;
  let owner: SignerWithAddress;
  let operator: SignerWithAddress;
  let agent: SignerWithAddress;

  // Tier enum order matches contract: BRONZE=0, SILVER=1, GOLD=2, PLATINUM=3
  const BRONZE   = 0n;
  const SILVER   = 1n;
  const GOLD     = 2n;
  const PLATINUM = 3n;

  beforeEach(async function () {
    [owner, operator, agent] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReputationTracker");
    tracker = await Factory.deploy();
    await tracker.setOperator(operator.address);
  });

  it("starts with zero reputation (BRONZE)", async function () {
    const [avg, tasks, rewards, tier] = await tracker.getReputation(agent.address);
    expect(avg).to.equal(0);
    expect(tasks).to.equal(0);
    expect(rewards).to.equal(0);
    expect(tier).to.equal(BRONZE);
  });

  it("operator can update reputation", async function () {
    await expect(tracker.connect(operator).updateReputation(agent.address, 60, 100))
      .to.emit(tracker, "ReputationUpdated");

    const [avg, tasks] = await tracker.getReputation(agent.address);
    expect(avg).to.equal(60);
    expect(tasks).to.equal(1);
  });

  it("non-operator cannot update reputation", async function () {
    await expect(
      tracker.updateReputation(agent.address, 60, 100)
    ).to.be.revertedWith("ReputationTracker: caller is not operator");
  });

  it("calculates average score across multiple tasks", async function () {
    await tracker.connect(operator).updateReputation(agent.address, 80, 0);
    await tracker.connect(operator).updateReputation(agent.address, 60, 0);
    // avg = (80+60)/2 = 70
    expect(await tracker.getAverageScore(agent.address)).to.equal(70);
  });

  describe("tier thresholds", function () {
    it("avg < 50 → BRONZE", async function () {
      await tracker.connect(operator).updateReputation(agent.address, 40, 0);
      expect(await tracker.getTier(agent.address)).to.equal(BRONZE);
    });

    it("avg >= 50 → SILVER", async function () {
      await tracker.connect(operator).updateReputation(agent.address, 50, 0);
      expect(await tracker.getTier(agent.address)).to.equal(SILVER);
    });

    it("avg >= 70 → GOLD", async function () {
      await tracker.connect(operator).updateReputation(agent.address, 70, 0);
      expect(await tracker.getTier(agent.address)).to.equal(GOLD);
    });

    it("avg >= 90 → PLATINUM", async function () {
      await tracker.connect(operator).updateReputation(agent.address, 90, 0);
      expect(await tracker.getTier(agent.address)).to.equal(PLATINUM);
    });
  });
});
