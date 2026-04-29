import anthropic

_client: anthropic.Anthropic | None = None


def get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic()
    return _client


SCORE_SCHEMA = {
    "type": "object",
    "properties": {
        "score": {
            "type": "number",
            "description": "Score between 0.0 (worst) and 1.0 (best)",
        },
        "reasoning": {
            "type": "string",
            "description": "One-sentence explanation of the score",
        },
    },
    "required": ["score", "reasoning"],
    "additionalProperties": False,
}

INPUT_PRICE = {
    "claude-haiku-4-5": 1.00,
    "claude-sonnet-4-6": 3.00,
    "claude-opus-4-7": 5.00,
}

OUTPUT_PRICE = {
    "claude-haiku-4-5": 5.00,
    "claude-sonnet-4-6": 15.00,
    "claude-opus-4-7": 25.00,
}


def estimate_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    inp = INPUT_PRICE.get(model, 5.00)
    out = OUTPUT_PRICE.get(model, 25.00)
    return round((input_tokens * inp + output_tokens * out) / 1_000_000, 6)
