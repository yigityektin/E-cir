import json

from backend.schemas import ModelOutput
from backend.utils.providers import VENICE_MODEL, get_venice_client

_SYSTEM = (
    "You are a correctness evaluation judge. Given a task and an agent's response, "
    "evaluate whether the response correctly solves the task. "
    "Check for: factual accuracy, logical correctness, complete coverage of requirements, "
    "and absence of errors or hallucinations. "
    'Respond ONLY with a JSON object: {"score": <float 0.0-1.0>, "reasoning": "<one sentence>"}'
)


class CorrectnessJudge:
    agent_id = "correctness_judge_v1"

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
