import json
import subprocess
from pathlib import Path
from typing import Dict

from backend.schemas import StorageRecord
from backend.utils.hashing import compute_hash

_SCRIPT_DIR = Path(__file__).resolve().parents[2] / "scripts"


class StorageAgent:
    agent_id = "storage_agent_v1"

    def store(self, payload: Dict) -> StorageRecord:
        raw = json.dumps(payload, ensure_ascii=False).encode()
        content_hash = compute_hash(payload)

        proc = subprocess.Popen(
            ["node", str(_SCRIPT_DIR / "og_upload.mjs")],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,  # SDK progress logs suppressed
        )
        proc.stdin.write(raw)
        proc.stdin.close()

        # Read stdout line by line — return as soon as the JSON result arrives.
        # The script prints JSON right after TX submission; segment upload
        # continues in the background process.
        data = None
        for raw_line in proc.stdout:
            line = raw_line.strip()
            if not line:
                continue
            try:
                data = json.loads(line)
                break
            except json.JSONDecodeError:
                continue

        proc.stdout.close()
        # Don't wait for the process — segment upload finishes in background.

        if not data:
            raise RuntimeError("0G upload produced no JSON output")
        if "error" in data:
            raise RuntimeError(f"0G upload error: {data['error']}")

        return StorageRecord(
            record_id=f"record_{payload.get('agent_id', 'unknown')}",
            uri=data["uri"],
            content_hash=content_hash,
            payload=payload,
            storage_type="0g",
        )

    def retrieve(self, uri: str) -> Dict:
        root_hash = uri.removeprefix("0g://")
        result = subprocess.run(
            ["node", str(_SCRIPT_DIR / "og_download.mjs"), root_hash],
            capture_output=True,
            timeout=120,
        )
        if result.returncode != 0:
            raise RuntimeError(f"0G download failed: {result.stderr.decode(errors='replace')}")
        last_line = result.stdout.strip().split(b"\n")[-1]
        return json.loads(last_line)
