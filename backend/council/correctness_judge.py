from backend.schemas import ModelOutput


class CorrectnessJudge:
    agent_id = "correctness_judge_v1"

    def evaluate(self, output: ModelOutput) -> float:
        text = output.output_text.lower()
        if "checksum" in text:
            return 0.92
        if "invalid" in text:
            return 0.70
        return 0.80
