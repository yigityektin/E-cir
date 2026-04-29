import json

from backend.schemas import ModelOutput
from backend.utils.providers import VENICE_MODEL, get_venice_client

_SYSTEM = (
    "You are a reasoning quality judge. Given a task and an agent's response, "
    "evaluate the quality of the agent's reasoning and approach. "
    "Check for: clear step-by-step logic, sound methodology, appropriate use of concepts, "
    "and whether the approach is right for the problem. "
    'Respond ONLY with a JSON object: {"score": <float 0.0-1.0>, "reasoning": "<one sentence>"}'
)


class ReasoningJudge:
    agent_id = "reasoning_judge_v1"

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
