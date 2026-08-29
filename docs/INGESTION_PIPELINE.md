# Ingestion Pipeline — Design Decisions

Status: decided, not yet implemented. This document records the *what and why*
of two foundational ingestion decisions, ahead of writing any chunking,
embedding, or storage code.

---

## Vector Store: Qdrant

**Decision:** Qdrant, run as a separate service from Postgres — not pgvector.

**Why:**
- **Security isolation.** Chunk content (encrypted, in Postgres) and chunk
  embeddings (in Qdrant) live in physically separate systems. Compromising
  either store alone does not hand over both the encrypted content and its
  semantic vector representation. Keeping both in the same Postgres instance
  (pgvector) would mean a single DB compromise exposes the join between the
  two by `chunk_id`.
- **Scalability.** Given PrivBit's ingestion model — users chunking more
  content than they'd naturally expect, across arbitrarily long captures —
  vector volume is expected to grow substantially faster than user count
  might suggest. pgvector's HNSW indexing is solid up to the low millions of
  vectors, but Qdrant is purpose-built for this workload at larger scale.
- **Deliberate trade-off accepted:** running a second service is real
  operational cost (deployment, monitoring, cross-system consistency during
  ingestion — a chunk write to Postgres and its embedding write to Qdrant are
  no longer atomic, and failure-mode handling like idempotent writes /
  retries needs to be designed explicitly at ingestion-implementation time).
  This is accepted as a worthwhile trade-off for both the security and
  scalability properties above, and as deliberate practice in designing for
  distributed-system failure modes.

**Known residual privacy gap, independent of this choice:** embeddings are
generated from plaintext and are not themselves encrypted. Embedding-inversion
research shows raw vectors can, under some conditions, be used to partially
reconstruct source text. This is not solved by choosing Qdrant over pgvector
— worth tracking as a separate, later concern.

---

## Chunking Strategy

**Decision:** Token-based fixed-window chunking with overlap and
sentence-boundary snapping.

- **Chunk size:** ~500 tokens (token-based, not character-based — sizing
  should reflect what the embedding model actually consumes).
- **Overlap:** ~15–20% of chunk size (~75–100 tokens) between consecutive
  chunks, to preserve semantic continuity across chunk boundaries.
- **Boundary handling:** when a raw token-count cutoff would fall mid-sentence,
  snap backward to the nearest sentence boundary rather than splitting a
  sentence across two chunks.

**Why:** matches standard production RAG chunking practice, and preserves
semantic meaning at chunk edges — avoids the failure mode where a sentence's
meaning is split across two separately-embedded chunks, degrading retrieval
quality for anything whose relevant context straddles a chunk boundary.

**Not yet decided (implementation-level, deferred to when chunking code is
actually written):**
- Tokenizer library (e.g. `tiktoken` vs. a model-specific tokenizer)
- Sentence-boundary detection library (e.g. spaCy vs. NLTK)
- Exact ingestion consistency mechanism for the Postgres/Qdrant dual-write
  (e.g. write chunk to Postgres first with a `pending` embedding status,
  then write to Qdrant and mark `complete` — vs. some other pattern)