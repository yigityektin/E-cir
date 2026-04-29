from backend.schemas import ModelOutput


class EfficiencyJudge:
    agent_id = "efficiency_judge_v1"

    def evaluate(self, output: ModelOutput) -> float:
        # Latency score (real API calls are much slower than mocks)
        if output.latency_ms <= 3000:
            latency_score = 1.0
        elif output.latency_ms <= 6000:
            latency_score = 0.85
        elif output.latency_ms <= 12000:
            latency_score = 0.70
        else:
            latency_score = 0.50

        # Cost score (normalized against $0.05 as "expensive")
        cost_score = max(0.0, 1.0 - (output.cost_estimate / 0.05))

        return round(0.6 * latency_score + 0.4 * cost_score, 4)
