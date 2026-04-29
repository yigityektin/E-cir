import hashlib
from typing import Any


def compute_hash(value: Any) -> str:
    text = repr(value).encode("utf-8")
    return "0x" + hashlib.sha256(text).hexdigest()
