import os
from openai import OpenAI

# ── Model identifiers ─────────────────────────────────────────────────────────

GROK_MODEL = "grok-3-mini"
DEEPSEEK_MODEL = "deepseek-chat"
VENICE_MODEL = "llama-3.3-70b"

# ── Pricing (USD per 1M tokens) ───────────────────────────────────────────────

_PRICING = {
    GROK_MODEL:     {"input": 0.30,  "output": 0.50},
    DEEPSEEK_MODEL: {"input": 0.27,  "output": 1.10},
    VENICE_MODEL:   {"input": 1.00,  "output": 2.00},
}


def estimate_cost_oai(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    p = _PRICING.get(model, {"input": 1.0, "output": 2.0})
    return round((prompt_tokens * p["input"] + completion_tokens * p["output"]) / 1_000_000, 6)


# ── Client factories ──────────────────────────────────────────────────────────

def get_grok_client() -> OpenAI:
    return OpenAI(
        base_url="https://api.x.ai/v1",
        api_key=os.environ["XAI_API_KEY"],
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
