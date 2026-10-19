import os
import logging
from pathlib import Path

from dotenv import load_dotenv

from google.genai import types
from app.core.embedding import _client
from app.core.retry import retry_call

BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env")

ANSWER_MODEL = os.getenv("GEMINI_ANSWER_MODEL")
if not ANSWER_MODEL:
    raise RuntimeError("GEMINI_ANSWER_MODEL environment variable is not set")


log = logging.getLogger(__name__)


class LLMError(Exception):
    pass


def _generate_text(prompt: str, operation_name: str) -> str:
    response = _client.models.generate_content(model=ANSWER_MODEL, contents=prompt)
    try:
        text = response.text
    except (AttributeError, ValueError):
        text = None
    if not text or not text.strip():
        candidates = getattr(response, "candidates", None) or []
        finish_reason = getattr(candidates[0], "finish_reason", "unknown") if candidates else "unknown"
        raise LLMError(f"{operation_name} returned no text (finish reason: {finish_reason})")
    return text


def generate_answer(query: str, context_chunks: list[str]) -> str:
    context = "\n\n---\n\n".join(context_chunks)
    prompt = f"""Answer the user's question using ONLY the context below. If the context doesn't contain the answer, say so honestly — don't make things up.

Context:
{context}

Question: {query}"""

    return retry_call(lambda: _generate_text(prompt, "generate_answer"), "generate_answer")

def generate_reply(history: list[dict]) -> str:
    contents = "\n\n".join(f"{turn['role'].upper()}: {turn['content']}" for turn in history)
    prompt = f"""Continue this conversation naturally, staying grounded in what's actually been discussed.

{contents}

ASSISTANT:"""
    return retry_call(lambda: _generate_text(prompt, "generate_reply"), "generate_reply")


def generate_title(content: str) -> str:
    prompt = f"""Generate a short, descriptive title (max 6 words, no quotes, no punctuation at the end) for this note:

{content[:500]}"""
    return retry_call(lambda: _generate_text(prompt, "generate_title").strip(), "generate_title")