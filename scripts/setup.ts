import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

const AGENTS = [
  {
    ensName: "agent1.agentry.eth",
    wallet: "",                      // boş bırakılırsa deployer cüzdanı atanır (aşağıda doldurulur)
    modelType: "claude-opus-4-7",
    specialization: "coding",
    metadataURI: "0g://metadata/agent1",
  },
  {
    ensName: "agent2.agentry.eth",
    wallet: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",  // hardhat account[1]
    modelType: "claude-sonnet-4-6",
    specialization: "reasoning",
    metadataURI: "0g://metadata/agent2",
  },
  {
    ensName: "agent3.agentry.eth",
    wallet: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",  // hardhat account[2]
    modelType: "claude-haiku-4-5",
    specialization: "general",
    metadataURI: "0g://metadata/agent3",
  },
];

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // agent1'in wallet'ını deployer olarak set et (kendi cüzdanın)
  AGENTS[0].wallet = deployer.address;

  // ── 1. Deploy ──────────────────────────────────────────────────────────────

  console.log("\n--- Deploying contracts ---");

  const RewardToken = await ethers.getContractFactory("RewardToken");
  const rewardToken = await RewardToken.deploy();
  await rewardToken.waitForDeployment();
  console.log("RewardToken:       ", await rewardToken.getAddress());

  const ReputationTracker = await ethers.getContractFactory("ReputationTracker");
  const reputationTracker = await ReputationTracker.deploy();
  await reputationTracker.waitForDeployment();
  console.log("ReputationTracker: ", await reputationTracker.getAddress());

  const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
  const agentRegistry = await AgentRegistry.deploy();
  await agentRegistry.waitForDeployment();
  console.log("AgentRegistry:     ", await agentRegistry.getAddress());

  const RewardDistributor = await ethers.getContractFactory("RewardDistributor");
  const rewardDistributor = await RewardDistributor.deploy(
    await rewardToken.getAddress(),
    await reputationTracker.getAddress()
  );
  await rewardDistributor.waitForDeployment();
  console.log("RewardDistributor: ", await rewardDistributor.getAddress());

  // ── 2. Wire permissions ────────────────────────────────────────────────────

  console.log("\n--- Wiring permissions ---");
  await (await rewardToken.grantMinterRole(await rewardDistributor.getAddress())).wait();
  console.log("RewardToken: MINTER_ROLE → RewardDistributor");

  await (await reputationTracker.setOperator(await rewardDistributor.getAddress())).wait();
  console.log("ReputationTracker: operator → RewardDistributor");

  // ── 3. Register agents ─────────────────────────────────────────────────────

  console.log("\n--- Registering agents ---");
  for (const agent of AGENTS) {
    const tx = await agentRegistry.registerAgent(
      agent.ensName,
      agent.wallet,
      agent.modelType,
      agent.specialization,
      agent.metadataURI
    );
    await tx.wait();
    console.log(`  ${agent.ensName} → ${agent.wallet}`);
  }

  // ── 4. Summary ─────────────────────────────────────────────────────────────

  console.log("\n=== Setup complete ===");
  console.log(".env için:");
  console.log(`REWARD_TOKEN_ADDRESS=${await rewardToken.getAddress()}`);
  console.log(`REPUTATION_TRACKER_ADDRESS=${await reputationTracker.getAddress()}`);
  console.log(`AGENT_REGISTRY_ADDRESS=${await agentRegistry.getAddress()}`);
  console.log(`REWARD_DISTRIBUTOR_ADDRESS=${await rewardDistributor.getAddress()}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
