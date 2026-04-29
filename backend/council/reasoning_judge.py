from backend.schemas import ModelOutput


class ReasoningJudge:
    agent_id = "reasoning_judge_v1"

    def evaluate(self, output: ModelOutput) -> float:
        if "if checksum.lower() == checksum" in output.output_text:
            return 0.90
        if "return {\"valid\": False" in output.output_text:
            return 0.78
        return 0.82
