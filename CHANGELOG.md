## [2.2.0] - 2026-09-27

### Added
- **Envelope encryption**: KEK held server-side (`ENCRYPTION_KEK`), per-user Data Encryption Keys (DEKs) generated at registration, wrapped by the KEK and stored on the `User` row (`encrypted_dek`). AES-GCM used for all content encryption (`core/encryption.py`).
- **RAG ingestion pipeline**:
  - `captures` and `chunks` Postgres tables — captures hold the encrypted original content + optional encrypted title (source of truth, not reconstructable from chunks alone); chunks are polymorphic (`source_type`: `capture` | `message`) with a CHECK constraint enforcing exactly one parent reference.
  - Token-based chunking with sentence-boundary snapping and overlap (`tiktoken` + NLTK, `services/chunking_service.py`), preserving semantic continuity across chunk boundaries.
  - Qdrant vector store (768-dim, cosine distance), collection indexed on `user_id` payload for per-user filtered semantic search.
  - Gemini-hosted embeddings (`gemini-embedding-001`, asymmetric `RETRIEVAL_DOCUMENT`/`RETRIEVAL_QUERY` task types) and Gemini Flash for answer generation — both model names configurable via env vars.
  - `POST /captures/` — chunks, encrypts, and embeds new captures; per-chunk `embedding_status` tracking (`pending`/`completed`/`failed`) for future retry recovery.
  - `GET /captures/` — lists a user's captures with decrypted titles.
  - `PATCH /captures/{id}` — user-editable capture titles.
  - `DELETE /captures/{id}` — deletes a capture and its associated chunks/messages, including explicit Qdrant point cleanup (not automatically cascaded, unlike Postgres).
- **Retrieval**: `POST /search/` — embeds the query, performs user-scoped semantic search in Qdrant (top-5), fetches and decrypts matched chunks from Postgres, and generates a grounded LLM answer from that context.
- **Conversational threads**: `messages` table supporting multi-turn conversations per capture. The capture's initiating content is persisted as the first message and receives an immediate AI reply, matching standard chat-app UX. Follow-up messages (`POST /captures/{id}/messages`, `GET /captures/{id}/messages`) continue the same thread with full conversation history passed to the LLM.
  - Only user-authored messages are chunked/embedded/indexed — assistant replies are never re-indexed, avoiding feedback-loop pollution and halving indexing volume.
- **Automatic title generation**: captures are titled via LLM immediately on creation (synchronous), editable by the user afterward via the `PATCH` endpoint above.
- **Shared chunk-indexing service** (`services/chunk_indexing_service.py`): the chunk→encrypt→embed→upsert pipeline is now a single shared function used by both capture ingestion and message ingestion, rather than duplicated logic.
- **Frontend**:
  - Quick Capture wired to `POST /captures/`, with loading/success/error states.
  - Recent Captures section on the home page now shows real data (was previously a placeholder empty state).
  - Search page wired to `POST /search/`, deliberately submit-triggered only (Enter/button), not live-as-you-type, given the endpoint's LLM-generation cost/latency.
  - `/library` fully redesigned and migrated to `/threads`: nested layout with a persistent capture list, dynamic per-capture chat routes (`/threads/[captureId]`), inline editable titles, and a triple-dot menu (rename/delete) per capture.
  - Sidebar restructured: unified nav order (logo, Quick Capture, Search, Settings, reserved pinned-captures space, collapsible Threads dropdown listing all captures, Security, Support, profile/logout), replacing a previously separate, duplicated capture-list panel.
  - Removed unbuilt Stitch-generated UI stubs: biometric sign-in toggle, zero-knowledge/local-encryption toggle, attach-media button, voice-message button, and the "⌘+Enter to save" hint text.

### Fixed
- **`GET /auth/me` 500 error**: `UserResponse.id` was typed `str`, but SQLAlchemy returns a native `UUID` object; Pydantic v2 does not auto-coerce this and raised a `ValidationError`, silently breaking session restoration on every page load/refresh despite valid, unrevoked tokens. Fixed by typing `UserResponse.id` as `UUID`.
- Sidebar navigation previously worked only from the home page, due to each page having its own copy-pasted sidebar markup instead of a shared component; consolidated into a single `Sidebar` component used everywhere.
- Inconsistent hover states across sidebar links, and a stale Stitch-generated placeholder avatar image, replaced with the app's real initial-letter avatar pattern.

### Security
- `DELETE /captures/{id}` explicitly removes matching vectors from Qdrant before the Postgres cascade delete fires, preventing orphaned vector data from surviving a deleted capture.