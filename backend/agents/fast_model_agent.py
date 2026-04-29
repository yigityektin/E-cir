from backend.schemas import ModelOutput
from backend.utils.hashing import compute_hash


class FastModelAgent:
    agent_id = "fast_model_agent_v1"
    agent_label = "Fast Model Agent"

    def execute(self, task_payload) -> ModelOutput:
        output_text = (
            "def validate_ethereum_address(address):\n"
            "    if not isinstance(address, str):\n"
            "        return {\"valid\": False, \"reason\": \"invalid type\"}\n"
            "    address = address.strip()\n"
            "    if len(address) != 42 or not address.startswith('0x'):\n"
            "        return {\"valid\": False, \"reason\": \"invalid length\"}\n"
            "    return {\"valid\": True, \"reason\": \"looks valid\"}\n"
        )
        return ModelOutput(
            task_id=task_payload.task_id,
            agent_id=self.agent_id,
            agent_label=self.agent_label,
            output_text=output_text,
            confidence=0.72,
            latency_ms=1200,
            cost_estimate=0.007,
            output_uri="0g://mock/output_fast_001",
            output_hash=compute_hash(output_text),
        )
