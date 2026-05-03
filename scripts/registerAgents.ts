import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

// Fake agents for demo — replace wallets with real ones before mainnet.
const DEMO_AGENTS = [
  {
    ensName: "agent1.agenttry.eth",
    wallet: "0x32e126D1F3A8d321f0BEDba681F1274512a7907C",
    modelType: "claude-opus-4-7",
    specialization: "coding",
    metadataURI: "0g://metadata/agent1",
  },
  {
    ensName: "agent2.agenttry.eth",
    wallet: "0x2222222222222222222222222222222222222222",
    modelType: "claude-sonnet-4-6",
    specialization: "reasoning",
    metadataURI: "0g://metadata/agent2",
  },
  {
    ensName: "agent3.agenttry.eth",
    wallet: "0x3333333333333333333333333333333333333333",
    modelType: "claude-haiku-4-5",
    specialization: "general",
    metadataURI: "0g://metadata/agent3",
  },
];

async function main() {
  const registryAddr = process.env.AGENT_REGISTRY_ADDRESS;
  if (!registryAddr) {
    throw new Error("AGENT_REGISTRY_ADDRESS not set in .env");
  }

  const [deployer] = await ethers.getSigners();
  const registry = await ethers.getContractAt("AgentRegistry", registryAddr, deployer);

  console.log("Registering agents via:", deployer.address);
  console.log("AgentRegistry at:     ", registryAddr, "\n");

  for (const agent of DEMO_AGENTS) {
    const alreadyRegistered = await registry.isRegistered(agent.wallet);
    if (alreadyRegistered) {
      console.log(`Skip (already registered): ${agent.ensName}`);
      continue;
    }

    const tx = await registry.registerAgent(
      agent.ensName,
      agent.wallet,
      agent.modelType,
      agent.specialization,
      agent.metadataURI
    );
    await tx.wait();
    console.log(`Registered: ${agent.ensName} → ${agent.wallet}`);
  }

  console.log("\nDone. Verifying registry state:");
  const all = await registry.getRegisteredAgents();
  for (const addr of all) {
    const data = await registry.getAgent(addr);
    console.log(` ${data.ensName}  (${data.modelType} / ${data.specialization})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
