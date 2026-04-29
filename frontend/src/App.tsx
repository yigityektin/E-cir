import { useState, useEffect, useCallback } from "react";
import { getProvider, ADDRESSES } from "./contracts";
import { useAgents } from "./hooks/useAgents";
import { useTask } from "./hooks/useTask";
import { AgentCard } from "./components/AgentCard";
import { TaskPanel } from "./components/TaskPanel";
import { StatusBar } from "./components/StatusBar";

export default function App() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [taskId, setTaskId] = useState("task_001");
  const [connected, setConnected] = useState(false);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const { agents, loading: agentsLoading, error: agentsError } = useAgents(refreshKey);
  const { task, loading: taskLoading } = useTask(taskId, refreshKey);

  useEffect(() => {
    const addressesSet = Object.values(ADDRESSES).every(Boolean);
    if (!addressesSet) { setConnected(false); return; }

    const provider = getProvider();
    provider.getNetwork().then(() => setConnected(true)).catch(() => setConnected(false));
  }, []);

  const winner = task
    ? agents.find((a) => {
        const topScore = task.scores.reduce((mx, s) => Math.max(mx, s.score), 0);
        const winnerScore = task.scores.find((s) => s.score === topScore);
        return winnerScore && a.wallet.toLowerCase() === winnerScore.wallet.toLowerCase();
      })
    : undefined;

  return (
    <div style={{ minHeight: "100vh", background: "#07071a", color: "#e0e0ff", fontFamily: "system-ui, sans-serif" }}>
      <div style={{
        padding: "20px 32px",
        borderBottom: "1px solid #1a1a2e",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>
            AI Agent Marketplace
          </h1>
          <div style={{ fontSize: 13, color: "#555", marginTop: 2 }}>
            Performance · Reputation · Reward
          </div>
        </div>
        <button
          onClick={refresh}
          style={{
            background: "#1a1a3e", border: "1px solid #3a3a6a",
            borderRadius: 8, color: "#aaaaff", padding: "8px 18px",
            fontSize: 13, cursor: "pointer", fontWeight: 600,
          }}
        >
          Refresh All
        </button>
      </div>

      <StatusBar connected={connected} error={agentsError} />

      <div style={{ padding: "32px", maxWidth: 1200, margin: "0 auto" }}>

        <section style={{ marginBottom: 40 }}>
          <h2 style={{ margin: "0 0 20px", fontSize: 16, color: "#888", fontWeight: 500, textTransform: "uppercase", letterSpacing: 1 }}>
            Registered Agents
          </h2>

          {agentsLoading && <div style={{ color: "#555" }}>Loading agents…</div>}

          {!agentsLoading && agents.length === 0 && !agentsError && (
            <div style={{ color: "#555", fontSize: 14 }}>
              No agents registered. Run <code style={{ color: "#888" }}>npm run setup:local</code>.
            </div>
          )}

          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {agents.map((agent) => (
              <AgentCard
                key={agent.wallet}
                agent={agent}
                isWinner={winner?.wallet === agent.wallet}
              />
            ))}
          </div>
        </section>

        {agents.length > 0 && (
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ margin: "0 0 16px", fontSize: 16, color: "#888", fontWeight: 500, textTransform: "uppercase", letterSpacing: 1 }}>
              Uniswap v4 Hook — Fee Schedule
            </h2>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {[
                { tier: "PLATINUM", fee: "0.05%", threshold: "avg ≥ 90" },
                { tier: "GOLD", fee: "0.10%", threshold: "avg ≥ 70" },
                { tier: "SILVER", fee: "0.20%", threshold: "avg ≥ 50" },
                { tier: "BRONZE", fee: "0.30%", threshold: "avg < 50" },
              ].map(({ tier, fee, threshold }) => {
                const colors: Record<string, string> = { PLATINUM: "#e5e4e2", GOLD: "#ffd700", SILVER: "#aaa9ad", BRONZE: "#cd7f32" };
                return (
                  <div key={tier} style={{
                    background: "#1a1a2e", borderRadius: 8, padding: "12px 18px",
                    border: `1px solid ${colors[tier]}33`, minWidth: 140,
                  }}>
                    <div style={{ fontWeight: 700, color: colors[tier], marginBottom: 4 }}>{tier}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#e0e0ff" }}>{fee}</div>
                    <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>{threshold}</div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section>
          <h2 style={{ margin: "0 0 20px", fontSize: 16, color: "#888", fontWeight: 500, textTransform: "uppercase", letterSpacing: 1 }}>
            Task Settlement
          </h2>
          <TaskPanel
            task={task}
            agents={agents}
            loading={taskLoading}
            taskId={taskId}
            onTaskIdChange={setTaskId}
            onRefresh={refresh}
          />
        </section>
      </div>
    </div>
  );
}
