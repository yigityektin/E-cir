import time

from backend.schemas import ModelOutput, TaskPayload
from backend.utils.hashing import compute_hash
from backend.utils.providers import GROK_MODEL, estimate_cost_oai, get_grok_client

_SYSTEM = (
    "You are a fast, efficient AI agent powered by Grok. "
    "Provide concise, accurate responses. Prioritize correctness and clarity. "
    "Keep answers focused and avoid unnecessary elaboration."
)


class FastModelAgent:
    agent_id = "fast_model_agent_v1"
    agent_label = "Fast Model Agent (Grok / xAI)"

    def execute(self, task_payload: TaskPayload) -> ModelOutput:
        client = get_grok_client()
        start = time.monotonic()

        response = client.chat.completions.create(
            model=GROK_MODEL,
            max_tokens=1024,
            messages=[
                {"role": "system", "content": _SYSTEM},
                {"role": "user", "content": task_payload.task_text},
            ],
        )

        latency_ms = int((time.monotonic() - start) * 1000)
        output_text = response.choices[0].message.content or ""
        cost = estimate_cost_oai(
            GROK_MODEL,
            response.usage.prompt_tokens,
            response.usage.completion_tokens,
        )

        return ModelOutput(
            task_id=task_payload.task_id,
            agent_id=self.agent_id,
            agent_label=self.agent_label,
            task_text=task_payload.task_text,
            output_text=output_text,
            confidence=0.72,
            latency_ms=latency_ms,
            cost_estimate=cost,
            output_uri=f"0g://mock/output_fast_{task_payload.task_id}",
            output_hash=compute_hash(output_text),
        )
