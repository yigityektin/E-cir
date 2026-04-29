import json
import os
from pathlib import Path

from backend.pipeline import MarketplacePipeline

_DEFAULT_TASK = (
    "Write a Python function that validates Ethereum addresses and returns a short summary "
    "of whether the address is checksummed, lowercase, or invalid."
)


def run_demo() -> None:
    pipeline = MarketplacePipeline()
    task_text = os.environ.get("TASK_TEXT", _DEFAULT_TASK)
    result = pipeline.run(task_text=task_text, task_id="task_001")
    output_path = Path("outputs") / "final_result.json"
    output_path.parent.mkdir(exist_ok=True)
    payload = result.model_dump()
    output_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    run_demo()
