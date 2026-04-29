from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional


class RuntimeLogger:
    def __init__(self, trace_path: str | Path = "outputs/runtime_trace.json"):
        self.trace_path = Path(trace_path)
        self.trace_path.parent.mkdir(parents=True, exist_ok=True)

    def reset(self) -> None:
        self._write_trace([])

    def log_step(
        self,
        step: str,
        agentId: str,
        status: str,
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        safe_details = details or {}
        entry = {
            "step": step,
            "agentId": agentId,
            "status": status,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "details": safe_details,
        }
        entry.update(safe_details)

        trace = self._read_trace()
        trace.append(entry)
        self._write_trace(trace)

    def _read_trace(self) -> List[Dict[str, Any]]:
        if not self.trace_path.exists():
            return []

        try:
            content = self.trace_path.read_text(encoding="utf-8").strip()
            if not content:
                return []
            data = json.loads(content)
            if isinstance(data, list):
                return data
        except (OSError, json.JSONDecodeError):
            return []

        return []

    def _write_trace(self, trace: List[Dict[str, Any]]) -> None:
        temp_path = self.trace_path.with_suffix(".tmp")
        temp_path.write_text(json.dumps(trace, indent=2), encoding="utf-8")
        temp_path.replace(self.trace_path)
