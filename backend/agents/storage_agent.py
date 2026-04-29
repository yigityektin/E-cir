from typing import Dict

from backend.schemas import StorageRecord
from backend.utils.hashing import compute_hash


class StorageAgent:
    agent_id = "storage_agent_v1"

    def store(self, payload: Dict) -> StorageRecord:
        record_id = f"record_{payload.get('agent_id', 'unknown')}"
        uri = payload.get("output_uri", f"0g://mock/{record_id}")
        content_hash = compute_hash(payload)
        return StorageRecord(
            record_id=record_id,
            uri=uri,
            content_hash=content_hash,
            payload=payload,
            storage_type="mock",
        )

    def retrieve(self, uri: str) -> Dict:
        return {"uri": uri, "status": "mock retrieved"}
