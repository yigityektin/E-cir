import json
import subprocess
import sys
import time
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

from backend.pipeline import MarketplacePipeline

app = FastAPI(title="E-cir Agent Marketplace API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class TaskRequest(BaseModel):
    task_text: str
    task_id: str | None = None


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/run")
def run_pipeline(req: TaskRequest):
    task_id = req.task_id or f"task_{int(time.time())}"
    pipeline = MarketplacePipeline()
    result = pipeline.run(task_text=req.task_text, task_id=task_id)
    payload = result.model_dump()

    # Persist to outputs/ so submitScores.ts can pick it up
    out = Path("outputs") / "final_result.json"
    out.parent.mkdir(exist_ok=True)
    out.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    _submit_scores_to_chain()

    return payload


def _submit_scores_to_chain() -> None:
    root = Path(__file__).resolve().parents[1]
    hardhat = root / "node_modules" / ".bin" / "hardhat"
    script = root / "scripts" / "submitScores.ts"
    try:
        result = subprocess.run(
            [str(hardhat), "run", str(script), "--network", "localhost"],
            cwd=str(root),
            timeout=120,
            check=False,
            capture_output=True,
            text=True,
        )
        if result.stdout:
            print(result.stdout, file=sys.stderr)
        if result.returncode != 0:
            print(f"[submitScores] exit {result.returncode}: {result.stderr}", file=sys.stderr)
    except subprocess.TimeoutExpired:
        print("[submitScores] timed out after 120s", file=sys.stderr)
    except Exception as exc:
        print(f"[submitScores] failed: {exc}", file=sys.stderr)
