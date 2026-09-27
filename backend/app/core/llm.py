import os
from google.genai import types
from app.core.embedding import _client

ANSWER_MODEL = os.getenv("GEMINI_ANSWER_MODEL")
if not ANSWER_MODEL:
    raise RuntimeError("GEMINI_ANSWER_MODEL environment variable is not set")

def generate_answer(query: str, context_chunks: list[str]) -> str:
    context = "\n\n---\n\n".join(context_chunks)
    prompt = f"""Answer the user's question using ONLY the context below. If the context doesn't contain the answer, say so honestly — don't make things up.

Context:
{context}

Question: {query}"""

    response = _client.models.generate_content(
        model=ANSWER_MODEL,
        contents=prompt,
    )
    return response.text

def generate_reply(history: list[dict]) -> str:
    contents = "\n\n".join(f"{turn['role'].upper()}: {turn['content']}" for turn in history)
    prompt = f"""Continue this conversation naturally, staying grounded in what's actually been discussed.

{contents}

ASSISTANT:"""
    response = _client.models.generate_content(model=ANSWER_MODEL, contents=prompt)
    return response.text