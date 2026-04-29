import time

from backend.schemas import ModelOutput, TaskPayload
from backend.utils.hashing import compute_hash
from backend.utils.providers import DEEPSEEK_MODEL, estimate_cost_oai, get_deepseek_client

_SYSTEM = (
    "You are a balanced AI agent powered by DeepSeek. "
    "Provide thorough, well-structured responses that balance quality and efficiency. "
    "Explain your reasoning where relevant and cover edge cases concisely."
)


class BalancedModelAgent:
    agent_id = "balanced_model_agent_v1"
    agent_label = "Balanced Model Agent (DeepSeek V3)"

    def execute(self, task_payload: TaskPayload) -> ModelOutput:
        client = get_deepseek_client()
        start = time.monotonic()

        response = client.chat.completions.create(
            model=DEEPSEEK_MODEL,
            max_tokens=2048,
            messages=[
                {"role": "system", "content": _SYSTEM},
                {"role": "user", "content": task_payload.task_text},
            ],
        )

        latency_ms = int((time.monotonic() - start) * 1000)
        output_text = response.choices[0].message.content or ""
        cost = estimate_cost_oai(
            DEEPSEEK_MODEL,
            response.usage.prompt_tokens,
            response.usage.completion_tokens,
        )

        return ModelOutput(
            task_id=task_payload.task_id,
            agent_id=self.agent_id,
            agent_label=self.agent_label,
            task_text=task_payload.task_text,
            output_text=output_text,
            confidence=0.85,
            latency_ms=latency_ms,
            cost_estimate=cost,
            output_uri=f"0g://mock/output_balanced_{task_payload.task_id}",
            output_hash=compute_hash(output_text),
        )
