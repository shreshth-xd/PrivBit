from uuid import UUID
from sqlalchemy.orm import Session as DBSession

from app.models.chunk import Chunk
from app.models.user import User
from app.core import encryption, embedding as embedding_core, vector_store, llm

TOP_K = 5

def search_and_answer(db: DBSession, user: User, query: str) -> tuple[str, list[str]]:
    dek = encryption.decrypt_dek(user.encrypted_dek)

    # 1. Embed query (RETRIEVAL_QUERY, not RETRIEVAL_DOCUMENT — asymmetric,
    #    matches what was used at ingestion).
    query_vector = embedding_core.generate_embedding(query, task_type="RETRIEVAL_QUERY")

    # 2. Qdrant semantic search, filtered to this user only.
    results = vector_store.client.query_points(
        collection_name=vector_store.COLLECTION_NAME,
        query=query_vector,
        query_filter={"must": [{"key": "user_id", "match": {"value": str(user.id)}}]},
        limit=TOP_K,
    )

    chunk_ids = [UUID(point.payload["chunk_id"]) for point in results.points]
    if not chunk_ids:
        return "I couldn't find anything relevant in your captures.", []

    # 3. Fetch + decrypt matched chunks from Postgres.
    chunk_rows = db.query(Chunk).filter(Chunk.id.in_(chunk_ids)).all()
    decrypted_chunks = [encryption.decrypt_chunk(dek, row.encrypted_content) for row in chunk_rows]

    # 4. Generate grounded answer.
    answer = llm.generate_answer(query, decrypted_chunks)

    return answer, decrypted_chunks