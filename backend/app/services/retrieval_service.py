from uuid import UUID
from sqlalchemy.orm import Session as DBSession

from app.models.capture import Capture
from app.models.chunk import Chunk
from app.models.message import Message
from app.models.user import User
from app.core import encryption, embedding as embedding_core, vector_store, llm

TOP_K = 5

def search_and_answer(db: DBSession, user: User, query: str) -> tuple[str, list[dict]]:
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

    chunk_ids = [UUID(point.payload["chunk_id"]) for point in results.points if point.payload and point.payload.get("chunk_id")]
    if not chunk_ids:
        return "I couldn't find anything relevant in your captures.", []

    # 3. Fetch + decrypt matched chunks from Postgres.
    chunk_rows = db.query(Chunk).filter(
        Chunk.id.in_(chunk_ids),
        Chunk.user_id == user.id,
    ).all()
    chunk_by_id = {row.id: row for row in chunk_rows}
    ordered_chunks = [chunk_by_id[chunk_id] for chunk_id in chunk_ids if chunk_id in chunk_by_id]
    if not ordered_chunks:
        return "I couldn't find anything relevant in your captures.", []
    decrypted_chunks = [encryption.decrypt_chunk(dek, row.encrypted_content) for row in ordered_chunks]

    message_ids = [row.message_id for row in ordered_chunks if row.message_id is not None]
    message_capture_ids = {
        message.id: message.capture_id
        for message in db.query(Message).filter(Message.id.in_(message_ids)).all()
    } if message_ids else {}
    capture_ids = [
        row.capture_id if row.capture_id is not None else message_capture_ids.get(row.message_id)
        for row in ordered_chunks
    ]
    owned_capture_ids = [capture_id for capture_id in capture_ids if capture_id is not None]
    captures = db.query(Capture).filter(
        Capture.id.in_(owned_capture_ids),
        Capture.user_id == user.id,
    ).all() if owned_capture_ids else []
    captures_by_id = {capture.id: capture for capture in captures}
    sources = []
    seen_capture_ids = set()
    for capture_id in capture_ids:
        if capture_id is None or capture_id in seen_capture_ids:
            continue
        capture = captures_by_id.get(capture_id)
        if capture is None:
            continue
        seen_capture_ids.add(capture_id)
        title = encryption.decrypt_chunk(dek, capture.encrypted_title) if capture.encrypted_title else None
        sources.append({"capture_id": capture.id, "title": title})

    # 4. Generate grounded answer.
    answer = llm.generate_answer(query, decrypted_chunks)

    return answer, sources