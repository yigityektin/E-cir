import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

// ── Agent definitions — must match actual AI providers used in backend ────────
const AGENTS = [
  {
    ensName: "agent1.agentry.eth",
    wallet: "",                                              // set to deployer below
    modelType: "grok-3-mini",
    specialization: "fast-coding",
    metadataURI: "0g://metadata/agent1",
  },
  {
    ensName: "agent2.agentry.eth",
    wallet: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",   // hardhat account[1]
    modelType: "deepseek-chat",
    specialization: "reasoning",
    metadataURI: "0g://metadata/agent2",
  },
  {
    ensName: "agent3.agentry.eth",
    wallet: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",   // hardhat account[2]
    modelType: "claude-opus-4-7",
    specialization: "high-quality",
    metadataURI: "0g://metadata/agent3",
  },
];

// ── Uniswap v4 hook permission flag for beforeSwap ───────────────────────────
// Hooks.sol: beforeSwap = 1 << 7 = 0x0080
// Address lower 14 bits must equal exactly 0x0080
const HOOKS_MASK     = 0x3FFFn;
const BEFORE_SWAP_FLAG = 0x0080n;
// DYNAMIC_FEE_FLAG for pool initialization
const DYNAMIC_FEE_FLAG = 0x800000;

async function mineHookSalt(
  deployerAddr: string,
  initCodeHash: string
): Promise<string> {
  console.log("  Mining CREATE2 salt for ReputationHook address...");
  for (let i = 0n; ; i++) {
    const salt = ethers.zeroPadValue(ethers.toBeHex(i), 32);
    const addr = ethers.getCreate2Address(deployerAddr, salt, initCodeHash);
    if ((BigInt(addr) & HOOKS_MASK) === BEFORE_SWAP_FLAG) {
      console.log(`  Found salt after ${i + 1n} iterations → hook: ${addr}`);
      return salt;
    }
  }
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  AGENTS[0].wallet = deployer.address;

  // ── 1. Core contracts ─────────────────────────────────────────────────────

  console.log("\n--- Deploying contracts ---");

  const RewardToken = await ethers.getContractFactory("RewardToken");
  const rewardToken = await RewardToken.deploy();
  await rewardToken.waitForDeployment();
  console.log("RewardToken:        ", await rewardToken.getAddress());

  const ReputationTracker = await ethers.getContractFactory("ReputationTracker");
  const reputationTracker = await ReputationTracker.deploy();
  await reputationTracker.waitForDeployment();
  console.log("ReputationTracker:  ", await reputationTracker.getAddress());

  const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
  const agentRegistry = await AgentRegistry.deploy();
  await agentRegistry.waitForDeployment();
  console.log("AgentRegistry:      ", await agentRegistry.getAddress());

  const RewardDistributor = await ethers.getContractFactory("RewardDistributor");
  const rewardDistributor = await RewardDistributor.deploy(
    await rewardToken.getAddress(),
    await reputationTracker.getAddress()
  );
  await rewardDistributor.waitForDeployment();
  console.log("RewardDistributor:  ", await rewardDistributor.getAddress());

  // ── 2. Uniswap v4 PoolManager ─────────────────────────────────────────────

  console.log("\n--- Deploying Uniswap v4 PoolManager ---");

  const pmArtifactPath = path.resolve(
    __dirname,
    "../node_modules/@uniswap/v4-core/out/PoolManager.sol/PoolManager.json"
  );
  const pmArtifact = JSON.parse(fs.readFileSync(pmArtifactPath, "utf-8"));
  const PoolManagerFactory = new ethers.ContractFactory(
    pmArtifact.abi,
    pmArtifact.bytecode.object,
    deployer
  );
  const poolManager = await PoolManagerFactory.deploy(deployer.address);
  await poolManager.waitForDeployment();
  const poolManagerAddr = await poolManager.getAddress();
  console.log("PoolManager:        ", poolManagerAddr);

  // ── 3. ReputationHook via CREATE2 ─────────────────────────────────────────

  console.log("\n--- Deploying ReputationHook ---");

  // Deploy Create2Deployer first
  const Create2Deployer = await ethers.getContractFactory("Create2Deployer");
  const create2Deployer = await Create2Deployer.deploy();
  await create2Deployer.waitForDeployment();
  const create2Addr = await create2Deployer.getAddress();
  console.log("Create2Deployer:    ", create2Addr);

  // Build hook init code = bytecode + constructor args
  const ReputationHook = await ethers.getContractFactory("ReputationHook");
  const constructorArgs = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "address", "address"],
    [poolManagerAddr, await reputationTracker.getAddress(), deployer.address]
  );
  const initCode = ethers.concat([ReputationHook.bytecode, constructorArgs]);
  const initCodeHash = ethers.keccak256(initCode);

  // Mine salt that gives correct beforeSwap permission bits
  const salt = await mineHookSalt(create2Addr, initCodeHash);

  // Deploy hook at mined address
  const deployTx = await create2Deployer.deploy(salt, initCode);
  await deployTx.wait();

  const hookAddr = ethers.getCreate2Address(create2Addr, salt, initCodeHash);
  console.log("ReputationHook:     ", hookAddr);

  // Verify address has correct flags
  const addrBits = BigInt(hookAddr) & HOOKS_MASK;
  console.log(
    `  beforeSwap flag check: ${addrBits === BEFORE_SWAP_FLAG ? "✓ PASS" : "✗ FAIL"}`
  );

  // ── 4. Initialize ETH/AIPERF pool with hook ───────────────────────────────

  console.log("\n--- Initializing AIPERF/ETH pool ---");

  const tokenAddr = await rewardToken.getAddress();
  // currency0 < currency1: ETH (address(0)) < token address always
  const [currency0, currency1] =
    ethers.ZeroAddress.toLowerCase() < tokenAddr.toLowerCase()
      ? [ethers.ZeroAddress, tokenAddr]
      : [tokenAddr, ethers.ZeroAddress];

  const poolKey = {
    currency0,
    currency1,
    fee: DYNAMIC_FEE_FLAG,
    tickSpacing: 60,
    hooks: hookAddr,
  };

  // sqrtPriceX96 = sqrt(1) * 2^96 → 1:1 price ratio
  const sqrtPriceX96 = 79228162514264337593543950336n;
  const initPoolTx = await poolManager.initialize(poolKey, sqrtPriceX96);
  await (await initPoolTx).wait();
  console.log("Pool initialized: ETH/AIPERF with ReputationHook");

  // ── 5. Wire permissions ───────────────────────────────────────────────────

  console.log("\n--- Wiring permissions ---");
  await (await rewardToken.grantMinterRole(await rewardDistributor.getAddress())).wait();
  console.log("RewardToken: MINTER_ROLE → RewardDistributor");

  await (await reputationTracker.setOperator(await rewardDistributor.getAddress())).wait();
  console.log("ReputationTracker: operator → RewardDistributor");

  // ── 6. Register agents ────────────────────────────────────────────────────

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
    console.log(`  ${agent.ensName} → ${agent.wallet} (${agent.modelType})`);
  }

  // ── 7. Summary ────────────────────────────────────────────────────────────

  console.log("\n=== Setup complete ===");
  console.log(".env için:");
  console.log(`REWARD_TOKEN_ADDRESS=${await rewardToken.getAddress()}`);
  console.log(`REPUTATION_TRACKER_ADDRESS=${await reputationTracker.getAddress()}`);
  console.log(`AGENT_REGISTRY_ADDRESS=${await agentRegistry.getAddress()}`);
  console.log(`REWARD_DISTRIBUTOR_ADDRESS=${await rewardDistributor.getAddress()}`);
  console.log(`POOL_MANAGER_ADDRESS=${poolManagerAddr}`);
  console.log(`REPUTATION_HOOK_ADDRESS=${hookAddr}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
