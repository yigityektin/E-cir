import json

from backend.schemas import ModelOutput
from backend.utils.providers import VENICE_MODEL, get_venice_client

_SYSTEM = (
    "You are an adversarial critic. Given a task and an agent's response, "
    "try to find weaknesses, edge cases the response fails to handle, logical flaws, "
    "or scenarios where it produces wrong results. "
    "Score 1.0 = fully robust, handles all edge cases. Score 0.0 = fails badly. "
    'Respond ONLY with a JSON object: {"score": <float 0.0-1.0>, "reasoning": "<one sentence '
    'describing the most critical flaw, or \'No significant flaws found\' if robust>"}'
)


class AdversarialCritic:
    agent_id = "adversarial_critic_v1"

    def evaluate(self, output: ModelOutput) -> float:
        client = get_venice_client()
        response = client.chat.completions.create(
            model=VENICE_MODEL,
            max_tokens=256,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": _SYSTEM},
                {
                    "role": "user",
                    "content": f"Task:\n{output.task_text}\n\nAgent response:\n{output.output_text}",
                },
            ],
        )
        text = response.choices[0].message.content or "{}"
        data = json.loads(text)
        return max(0.0, min(1.0, float(data.get("score", 0.5))))
