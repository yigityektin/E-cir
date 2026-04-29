from backend.schemas import ModelOutput


class EfficiencyJudge:
    agent_id = "efficiency_judge_v1"

    def evaluate(self, output: ModelOutput) -> float:
        if output.latency_ms <= 1500:
            return 0.92
        if output.latency_ms <= 2500:
            return 0.84
        return 0.70
