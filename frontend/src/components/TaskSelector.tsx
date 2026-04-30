import { useState } from "react";
import { PREDEFINED_TASKS, CATEGORIES, CUSTOM_TASK_ID, type Task } from "../tasks";

interface Props {
  onResult: (result: unknown) => void;
}

// Requests go to /api/* and Vite proxies them to the backend server
const API_URL = "/api";

export function TaskSelector({ onResult }: Props) {
  const [selectedId, setSelectedId] = useState<string>(PREDEFINED_TASKS[0].id);
  const [customText, setCustomText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const selectedTask: Task | undefined = PREDEFINED_TASKS.find((t) => t.id === selectedId);
  const isCustom = selectedId === CUSTOM_TASK_ID;
  const taskText = isCustom ? customText : selectedTask?.description ?? "";

  async function handleRun() {
    if (!taskText.trim()) return;
    setLoading(true);
    setError(null);
    setElapsed(0);

    const start = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);

    try {
      const res = await fetch(`${API_URL}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_text: taskText }),
        signal: AbortSignal.timeout(600_000), // 10 min
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      onResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      clearInterval(timer);
      setLoading(false);
    }
  }

  return (
    <div style={{
      background: "#0f0f1e",
      border: "1px solid #2a2a4a",
      borderRadius: 12,
      padding: "24px 28px",
      marginBottom: 32,
    }}>
      <h2 style={{ margin: "0 0 20px", fontSize: 16, color: "#888", fontWeight: 500, textTransform: "uppercase", letterSpacing: 1 }}>
        Run a Task
      </h2>

      {/* Category + task selector */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        {CATEGORIES.map((cat) => {
          const tasks = PREDEFINED_TASKS.filter((t) => t.category === cat);
          return (
            <div key={cat}>
              <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.8 }}>
                {cat}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {tasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => setSelectedId(task.id)}
                    style={{
                      background: selectedId === task.id ? "#2a2a5a" : "#1a1a2e",
                      border: `1px solid ${selectedId === task.id ? "#5a5aaa" : "#2a2a4a"}`,
                      borderRadius: 6,
                      color: selectedId === task.id ? "#aaaaff" : "#888",
                      padding: "5px 12px",
                      fontSize: 13,
                      cursor: "pointer",
                      textAlign: "left",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {task.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        {/* Custom */}
        <div>
          <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.8 }}>
            Custom
          </div>
          <button
            onClick={() => setSelectedId(CUSTOM_TASK_ID)}
            style={{
              background: isCustom ? "#2a2a5a" : "#1a1a2e",
              border: `1px solid ${isCustom ? "#5a5aaa" : "#2a2a4a"}`,
              borderRadius: 6,
              color: isCustom ? "#aaaaff" : "#888",
              padding: "5px 12px",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            ✏️ Write your own
          </button>
        </div>
      </div>

      {/* Task description preview or custom textarea */}
      {isCustom ? (
        <textarea
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          placeholder="Describe your task in detail — the more specific, the better the agents can compete..."
          rows={4}
          style={{
            width: "100%",
            background: "#1a1a2e",
            border: "1px solid #3a3a6a",
            borderRadius: 8,
            color: "#ccc",
            padding: "10px 14px",
            fontSize: 13,
            resize: "vertical",
            fontFamily: "system-ui, sans-serif",
            boxSizing: "border-box",
            marginBottom: 16,
          }}
        />
      ) : (
        <div style={{
          background: "#1a1a2e",
          borderRadius: 8,
          padding: "12px 16px",
          marginBottom: 16,
          fontSize: 13,
          color: "#aaa",
          lineHeight: 1.6,
          border: "1px solid #2a2a4a",
        }}>
          {taskText}
        </div>
      )}

      {/* Run button + status */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <button
          onClick={handleRun}
          disabled={loading || !taskText.trim()}
          style={{
            background: loading ? "#1a1a2e" : "#3a3aaa",
            border: `1px solid ${loading ? "#2a2a4a" : "#6a6aff"}`,
            borderRadius: 8,
            color: loading ? "#555" : "#e0e0ff",
            padding: "10px 28px",
            fontSize: 14,
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            letterSpacing: 0.5,
          }}
        >
          {loading ? "Running…" : "▶  Run Pipeline"}
        </button>

        {loading && (
          <div style={{ fontSize: 13, color: "#666" }}>
            <span style={{ color: "#facc15" }}>●</span>
            {" "}Agents competing — {elapsed}s elapsed
            <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>
              (3 AI models · 5 judges · 0G storage · may take 2–4 min)
            </div>
          </div>
        )}

        {error && (
          <div style={{ fontSize: 13, color: "#f87171" }}>
            Error: {error}
          </div>
        )}
      </div>
    </div>
  );
}
