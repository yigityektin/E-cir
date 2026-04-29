import json

from backend.schemas import ClassificationResult, TaskPayload
from backend.utils.providers import GROQ_MODEL, get_groq_client

_SYSTEM = (
    "You are a task classification agent. Given a task description, classify it.\n"
    "Respond ONLY with a JSON object:\n"
    '{"task_type": <"coding"|"analysis"|"creative"|"qa"|"other">, '
    '"difficulty": <"low"|"medium"|"high">, '
    '"priority": <"fast"|"balanced"|"high_quality">}\n\n'
    "Use priority='fast' for simple/short tasks, 'high_quality' for complex multi-step ones, "
    "'balanced' for everything else."
)


class TaskClassifierAgent:
    agent_id = "task_classifier_agent_v1"

    def classify(self, task_payload: TaskPayload) -> ClassificationResult:
        client = get_groq_client()
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            max_tokens=128,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": _SYSTEM},
                {"role": "user", "content": task_payload.task_text},
            ],
        )
        text = response.choices[0].message.content or "{}"
        data = json.loads(text)

        return ClassificationResult(
            task_id=task_payload.task_id,
            task_type=data.get("task_type", "other"),
            difficulty=data.get("difficulty", "medium"),
            priority=data.get("priority", "balanced"),
        )
