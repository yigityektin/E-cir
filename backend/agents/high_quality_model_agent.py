from backend.schemas import ModelOutput
from backend.utils.hashing import compute_hash


class HighQualityModelAgent:
    agent_id = "high_quality_model_agent_v1"
    agent_label = "High-Quality Model Agent"

    def execute(self, task_payload) -> ModelOutput:
        output_text = (
            "def validate_ethereum_address(address):\n"
            "    if not isinstance(address, str):\n"
            "        return {\"valid\": False, \"reason\": \"input must be a string\"}\n"
            "    normalized = address.strip()\n"
            "    if len(normalized) != 42 or not normalized.startswith('0x'):\n"
            "        return {\"valid\": False, \"reason\": \"invalid Ethereum address format\"}\n"
            "    checksum = normalized[2:]\n"
            "    if checksum.lower() == checksum or checksum.upper() == checksum:\n"
            "        return {\"valid\": True, \"reason\": \"address is valid but not checksummed\"}\n"
            "    return {\"valid\": True, \"reason\": \"address appears checksummed\"}\n"
        )
        return ModelOutput(
            task_id=task_payload.task_id,
            agent_id=self.agent_id,
            agent_label=self.agent_label,
            output_text=output_text,
            confidence=0.94,
            latency_ms=4200,
            cost_estimate=0.020,
            output_uri="0g://mock/output_high_quality_001",
            output_hash=compute_hash(output_text),
        )
