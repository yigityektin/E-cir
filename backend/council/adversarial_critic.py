import json
import re

from backend.schemas import ModelOutput
from backend.utils.providers import VENICE_MODEL, get_venice_client

_SYSTEM = (
    "You are an adversarial critic. Given a task and an agent's response, "
    "try to find weaknesses, edge cases the response fails to handle, logical flaws, "
    "or scenarios where it produces wrong results. "
    "Score 1.0 = fully robust, handles all edge cases. Score 0.0 = fails badly. "
    'You MUST respond with ONLY a JSON object and nothing else: {"score": <float 0.0-1.0>, "reasoning": "<one sentence>"}'
)


def _parse_score(text: str) -> float:
    try:
        m = re.search(r'\{.*\}', text, re.DOTALL)
        data = json.loads(m.group() if m else text)
        return max(0.0, min(1.0, float(data.get("score", 0.5))))
    except Exception:
        m = re.search(r'"score"\s*:\s*([0-9.]+)', text)
        return max(0.0, min(1.0, float(m.group(1)))) if m else 0.5


class AdversarialCritic:
    agent_id = "adversarial_critic_v1"

    def evaluate(self, output: ModelOutput) -> float:
        client = get_venice_client()
        response = client.chat.completions.create(
            model=VENICE_MODEL,
            max_tokens=256,
            messages=[
                {"role": "system", "content": _SYSTEM},
                {
                    "role": "user",
                    "content": f"Task:\n{output.task_text}\n\nAgent response:\n{output.output_text}",
                },
            ],
        )
        return _parse_score(response.choices[0].message.content or "")
