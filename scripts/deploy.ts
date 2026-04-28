import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // 1. RewardToken
  const RewardToken = await ethers.getContractFactory("RewardToken");
  const rewardToken = await RewardToken.deploy();
  await rewardToken.waitForDeployment();
  console.log("RewardToken:        ", await rewardToken.getAddress());

  // 2. ReputationTracker
  const ReputationTracker = await ethers.getContractFactory("ReputationTracker");
  const reputationTracker = await ReputationTracker.deploy();
  await reputationTracker.waitForDeployment();
  console.log("ReputationTracker:  ", await reputationTracker.getAddress());

  // 3. AgentRegistry
  const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
  const agentRegistry = await AgentRegistry.deploy();
  await agentRegistry.waitForDeployment();
  console.log("AgentRegistry:      ", await agentRegistry.getAddress());

  // 4. RewardDistributor
  const RewardDistributor = await ethers.getContractFactory("RewardDistributor");
  const rewardDistributor = await RewardDistributor.deploy(
    await rewardToken.getAddress(),
    await reputationTracker.getAddress()
  );
  await rewardDistributor.waitForDeployment();
  console.log("RewardDistributor:  ", await rewardDistributor.getAddress());

  // 5. Wire up permissions
  console.log("\n--- Wiring up permissions ---");

  // RewardToken: grant MINTER_ROLE to RewardDistributor
  const tx1 = await rewardToken.grantMinterRole(await rewardDistributor.getAddress());
  await tx1.wait();
  console.log("RewardToken: granted MINTER_ROLE to RewardDistributor");

  // ReputationTracker: set operator to RewardDistributor
  const tx2 = await reputationTracker.setOperator(await rewardDistributor.getAddress());
  await tx2.wait();
  console.log("ReputationTracker: operator set to RewardDistributor");

  // 6. ReputationHook (skip on local hardhat unless POOL_MANAGER_ADDRESS is set)
  const poolManagerAddr = process.env.POOL_MANAGER_ADDRESS;
  const treasuryAddr = process.env.EVALUATOR_TREASURY_ADDRESS || deployer.address;

  if (poolManagerAddr && poolManagerAddr !== "0x0000000000000000000000000000000000000000") {
    console.log("\n--- Deploying ReputationHook ---");
    console.log("NOTE: Hook address must have BEFORE_SWAP permission bit set.");
    console.log("      Use HookMiner to find the correct salt before deploying to mainnet.");

    const ReputationHook = await ethers.getContractFactory("ReputationHook");
    const reputationHook = await ReputationHook.deploy(
      poolManagerAddr,
      await reputationTracker.getAddress(),
      treasuryAddr
    );
    await reputationHook.waitForDeployment();
    console.log("ReputationHook:     ", await reputationHook.getAddress());
  } else {
    console.log("\nSkipping ReputationHook (POOL_MANAGER_ADDRESS not set)");
  }

  console.log("\n=== Deployment complete ===");
  console.log("Add these to your .env:");
  console.log(`REWARD_TOKEN_ADDRESS=${await rewardToken.getAddress()}`);
  console.log(`REPUTATION_TRACKER_ADDRESS=${await reputationTracker.getAddress()}`);
  console.log(`AGENT_REGISTRY_ADDRESS=${await agentRegistry.getAddress()}`);
  console.log(`REWARD_DISTRIBUTOR_ADDRESS=${await rewardDistributor.getAddress()}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
