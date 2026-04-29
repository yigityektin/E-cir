from backend.schemas import ClassificationResult, TaskPayload


class TaskClassifierAgent:
    agent_id = "task_classifier_agent_v1"

    def classify(self, task_payload: TaskPayload) -> ClassificationResult:
        text = task_payload.task_text.lower()
        if "ethereum" in text or "address" in text or "token" in text:
            task_type = "coding"
            difficulty = "medium"
            priority = "balanced"
        else:
            task_type = "analysis"
            difficulty = "low"
            priority = "balanced"

        return ClassificationResult(
            task_id=task_payload.task_id,
            task_type=task_type,
            difficulty=difficulty,
            priority=priority,
        )
