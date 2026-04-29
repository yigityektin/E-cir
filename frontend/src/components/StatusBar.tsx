import { ADDRESSES } from "../contracts";

interface Props {
  connected: boolean;
  error: string | null;
}

export function StatusBar({ connected, error }: Props) {
  const short = (addr: string) =>
    addr ? addr.slice(0, 6) + "…" + addr.slice(-4) : "not set";

  return (
    <div style={{
      background: "#0a0a18",
      borderBottom: "1px solid #1a1a2e",
      padding: "8px 32px",
      display: "flex",
      alignItems: "center",
      gap: 20,
      fontSize: 12,
      color: "#555",
      flexWrap: "wrap",
    }}>
      <span style={{ color: connected ? "#4ade80" : "#f87171", fontWeight: 600 }}>
        {connected ? "● Connected" : "● Disconnected"}
      </span>
      <span>Registry: <code style={{ color: "#888" }}>{short(ADDRESSES.agentRegistry)}</code></span>
      <span>Distributor: <code style={{ color: "#888" }}>{short(ADDRESSES.rewardDistributor)}</code></span>
      <span>Reputation: <code style={{ color: "#888" }}>{short(ADDRESSES.reputationTracker)}</code></span>
      {error && <span style={{ color: "#f87171" }}>{error}</span>}
    </div>
  );
}
