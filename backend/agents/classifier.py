import json
import re

from backend.schemas import ClassificationResult, TaskPayload
from backend.utils.providers import GROK_MODEL, get_grok_client

_VALID_TYPES = {"coding", "analysis", "creative", "qa", "other"}
_VALID_DIFF  = {"low", "medium", "high"}
_VALID_PRIO  = {"fast", "balanced", "high_quality"}

_SYSTEM = (
    "You are a task classification agent. Given a task description, classify it.\n"
    "You MUST respond with ONLY a JSON object and nothing else:\n"
    '{"task_type": <"coding"|"analysis"|"creative"|"qa"|"other">, '
    '"difficulty": <"low"|"medium"|"high">, '
    '"priority": <"fast"|"balanced"|"high_quality">}\n\n'
    "Use priority='fast' for simple/short tasks, 'high_quality' for complex multi-step ones, "
    "'balanced' for everything else."
)


def _parse(text: str) -> dict:
    try:
        m = re.search(r'\{.*\}', text, re.DOTALL)
        return json.loads(m.group() if m else text)
    except Exception:
        return {}


class TaskClassifierAgent:
    agent_id = "task_classifier_agent_v1"

    def classify(self, task_payload: TaskPayload) -> ClassificationResult:
        client = get_grok_client()
        response = client.chat.completions.create(
            model=GROK_MODEL,
            max_tokens=128,
            messages=[
                {"role": "system", "content": _SYSTEM},
                {"role": "user", "content": task_payload.task_text},
            ],
        )
        data = _parse(response.choices[0].message.content or "")

        return ClassificationResult(
            task_id=task_payload.task_id,
            task_type=data.get("task_type", "other") if data.get("task_type") in _VALID_TYPES else "other",
            difficulty=data.get("difficulty", "medium") if data.get("difficulty") in _VALID_DIFF else "medium",
            priority=data.get("priority", "balanced") if data.get("priority") in _VALID_PRIO else "balanced",
        )
