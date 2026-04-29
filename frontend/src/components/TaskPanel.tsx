import type { TaskData } from "../hooks/useTask";
import type { AgentData } from "../hooks/useAgents";

interface Props {
  task: TaskData | null;
  agents: AgentData[];
  loading: boolean;
  taskId: string;
  onTaskIdChange: (id: string) => void;
  onRefresh: () => void;
}

export function TaskPanel({ task, agents, loading, taskId, onTaskIdChange, onRefresh }: Props) {
  const ensFor = (wallet: string) =>
    agents.find((a) => a.wallet.toLowerCase() === wallet.toLowerCase())?.ensName ?? wallet.slice(0, 10) + "…";

  return (
    <div style={{
      background: "#0f0f1e",
      border: "1px solid #2a2a4a",
      borderRadius: 12,
      padding: "24px 28px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <h2 style={{ margin: 0, color: "#e0e0ff", fontSize: 18 }}>Task Scores</h2>
        <input
          value={taskId}
          onChange={(e) => onTaskIdChange(e.target.value)}
          placeholder="task_001"
          style={{
            background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 6,
            color: "#ccc", padding: "4px 10px", fontSize: 13, width: 120,
          }}
        />
        <button onClick={onRefresh} style={{
          background: "#2a2a5a", border: "1px solid #4a4aaa", borderRadius: 6,
          color: "#aaaaff", padding: "4px 14px", fontSize: 13, cursor: "pointer",
        }}>
          Refresh
        </button>
      </div>

      {loading && <div style={{ color: "#666" }}>Loading…</div>}

      {!loading && task && (
        <>
          <div style={{ display: "flex", gap: 24, marginBottom: 20, flexWrap: "wrap" }}>
            <Stat label="Reward Pool" value={`${parseFloat(task.totalReward).toFixed(4)} AIPERF`} />
            <Stat label="Participants" value={String(task.participantCount)} />
            <Stat label="Status" value={task.finalized ? "Finalized" : "Pending"} highlight={task.finalized ? "#4ade80" : "#facc15"} />
          </div>

          {task.scores.length === 0 && (
            <div style={{ color: "#666", fontSize: 14 }}>No scores submitted yet.</div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[...task.scores]
              .sort((a, b) => b.score - a.score)
              .map((s, i) => (
                <ScoreRow
                  key={s.wallet}
                  rank={i + 1}
                  ens={ensFor(s.wallet)}
                  wallet={s.wallet}
                  score={s.score}
                  rewarded={s.rewarded}
                />
              ))}
          </div>
        </>
      )}

      {!loading && !task && (
        <div style={{ color: "#666", fontSize: 14 }}>No data for task "{taskId}".</div>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "#555", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: highlight ?? "#e0e0ff" }}>{value}</div>
    </div>
  );
}

function ScoreRow({ rank, ens, score, rewarded }: {
  rank: number; ens: string; wallet?: string; score: number; rewarded: boolean;
}) {
  const barW = `${score}%`;
  return (
    <div style={{
      background: "#1a1a2e", borderRadius: 8, padding: "10px 14px",
      display: "flex", alignItems: "center", gap: 12,
    }}>
      <span style={{ fontSize: 13, color: "#555", width: 20 }}>#{rank}</span>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 14, color: "#ccc" }}>{ens}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#e0e0ff" }}>{score}</span>
        </div>
        <div style={{ background: "#0a0a1a", borderRadius: 4, height: 6 }}>
          <div style={{
            width: barW, height: "100%", borderRadius: 4,
            background: score >= 85 ? "#4ade80" : score >= 65 ? "#facc15" : "#f87171",
          }} />
        </div>
      </div>
      <span style={{
        fontSize: 11, padding: "2px 8px", borderRadius: 99,
        background: rewarded ? "#14532d" : "#1c1c1c",
        color: rewarded ? "#4ade80" : "#555",
      }}>
        {rewarded ? "rewarded" : "pending"}
      </span>
    </div>
  );
}
