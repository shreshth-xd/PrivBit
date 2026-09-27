import os

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PayloadSchemaType

from app.core.embedding import EMBEDDING_DIMENSIONS

QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
COLLECTION_NAME = "privbit"

client = QdrantClient(url=QDRANT_URL)


def ensure_collection() -> None:
    """Creates the chunks collection if it doesn't already exist. Safe to
    call on every app startup — no-ops if already present."""
    existing = [c.name for c in client.get_collections().collections]
    if COLLECTION_NAME in existing:
        return

    client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(
            size=EMBEDDING_DIMENSIONS,
            distance=Distance.COSINE,
        ),
    )

    # Index user_id in the payload so retrieval-time search can filter to
    # only the querying user's own chunks — without this, semantic search
    # has no way to scope results per user.
    client.create_payload_index(
        collection_name=COLLECTION_NAME,
        field_name="user_id",
        field_schema=PayloadSchemaType.KEYWORD,
    )