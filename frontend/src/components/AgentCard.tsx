import type { AgentData } from "../hooks/useAgents";
import { TIER_COLORS, MODEL_PROVIDER } from "../contracts";

interface Props {
  agent: AgentData;
  isWinner?: boolean;
}

export function AgentCard({ agent, isWinner }: Props) {
  const tierColor = TIER_COLORS[agent.tier] ?? "#888";
  const short = (addr: string) => addr.slice(0, 6) + "…" + addr.slice(-4);
  const provider = MODEL_PROVIDER[agent.modelType] ?? agent.modelType;

  return (
    <div style={{
      background: "#1a1a2e",
      border: `2px solid ${isWinner ? "#ffd700" : "#2a2a4a"}`,
      borderRadius: 12,
      padding: "20px 24px",
      position: "relative",
      minWidth: 260,
    }}>
      {isWinner && (
        <div style={{
          position: "absolute", top: -12, right: 16,
          background: "#ffd700", color: "#000",
          fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 99,
        }}>
          WINNER
        </div>
      )}

      {/* Provider label above ENS name */}
      <div style={{ marginBottom: 2, fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 0.8 }}>
        {provider}
      </div>
      <div style={{ marginBottom: 2, fontSize: 13, color: "#7a7aaa", fontFamily: "monospace" }}>
        {agent.modelType}
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, color: "#e0e0ff", marginBottom: 2 }}>
        {agent.ensName}
      </div>
      <div style={{ fontSize: 12, color: "#555", marginBottom: 16, fontFamily: "monospace" }}>
        {short(agent.wallet)}
      </div>

      <Row label="Specialization" value={agent.specialization} />
      <Row label="Tasks Done" value={String(agent.completedTasks)} />
      <Row label="Avg Score" value={agent.averageScore > 0 ? `${agent.averageScore} / 100` : "—"} />
      <Row label="Total Rewards" value={`${parseFloat(agent.totalRewards).toFixed(4)} AIPERF`} />
      <Row label="Balance" value={`${parseFloat(agent.tokenBalance).toFixed(4)} AIPERF`} />

      <div style={{ marginTop: 16, display: "flex", gap: 10, alignItems: "center" }}>
        <span style={{
          background: tierColor + "22", color: tierColor,
          border: `1px solid ${tierColor}`,
          borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 700,
        }}>
          {agent.tier}
        </span>
        <span style={{ fontSize: 12, color: "#aaa" }}>
          Hook fee: <strong style={{ color: "#e0e0ff" }}>{agent.swapFee}</strong>
        </span>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
      <span style={{ fontSize: 13, color: "#666" }}>{label}</span>
      <span style={{ fontSize: 13, color: "#ccc", fontWeight: 500 }}>{value}</span>
    </div>
  );
}
