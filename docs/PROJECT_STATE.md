Last updated: 2026-10-13 | Last verified against commit: 7a242d6 (+ uncommitted changes)

# PrivBit project state

Present-state snapshot based on the application code and Alembic revisions.

## 1. Product and runtime

PrivBit is a personal capture, thread, and semantic question-answering application.
- Frontend: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS.
- Backend: FastAPI, Pydantic v2, SQLAlchemy 2.x, Alembic.
- Services: PostgreSQL, Redis/RQ, Qdrant, Google Gemini APIs.
- `backend/app/main.py` mounts `/health`, `/auth`, `/captures`, and `/search`. CORS allows `http://localhost:3000` with credentials; no production origin configuration is present there.
- Run `backend/app/worker.py` separately for queued ingestion. The API bootstrap does not start the worker or call the Qdrant collection initializer.

## 2. Configuration names

Backend code references `DATABASE_URL`, `REDIS_URL`, `ACCESS_TOKEN_SIG`, `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL_DAYS`, `ENCRYPTION_KEK`, `GEMINI_API_KEY`, `GEMINI_EMBEDDING_MODEL`, `GEMINI_ANSWER_MODEL`, and `QDRANT_URL`. `QDRANT_URL` defaults to `http://localhost:6333`. The frontend requires `NEXT_PUBLIC_API_URL`. `ACCESS_TOKEN_TTL` is interpreted in minutes and defaults to 10; refresh-token lifetime defaults to 7 days. The backend and Alembic load `backend/.env`; the frontend reads `frontend/.env.local`.

## 3. Persistence and migrations

SQLAlchemy models in `backend/app/models/`:
- `users`: UUID, email, password hash, wrapped DEK, created/updated timestamps.
- `sessions`: user FK, refresh-token hash, expiry, nullable revocation timestamp, created/updated timestamps.
- `captures`: user FK, nullable encrypted title, encrypted original content, status (`processing` by default), timestamps.
- `messages`: capture/user FKs, role, encrypted content, message index, nullable embedding status, timestamps.
- `chunks`: nullable capture/message FKs, source type, user FK, chunk index, encrypted content, nullable token count, embedding status, timestamps.

Alembic chain: `4daa97e258e8` creates users/sessions; `49258da2fb49` adds nullable `encrypted_dek`; `7195f4e91604` makes it non-null; `6f469958de7d` creates captures/chunks; `c8d9355c1db0` adds messages and polymorphic chunk references; `4ed272eda6f6` adds capture status and drops `chunks_exactly_one_source`.

The model comment and `chunk_indexing_service.index_content` assert that exactly one of `capture_id`/`message_id` is supplied, but the current database migration no longer enforces that with a CHECK constraint.

## 4. Encryption and vectors

`backend/app/core/encryption.py` uses AES-GCM with a 12-byte nonce prepended to each encrypted blob. Registration creates a random per-user 256-bit DEK, wraps it with the base64-decoded `ENCRYPTION_KEK`, and stores the wrapped key in `users.encrypted_dek`. Capture originals, titles, messages, and chunks are encrypted before PostgreSQL storage.

Plaintext is sent to Gemini for embeddings and generation. Qdrant stores vectors and payload IDs (`user_id`, `chunk_id`), not source text. `backend/app/core/vector_store.py` configures collection `privbit`, 768-dimensional cosine vectors, and a `user_id` payload index. Its `ensure_collection()` helper has no caller in the current code; provision the collection before ingestion/search or those operations can fail on a fresh Qdrant instance. Embeddings themselves are not encrypted.

## 5. Authentication

Routes in `backend/app/routes/auth.py` expose `POST /auth/register`, `/login`, `/logout`, `/refresh`, and `GET /auth/me`. Access tokens are HS256 JWTs in an HTTP-only `access_token` cookie; opaque refresh tokens are SHA-256 hashed in `sessions.refresh_token_hash`. Refresh rotates the session token; replay of a revoked token revokes all active sessions for that user. Cookies use `SameSite=Lax`; code does not set the `Secure` attribute. `purge_expired_sessions()` exists in `session_service.py` but is not scheduled or called. No CSRF protection is implemented.

The frontend `AuthProvider` restores identity through `/auth/me`; `AuthGuard` redirects unauthenticated private routes to `/signin`. `frontend/lib/api.ts` sends cookies on fetches and retries an authenticated request once after a 401 by refreshing first.

## 6. Capture ingestion and events

`POST /captures/` returns HTTP 201 with `{id, created_at, status: "processing"}`. `capture_service.create_capture` encrypts and commits the capture, then enqueues `process_new_capture(capture_id, user_id, content)` on the `privbit` RQ queue. Chunking, embedding, title generation, and initial thread creation happen in `backend/app/jobs/capture_jobs.py`.

