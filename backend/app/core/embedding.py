import os

from google import genai
from google.genai import types

_GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not _GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY environment variable is not set")

_client = genai.Client(api_key=_GEMINI_API_KEY)

EMBEDDING_MODEL = os.getenv("GEMINI_EMBEDDING_MODEL")
if not EMBEDDING_MODEL:
    raise RuntimeError("GEMINI_EMBEDDING_MODEL environment variable is not set")

EMBEDDING_DIMENSIONS = 768  # truncated via output_dimensionality — see note below


def generate_embedding(text: str, task_type: str = "RETRIEVAL_DOCUMENT") -> list[float]:
    """Generate a single embedding vector for one chunk of plaintext.
    Note: this sends `text` to Google's API — only ever call this with
    plaintext meant to be embedded, never with encrypted content.

    task_type should be RETRIEVAL_DOCUMENT when embedding a chunk at
    ingestion time, and RETRIEVAL_QUERY when embedding a user's search
    query at retrieval time — this measurably improves retrieval quality
    over using the same task_type for both.
    """
    result = _client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=text,
        config=types.EmbedContentConfig(
            task_type=task_type,
            output_dimensionality=EMBEDDING_DIMENSIONS,
        ),
    )
    return result.embeddings[0].values