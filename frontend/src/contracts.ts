import { ethers, EnsPlugin, Network } from "ethers";
import AgentRegistryAbi from "./abis/AgentRegistry.json";
import ReputationTrackerAbi from "./abis/ReputationTracker.json";
import RewardDistributorAbi from "./abis/RewardDistributor.json";
import RewardTokenAbi from "./abis/RewardToken.json";

export const ADDRESSES = {
  agentRegistry:     import.meta.env.VITE_AGENT_REGISTRY_ADDRESS     ?? "",
  rewardDistributor: import.meta.env.VITE_REWARD_DISTRIBUTOR_ADDRESS  ?? "",
  reputationTracker: import.meta.env.VITE_REPUTATION_TRACKER_ADDRESS  ?? "",
  rewardToken:       import.meta.env.VITE_REWARD_TOKEN_ADDRESS        ?? "",
  poolManager:       import.meta.env.VITE_POOL_MANAGER_ADDRESS        ?? "",
  reputationHook:    import.meta.env.VITE_REPUTATION_HOOK_ADDRESS     ?? "",
  ensRegistry:       import.meta.env.VITE_ENS_REGISTRY_ADDRESS        ?? "",
};

export const RPC_URL = import.meta.env.VITE_RPC_URL ?? "http://127.0.0.1:8545";

// Hardhat local chainId = 31337. Attach EnsPlugin on the Network so
// provider.resolveName() uses our deployed ENSRegistry instead of mainnet.
export function getProvider() {
  if (ADDRESSES.ensRegistry) {
    const network = Network.from(31337n);
    network.attachPlugin(new EnsPlugin(ADDRESSES.ensRegistry, 31337));
    return new ethers.JsonRpcProvider(RPC_URL, network, { staticNetwork: true });
  }
  return new ethers.JsonRpcProvider(RPC_URL);
}

export function getAgentRegistry(provider: ethers.Provider) {
  return new ethers.Contract(ADDRESSES.agentRegistry, AgentRegistryAbi, provider);
}

export function getReputationTracker(provider: ethers.Provider) {
  return new ethers.Contract(ADDRESSES.reputationTracker, ReputationTrackerAbi, provider);
}

export function getRewardDistributor(provider: ethers.Provider) {
  return new ethers.Contract(ADDRESSES.rewardDistributor, RewardDistributorAbi, provider);
}

export function getRewardToken(provider: ethers.Provider) {
  return new ethers.Contract(ADDRESSES.rewardToken, RewardTokenAbi, provider);
}

export const TIER_LABELS: Record<number, string> = {
  0: "BRONZE",
  1: "SILVER",
  2: "GOLD",
  3: "PLATINUM",
};

export const TIER_FEES: Record<string, string> = {
  BRONZE: "0.30%",
  SILVER: "0.20%",
  GOLD:   "0.10%",
  PLATINUM: "0.05%",
};

export const TIER_COLORS: Record<string, string> = {
  BRONZE:   "#cd7f32",
  SILVER:   "#aaa9ad",
  GOLD:     "#ffd700",
  PLATINUM: "#e5e4e2",
};

// Model type → provider label for display
export const MODEL_PROVIDER: Record<string, string> = {
  "grok-3-mini":    "xAI / Grok",
  "deepseek-chat":  "DeepSeek",
  "claude-opus-4-7": "Anthropic / Claude",
};
