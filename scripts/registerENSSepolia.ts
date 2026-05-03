/**
 * Registers agenttry.eth on Sepolia ENS and creates subnames for each agent.
 * Run: ./node_modules/.bin/hardhat run scripts/registerENSSepolia.ts --network sepolia
 *
 * Verified Sepolia ENS addresses (docs.ens.domains/deployments):
 *   Registry:           0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e
 *   ETHRegistrarCtrl:   0xfb3cE5D01e0f33f41DbB39035dB9745962F1f968
 *   NameWrapper:        0x0635513f179D50A207757E05759CbD106d7dFcE8
 *   PublicResolver:     0xE99638b40E4Fff0129D56f03b55b6bbC4BBE49b5
 */

import { ethers } from "hardhat";

const ENS_REGISTRY    = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";
const ETH_REG_CTRL    = "0xfb3cE5D01e0f33f41DbB39035dB9745962F1f968";
const PUBLIC_RESOLVER = "0xE99638b40E4Fff0129D56f03b55b6bbC4BBE49b5";

// Agent wallets — same hardhat accounts used in setup.ts
const AGENTS = [
  { label: "agent1", wallet: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", model: "grok-3-mini" },
  { label: "agent2", wallet: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", model: "deepseek-chat" },
  { label: "agent3", wallet: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", model: "claude-opus-4-7" },
];

const ONE_YEAR = BigInt(365 * 24 * 60 * 60);

// New ENS controller uses a Registration struct (staging branch)
const BASE_REGISTRAR = "0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85";

const baseAbi = [
  "function available(uint256 id) view returns (bool)",
];

const ctrlAbi = [
  "function rentPrice(string label, uint256 duration) view returns (uint256 base, uint256 premium)",
  "function makeCommitment((string label, address owner, uint256 duration, bytes32 secret, address resolver, bytes[] data, uint8 reverseRecord, bytes32 referrer) registration) pure returns (bytes32)",
  "function commit(bytes32 commitment) external",
  "function register((string label, address owner, uint256 duration, bytes32 secret, address resolver, bytes[] data, uint8 reverseRecord, bytes32 referrer) registration) external payable",
  "function minCommitmentAge() view returns (uint256)",
];

const ensRegistryAbi = [
  "function setSubnodeOwner(bytes32 node, bytes32 label, address owner) external returns (bytes32)",
  "function setResolver(bytes32 node, address resolver) external",
  "function owner(bytes32 node) view returns (address)",
];

const resolverAbi = [
  "function setAddr(bytes32 node, address addr) external",
];

async function main() {
  const [deployer] = await ethers.getSigners();
  const provider   = deployer.provider!;

  console.log("Deployer:", deployer.address);
  const balance = await provider.getBalance(deployer.address);
  console.log("Balance: ", ethers.formatEther(balance), "ETH\n");

  const base_      = new ethers.Contract(BASE_REGISTRAR,   baseAbi,        deployer);
  const ctrl       = new ethers.Contract(ETH_REG_CTRL,     ctrlAbi,        deployer);
  const ensReg     = new ethers.Contract(ENS_REGISTRY,     ensRegistryAbi, deployer);
  const resolver   = new ethers.Contract(PUBLIC_RESOLVER,  resolverAbi,    deployer);

  // ── 1. Register agenttry.eth (skip if already registered) ────────────────
  const labelHash = ethers.keccak256(ethers.toUtf8Bytes("agenttry"));
  const isAvailable = await base_.available(BigInt(labelHash));

  if (isAvailable) {
    const [base, premium] = await ctrl.rentPrice("agenttry", ONE_YEAR);
    const price           = base + premium;
    const priceWithBuffer = price * 110n / 100n;
    console.log(`agenttry.eth rent (1yr): ${ethers.formatEther(price)} ETH`);
    console.log(`Sending:                 ${ethers.formatEther(priceWithBuffer)} ETH (+10% buffer)\n`);

    const secret = ethers.hexlify(ethers.randomBytes(32));
    const registration = {
      label: "agenttry", owner: deployer.address, duration: ONE_YEAR,
      secret, resolver: PUBLIC_RESOLVER, data: [], reverseRecord: 0,
      referrer: ethers.ZeroHash,
    };

    console.log("--- Step 1: Commit ---");
    const commitTx = await ctrl.commit(await ctrl.makeCommitment(registration));
    await commitTx.wait();
    console.log("Committed:", commitTx.hash);

    const minAge = Number(await ctrl.minCommitmentAge());
    console.log(`\nWaiting ${minAge + 5}s for commitment to mature...`);
    await new Promise((r) => setTimeout(r, (minAge + 5) * 1000));

    console.log("\n--- Step 2: Register ---");
    const registerTx = await ctrl.register(registration, { value: priceWithBuffer });
    await registerTx.wait();
    console.log("Registered agenttry.eth  TX:", registerTx.hash);
  } else {
    console.log("agenttry.eth already registered — skipping to subnames.\n");
  }

  // ── 5. Create subnames via ENS Registry (name is not wrapped) ───────────
  console.log("\n--- Step 3: Create subnames ---");
  const agenttryNode  = ethers.namehash("agenttry.eth");
  const subLabelHash = (l: string) => ethers.keccak256(ethers.toUtf8Bytes(l));

  for (const agent of AGENTS) {
    // setSubnodeOwner creates agentN.agenttry.eth owned by deployer
    const subTx = await ensReg.setSubnodeOwner(
      agenttryNode,
      subLabelHash(agent.label),
      deployer.address
    );
    await subTx.wait();

    // Set resolver for this subname
    const subNode = ethers.namehash(`${agent.label}.agenttry.eth`);
    const resTx = await ensReg.setResolver(subNode, PUBLIC_RESOLVER);
    await resTx.wait();

    // Set addr record on PublicResolver
    const addrTx = await resolver["setAddr(bytes32,address)"](subNode, agent.wallet);
    await addrTx.wait();

    console.log(`✓ ${agent.label}.agenttry.eth → ${agent.wallet}  (${agent.model})`);
  }

  // ── 7. Summary ────────────────────────────────────────────────────────────
  console.log("\n=== ENS registration complete ===");
  console.log("\nLinks (switch wallet to Sepolia on app.ens.domains):");
  console.log("  https://app.ens.domains/agenttry.eth");
  for (const agent of AGENTS) {
    console.log(`  https://app.ens.domains/${agent.label}.agenttry.eth`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
