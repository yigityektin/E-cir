from backend.schemas import ModelOutput
from backend.utils.hashing import compute_hash


class BalancedModelAgent:
    agent_id = "balanced_model_agent_v1"
    agent_label = "Balanced Model Agent"

    def execute(self, task_payload) -> ModelOutput:
        output_text = (
            "def validate_ethereum_address(address):\n"
            "    if not isinstance(address, str):\n"
            "        return {\"valid\": False, \"reason\": \"invalid type\"}\n"
            "    normalized = address.strip()\n"
            "    if len(normalized) != 42 or not normalized.startswith('0x'):\n"
            "        return {\"valid\": False, \"reason\": \"invalid address format\"}\n"
            "    return {\"valid\": True, \"reason\": \"address format is correct\"}\n"
        )
        return ModelOutput(
            task_id=task_payload.task_id,
            agent_id=self.agent_id,
            agent_label=self.agent_label,
            output_text=output_text,
            confidence=0.85,
            latency_ms=2200,
            cost_estimate=0.009,
            output_uri="0g://mock/output_balanced_001",
            output_hash=compute_hash(output_text),
        )
