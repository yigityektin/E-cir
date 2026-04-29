import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { getProvider, getRewardDistributor } from "../contracts";

export interface TaskScore {
  wallet: string;
  score: number;
  rewarded: boolean;
}

export interface TaskData {
  taskId: string;
  totalReward: string;
  finalized: boolean;
  participantCount: number;
  scores: TaskScore[];
}

export function useTask(taskId: string, refreshKey: number) {
  const [task, setTask] = useState<TaskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!taskId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const provider = getProvider();
        const distributor = getRewardDistributor(provider);

        const [rewardBig, finalized, count] = await distributor.getTask(taskId);
        const [participants, scores, rewarded] = await distributor.getTaskScores(taskId);

        const taskScores: TaskScore[] = (participants as string[]).map((w: string, i: number) => ({
          wallet: w,
          score: Number(scores[i]),
          rewarded: rewarded[i] as boolean,
        }));

        if (!cancelled) {
          setTask({
            taskId,
            totalReward: ethers.formatEther(rewardBig),
            finalized: finalized as boolean,
            participantCount: Number(count),
            scores: taskScores,
          });
        }
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [taskId, refreshKey]);

  return { task, loading, error };
}
