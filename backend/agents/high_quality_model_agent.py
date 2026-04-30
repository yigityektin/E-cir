import time

from backend.schemas import ModelOutput, TaskPayload
from backend.utils.claude_client import estimate_cost, get_client
from backend.utils.hashing import compute_hash

_MODEL = "claude-opus-4-7"
_SYSTEM = (
    "You are a high-quality AI agent. Provide the most accurate, comprehensive, and carefully "
    "reasoned responses possible. Consider edge cases, potential issues, and best practices. "
    "Prioritize correctness and thoroughness."
)


class HighQualityModelAgent:
    agent_id = "high_quality_model_agent_v1"
    agent_label = "High-Quality Model Agent"

    def execute(self, task_payload: TaskPayload) -> ModelOutput:
        client = get_client()
        start = time.monotonic()

        response = client.messages.create(
            model=_MODEL,
            max_tokens=4096,
            thinking={"type": "adaptive"},
            output_config={"effort": "high"},
            system=_SYSTEM,
            messages=[{"role": "user", "content": task_payload.task_text}],
        )

        latency_ms = int((time.monotonic() - start) * 1000)
        # Opus 4.7 with adaptive thinking may return only thinking blocks —
        # use list comprehension + default to avoid StopIteration in async context
        text_blocks = [b.text for b in response.content if b.type == "text"]
        output_text = text_blocks[0] if text_blocks else "".join(
            getattr(b, "thinking", "") for b in response.content
        )
        cost = estimate_cost(_MODEL, response.usage.input_tokens, response.usage.output_tokens)

        return ModelOutput(
            task_id=task_payload.task_id,
            agent_id=self.agent_id,
            agent_label=self.agent_label,
            task_text=task_payload.task_text,
            output_text=output_text,
            confidence=0.94,
            latency_ms=latency_ms,
            cost_estimate=cost,
            output_uri=f"0g://mock/output_high_quality_{task_payload.task_id}",
            output_hash=compute_hash(output_text),
        )
