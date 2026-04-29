import { useEffect, useState } from "react";
import { ethers } from "ethers";
import {
  getProvider,
  getAgentRegistry,
  getReputationTracker,
  getRewardToken,
  TIER_LABELS,
  TIER_FEES,
} from "../contracts";

export interface AgentData {
  wallet: string;
  ensName: string;
  modelType: string;
  specialization: string;
  averageScore: number;
  completedTasks: number;
  totalRewards: string;
  tier: string;
  swapFee: string;
  tokenBalance: string;
}

export function useAgents(refreshKey: number) {
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const provider = getProvider();
        const registry = getAgentRegistry(provider);
        const reputation = getReputationTracker(provider);
        const token = getRewardToken(provider);

        const wallets: string[] = await registry.getRegisteredAgents();
        const results = await Promise.all(
          wallets.map(async (wallet) => {
            const [agentData, rep, balance] = await Promise.all([
              registry.getAgent(wallet),
              reputation.getReputation(wallet),
              token.balanceOf(wallet),
            ]);

            const tierNum = Number(rep[3]);
            const tierLabel = TIER_LABELS[tierNum] ?? "BRONZE";

            return {
              wallet,
              ensName: agentData.ensName,
              modelType: agentData.modelType,
              specialization: agentData.specialization,
              averageScore: Number(rep[0]),
              completedTasks: Number(rep[1]),
              totalRewards: ethers.formatEther(rep[2]),
              tier: tierLabel,
              swapFee: TIER_FEES[tierLabel] ?? "0.30%",
              tokenBalance: ethers.formatEther(balance),
            } satisfies AgentData;
          })
        );

        if (!cancelled) setAgents(results);
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [refreshKey]);

  return { agents, loading, error };
}
