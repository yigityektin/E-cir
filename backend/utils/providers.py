import os
from openai import OpenAI

# ── Model identifiers ─────────────────────────────────────────────────────────

GROQ_MODEL = "llama-3.3-70b-versatile"
DEEPSEEK_MODEL = "deepseek-chat"
VENICE_MODEL = "llama-3.3-70b"

# ── Pricing (USD per 1M tokens) ───────────────────────────────────────────────

_PRICING = {
    GROQ_MODEL:    {"input": 0.59,  "output": 0.79},
    DEEPSEEK_MODEL: {"input": 0.27,  "output": 1.10},
    VENICE_MODEL:  {"input": 1.00,  "output": 2.00},
}


def estimate_cost_oai(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    p = _PRICING.get(model, {"input": 1.0, "output": 2.0})
    return round((prompt_tokens * p["input"] + completion_tokens * p["output"]) / 1_000_000, 6)


# ── Client factories ──────────────────────────────────────────────────────────

def get_groq_client() -> OpenAI:
    return OpenAI(
        base_url="https://api.groq.com/openai/v1",
        api_key=os.environ["GROQ_API_KEY"],
    )


def get_deepseek_client() -> OpenAI:
    return OpenAI(
        base_url="https://api.deepseek.com/v1",
        api_key=os.environ["DEEPSEEK_API_KEY"],
    )


def get_venice_client() -> OpenAI:
    return OpenAI(
        base_url="https://api.venice.ai/api/v1",
        api_key=os.environ["VENICE_API_KEY"],
    )
