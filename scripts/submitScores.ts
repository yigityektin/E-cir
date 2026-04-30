import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

interface AgentPayload {
  agentId: string;
  agentEns: string;
  agentWallet: string;
  outputURI: string;
  evaluationURI: string;
  outputHash: string;
  evaluationHash: string;
  finalScore: number;
  latencyMs: number;
  costEstimate: number;
}

interface FinalResult {
  taskId: string;
  taskType: string;
  agents: AgentPayload[];
  winner: { agentId: string; agentWallet: string; finalScore: number };
  totalReward: string;
}

async function main() {
  const distributorAddr = process.env.REWARD_DISTRIBUTOR_ADDRESS;
  if (!distributorAddr) throw new Error("REWARD_DISTRIBUTOR_ADDRESS not set in .env");

  const resultPath = path.resolve(__dirname, "../outputs/final_result.json");
  if (!fs.existsSync(resultPath)) {
    throw new Error(`final_result.json not found at ${resultPath}. Run the backend pipeline first.`);
  }

  const result: FinalResult = JSON.parse(fs.readFileSync(resultPath, "utf-8"));
  const { taskId, agents, totalReward } = result;

  const [deployer] = await ethers.getSigners();
  console.log("Submitting scores with:", deployer.address);

  const distributor = await ethers.getContractAt("RewardDistributor", distributorAddr, deployer);

  // 1. Set task reward pool
  console.log(`\n--- Setting reward for task ${taskId}: ${ethers.formatEther(totalReward)} AIPERF ---`);
  const tx0 = await distributor.setTaskReward(taskId, BigInt(totalReward));
  await tx0.wait();
  console.log("Reward set.");

  // 2. Submit each agent's score
  console.log("\n--- Submitting scores ---");
  for (const agent of agents) {
    console.log(
      `  ${agent.agentEns} (${agent.agentWallet})  score=${agent.finalScore}  eval=${agent.evaluationURI}`
    );
    const tx = await distributor.submitScore(
      taskId,
      agent.agentWallet,
      agent.finalScore,
      agent.evaluationURI
    );
    await tx.wait();
    console.log(`  ✓ submitted`);
  }

  // 3. Distribute rewards (mints AIPERF, updates reputation)
  console.log("\n--- Distributing rewards ---");
  const txDist = await distributor.distributeRewards(taskId);
  await txDist.wait();
  console.log("Rewards distributed and reputation updated.");

  // 4. Print final state (best-effort — read calls may lag on local node)
  console.log("\n=== Task settlement complete ===");
  try {
    const [rewardTotal, finalized, count] = await distributor.getTask(taskId);
    console.log(`Task ${taskId}: finalized=${finalized}, pool=${ethers.formatEther(rewardTotal)} AIPERF, participants=${count}`);

    const [participants, scores] = await distributor.getTaskScores(taskId);
    console.log("\nAgent scores on-chain:");
    for (let i = 0; i < participants.length; i++) {
      const agent = agents.find((a) => a.agentWallet.toLowerCase() === participants[i].toLowerCase());
      console.log(`  ${agent?.agentEns ?? participants[i]}  score=${scores[i]}`);
    }
  } catch {
    console.log("(on-chain state read skipped — distribution already confirmed above)");
  }

  console.log(`\nWinner: ${result.winner.agentEns ?? result.winner.agentId}  (score=${result.winner.finalScore})`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
