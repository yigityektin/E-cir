from backend.schemas import TaskPayload


class TaskIntakeAgent:
    agent_id = "task_intake_agent_v1"

    def process(self, task_payload: TaskPayload) -> TaskPayload:
        return task_payload