The worker indexes the capture content, attempts title generation (failure is ignored), creates the initial user message and assistant reply (reply failure gets a fallback), then marks the capture `ready` and publishes a Redis event. An outer processing failure marks it `failed` and publishes that status. If the worker cannot load the user or capture, it returns without updating/publishing a terminal status. If enqueueing fails after the capture commit, the request can fail while leaving a `processing` row.

`GET /captures/{id}/events` requires the access cookie, returns 404 for a capture not owned by the user, subscribes to Redis before rechecking DB status, emits a terminal JSON status when available, sends `: keepalive` every 15 seconds, and ends after 180 seconds. `GET /captures/` returns titles and timestamps but not status. Capture list/create/rename/delete and message routes are in `backend/app/routes/captures.py`; deletion explicitly removes matching Qdrant points before PostgreSQL cascades.

## 7. Messages and retrieval

Follow-up `POST /captures/{id}/messages` saves/indexes the user message, builds decrypted full-thread history, generates and saves an assistant reply, and returns the assistant message. `GET /captures/{id}/messages` returns the ordered decrypted thread. Assistant messages are not embedded. The initial capture is indexed as capture chunks; its initial user-message row is not separately indexed.

`POST /search/` embeds a query using `RETRIEVAL_QUERY`, queries Qdrant for top 5 points filtered by `user_id`, loads/decrypts matching PostgreSQL chunks, and generates an answer from those chunks. Ingestion embeddings use `RETRIEVAL_DOCUMENT`. Responses contain `answer` and `sources_count`, not citations.

Chunking uses `tiktoken` (`cl100k_base`), NLTK sentence tokenization, a 500-token target, and 90-token sentence overlap. `chunk_indexing_service` writes each encrypted chunk as `pending`, then marks its embedding `completed` or `failed` after the Qdrant attempt. There is no automatic embedding retry worker.

## 8. Frontend

- `/`: Quick Capture and Recent Captures; successful creation clears the note, tracks the capture with credentialed EventSource, and displays processing status.
- `/threads/[captureId]`: editable title, ordered messages, and composer; a tracked capture shows setup state and reloads messages when its event reaches `ready`/`failed`.
- `CapturesProvider` is nested inside `AuthProvider`, fetches captures after auth resolves, and shares the list and in-memory processing IDs with the Sidebar and home page. On terminal SSE status it removes the ID and refreshes the list. EventSource closes on terminal status; transient CONNECTING errors are left to native reconnect behavior.
- A full browser reload loses in-memory `processingIds`; list responses omit status, so the frontend does not resume event subscriptions for captures already processing.
- `/search` calls the live search API but also contains unused mock result data. `/settings` contains static placeholder controls/copy. `/[project]` is static mock note content, not a data-backed project detail workflow. Sign-in/sign-up are separate routes.

## 9. Current status

**Done in code:** cookie/session auth; encrypted PostgreSQL content; capture CRUD; Redis/RQ asynchronous ingestion; capture-status SSE; thread messaging; user-filtered semantic retrieval; shared frontend capture state.

**In progress / temporary:** `/[project]` mock content (`frontend/app/[project]/page.tsx`); unused mock search results (`frontend/app/search/page.tsx`); static, nonfunctional settings claims and controls (`frontend/app/settings/page.tsx`). `backend/scripts/backfill_deks.py` is a one-off null-DEK backfill, although the current schema makes `encrypted_dek` non-null. `backend/app/jobs/capture_jobs.py` contains a worker `print` diagnostic when publishing ready; no TODO/FIXME markers were found in application source.

**Deferred / operational gaps:** embedding retry, expired-session cleanup scheduling, token-streamed AI output, CSRF protection, production CORS/cookie configuration, and resuming in-flight capture events after a browser reload. PostgreSQL, Redis with a running RQ worker, Qdrant, and Gemini access are required. `backend/tests/` is empty and the frontend package has no test script.

## 10. Key decisions and why

- **Envelope encryption:** a server-held KEK wraps a random per-user DEK; content fields use AES-GCM and the DEK can be rewrapped independently of user content.
- **Qdrant separate from PostgreSQL:** isolate vector representations from encrypted source content and use a dedicated vector engine. Residual risk: embeddings are derived from plaintext and are not encrypted.
- **Sentence-aware overlapping chunks:** 500-token target with 90-token overlap preserves context across boundaries; tokenizer/detector are concretely `tiktoken` and NLTK.
- **Track dual writes per chunk:** persist encrypted chunks with pending/completed/failed embedding state because PostgreSQL and Qdrant writes are not atomic; automated retries remain deferred.
- **Index user-authored content only:** assistant replies are excluded to avoid retrieval feedback loops and unnecessary embedding volume.
- **Asynchronous capture processing:** the prior synchronous-ingestion approach is superseded; Redis/RQ moves chunking, embedding, title generation, and the first reply off the create request so capture creation can return promptly, with SSE for completion state.
