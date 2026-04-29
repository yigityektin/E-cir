from backend.schemas import ModelOutput


class AdversarialCritic:
    agent_id = "adversarial_critic_v1"

    def evaluate(self, output: ModelOutput) -> float:
        if "lower() ==" in output.output_text or "upper() ==" in output.output_text:
            return 0.88
        return 0.75
