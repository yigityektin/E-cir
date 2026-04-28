import { expect } from "chai";
import { ethers } from "hardhat";
import { RewardToken, ReputationTracker, RewardDistributor } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("RewardDistributor", function () {
  let rewardToken: RewardToken;
  let reputationTracker: ReputationTracker;
  let distributor: RewardDistributor;
  let owner: SignerWithAddress;
  let agent1: SignerWithAddress;
  let agent2: SignerWithAddress;
  let agent3: SignerWithAddress;

  const TASK_ID = "task_001";
  const TOTAL_REWARD = ethers.parseEther("1000"); // 1000 AIPERF

  beforeEach(async function () {
    [owner, agent1, agent2, agent3] = await ethers.getSigners();

    const TokenFactory = await ethers.getContractFactory("RewardToken");
    rewardToken = await TokenFactory.deploy();

    const ReputationFactory = await ethers.getContractFactory("ReputationTracker");
    reputationTracker = await ReputationFactory.deploy();

    const DistributorFactory = await ethers.getContractFactory("RewardDistributor");
    distributor = await DistributorFactory.deploy(
      await rewardToken.getAddress(),
      await reputationTracker.getAddress()
    );

    // Wire permissions
    await rewardToken.grantMinterRole(await distributor.getAddress());
    await reputationTracker.setOperator(await distributor.getAddress());
  });

  describe("submitScore", function () {
    it("owner can submit scores", async function () {
      await expect(
        distributor.submitScore(TASK_ID, agent1.address, 82, "0g://eval/1")
      ).to.emit(distributor, "ScoreSubmitted")
        .withArgs(TASK_ID, agent1.address, 82, "0g://eval/1");
    });

    it("reverts on score > 100", async function () {
      await expect(
        distributor.submitScore(TASK_ID, agent1.address, 101, "uri")
      ).to.be.revertedWith("RewardDistributor: score out of range");
    });

    it("reverts on duplicate submission", async function () {
      await distributor.submitScore(TASK_ID, agent1.address, 80, "uri");
      await expect(
        distributor.submitScore(TASK_ID, agent1.address, 90, "uri2")
      ).to.be.revertedWith("RewardDistributor: score already submitted");
    });
  });

  describe("distributeRewards", function () {
    beforeEach(async function () {
      // Scores: 50 + 30 + 20 = 100 total
      await distributor.submitScore(TASK_ID, agent1.address, 50, "0g://eval/1");
      await distributor.submitScore(TASK_ID, agent2.address, 30, "0g://eval/2");
      await distributor.submitScore(TASK_ID, agent3.address, 20, "0g://eval/3");
      await distributor.setTaskReward(TASK_ID, TOTAL_REWARD);
    });

    it("mints proportional rewards to agents", async function () {
      await distributor.distributeRewards(TASK_ID);

      // agent1 gets 50% = 500 AIPERF
      expect(await rewardToken.balanceOf(agent1.address)).to.equal(
        ethers.parseEther("500")
      );
      // agent2 gets 30% = 300 AIPERF
      expect(await rewardToken.balanceOf(agent2.address)).to.equal(
        ethers.parseEther("300")
      );
      // agent3 gets 20% = 200 AIPERF
      expect(await rewardToken.balanceOf(agent3.address)).to.equal(
        ethers.parseEther("200")
      );
    });

    it("updates reputation after distribution", async function () {
      await distributor.distributeRewards(TASK_ID);

      const [avgScore, completedTasks] = await reputationTracker.getReputation(agent1.address);
      expect(completedTasks).to.equal(1);
      expect(avgScore).to.equal(50);
    });

    it("emits RewardsDistributed event", async function () {
      await expect(distributor.distributeRewards(TASK_ID))
        .to.emit(distributor, "RewardsDistributed")
        .withArgs(TASK_ID, TOTAL_REWARD, 3);
    });

    it("reverts on second distribution attempt", async function () {
      await distributor.distributeRewards(TASK_ID);
      await expect(
        distributor.distributeRewards(TASK_ID)
      ).to.be.revertedWith("RewardDistributor: already finalized");
    });

    it("reverts if reward not set", async function () {
      const DistributorFactory = await ethers.getContractFactory("RewardDistributor");
      const fresh = await DistributorFactory.deploy(
        await rewardToken.getAddress(),
        await reputationTracker.getAddress()
      );
      await rewardToken.grantMinterRole(await fresh.getAddress());
      await fresh.submitScore("task_002", agent1.address, 80, "uri");

      await expect(fresh.distributeRewards("task_002"))
        .to.be.revertedWith("RewardDistributor: reward not set");
    });
  });
});
