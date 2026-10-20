Last updated: 2026-10-20 | Last verified against commit: f3fea11

# PrivBit project state

Present-state snapshot based on application code and Alembic revisions.

## 1. Product and runtime

PrivBit is a personal capture, thread, and semantic question-answering application.
- Frontend: Next.js App Router, React, TypeScript, Tailwind CSS.
- Backend: FastAPI, Pydantic v2, SQLAlchemy 2.x, Alembic.
- Services: PostgreSQL, Redis/RQ, Qdrant, Google Gemini APIs.
- Run three backend processes from `backend/`: `fastapi dev app/main.py` (API), `python -m app.worker` (RQ queue `privbit`), and `python -m app.retry_worker` (retry sweeper and session purge). Redis, PostgreSQL, Qdrant, and Gemini access must also be available. Workers are independent processes and must be restarted after job-code changes.
- API startup calls `ensure_collection()`. On first start against an empty Qdrant, it creates `privbit` with 768-dimensional cosine vectors and a keyword `user_id` payload index. A failed Qdrant check is logged; the API still starts, but indexing cannot work until Qdrant is reachable.

## 2. Configuration names

Backend variables: `DATABASE_URL`, `REDIS_URL`, `QDRANT_URL`, `ACCESS_TOKEN_SIG`, `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL_DAYS`, `ENCRYPTION_KEK`, `GEMINI_API_KEY`, `GEMINI_EMBEDDING_MODEL`, `GEMINI_ANSWER_MODEL`, `COOKIE_SECURE`, `COOKIE_DOMAIN`, and `CORS_ORIGINS`. `QDRANT_URL` defaults to localhost; access-token TTL defaults to 10 minutes and refresh-token lifetime to 7 days. The frontend uses `NEXT_PUBLIC_API_URL`. Examples are in `backend/.env.example` and `frontend/.env.example`; backend modules load `backend/.env` and the frontend uses its local environment file.

Route inventory: `GET /health/`; `POST /auth/register`, `/auth/login`, `/auth/logout`, `/auth/refresh`; `GET /auth/me`; `POST /captures/`, `GET /captures/`, `PATCH /captures/{id}`, `DELETE /captures/{id}`; `POST /captures/{id}/messages`, `POST /captures/{id}/messages/stream`, `GET /captures/{id}/messages`, `GET /captures/{id}/events`; `POST /search/`.

## 3. Persistence and migrations

SQLAlchemy models in `backend/app/models/` map to:
- `users`: UUID, email, password hash, wrapped DEK, created/updated timestamps.
- `sessions`: user FK, refresh-token hash, expiry, nullable revocation timestamp, created/updated timestamps.
- `captures`: user FK, nullable encrypted title, encrypted original content, status (`processing` by default), `processing_attempts`, timestamps.
- `messages`: capture/user FKs, role, encrypted content, message index, nullable embedding status, timestamps.
- `chunks`: nullable capture/message FKs, source type, user FK, chunk index, encrypted content, nullable token count, embedding status, `embedding_attempts`, timestamps. The current database has no CHECK constraint requiring exactly one source FK.

Migration chain: `4daa97e258e8` (users/sessions) -> `49258da2fb49` (nullable `encrypted_dek`) -> `7195f4e91604` (DEK non-null) -> `6f469958de7d` (captures/chunks) -> `c8d9355c1db0` (messages and polymorphic chunk references) -> `4ed272eda6f6` (capture status and removal of the source CHECK constraint) -> `9c7f2ab61d40` (`captures.processing_attempts`, `chunks.embedding_attempts`).

## 4. Encryption and vectors

`backend/app/core/encryption.py` uses AES-GCM. Registration creates a random per-user 256-bit DEK, wraps it with the base64-decoded `ENCRYPTION_KEK`, and stores it in `users.encrypted_dek`. Capture originals, titles, messages, and chunks are encrypted before PostgreSQL storage. Plaintext is sent to Gemini for generation and embeddings. Qdrant collection `privbit` stores vectors and ID payloads (`user_id`, `chunk_id`), not source text; embeddings are not encrypted and can reveal information about their source text.

## 5. Authentication

Routes expose `POST /auth/register`, `/login`, `/logout`, `/refresh`, and `GET /auth/me`. Access tokens are HS256 JWTs in an HTTP-only `access_token` cookie; opaque refresh tokens are SHA-256 hashed in `sessions.refresh_token_hash`. Refresh rotates the session token; replay of a revoked token revokes all active sessions for that user. Auth cookies use `SameSite=Lax`; `COOKIE_SECURE` and `COOKIE_DOMAIN` control secure/domain attributes.

CSRF uses the double-submit design: a script-readable `csrf_token` cookie must match the `X-CSRF-Token` request header using constant-time comparison. It is enforced on `POST /auth/logout` and non-safe methods on the `/captures` and `/search` routers; GET/HEAD/OPTIONS are exempt. Register, login, and refresh are not behind this dependency. The frontend fetch wrapper sends the header for non-GET/HEAD requests when the cookie exists.

## 6. Capture ingestion and events

`POST /captures/` returns HTTP 201 with `{id, created_at, status: "processing"}` after encrypting and committing the capture, then enqueues a job with only capture/user IDs. The RQ worker decrypts from PostgreSQL, chunks/indexes the capture, generates a title and initial assistant reply, then stores terminal status and publishes it to Redis. Failures are retried; no apology assistant message is stored on generation failure.

Jobs use ID-only arguments so plaintext capture content is not put in Redis. Redis `SET NX` locks with a 900-second TTL prevent concurrent duplicate work. Jobs use idempotent database checks around chunk/message creation. `MAX_ATTEMPTS` is 5 for captures and chunk embedding attempts; the retry worker sweeps every 60 seconds for work stalled for 180 seconds, re-enqueues eligible captures/chunks/messages, and marks exhausted captures failed. It also purges expired sessions hourly.

`GET /captures/{id}/events` checks ownership, subscribes to Redis Pub/Sub, then rechecks database status to close the subscribe/status race. It sends an existing `ready`/`failed` status immediately, otherwise waits for the worker event, emits 15-second keepalives, and ends after 180 seconds. `GET /captures/` includes each capture's `processing`/`ready`/`failed` status. Capture deletion removes associated Qdrant points before the PostgreSQL cascade.

## 7. Messages and retrieval

Routes include `POST /captures/{id}/messages`, `POST /captures/{id}/messages/stream`, and `GET /captures/{id}/messages`. The streaming endpoint sends SSE `delta`, `done`, and `error` events; a complete assistant response is encrypted and saved only on success. Failed generation leaves the user message but does not save an apology/fallback assistant message. Follow-up user-message indexing is queued separately. Assistant messages are never embedded.

`POST /search/` embeds the query as `RETRIEVAL_QUERY`, requests the top five Qdrant points filtered by `user_id`, fetches matching PostgreSQL chunks in relevance order with a second user filter, decrypts them, and generates an answer. The response includes `answer`, `sources_count`, and unique source captures (`capture_id`, title). Ingestion uses `RETRIEVAL_DOCUMENT` embeddings. Chunking uses `tiktoken` (`cl100k_base`), NLTK sentence tokenization, a 500-token target, and 90-token overlap.

## 8. Frontend

- `/`: Quick Capture and Recent Captures; successful creation tracks status with credentialed EventSource.
- `/threads/[captureId]`: editable title, ordered messages, streamed assistant replies, and composer. Assistant text uses `components/Markdown.tsx` with `react-markdown` and styled paragraph/list/code/quote/link elements.
- `CapturesProvider` fetches status-bearing capture lists and shares them with the home page and Sidebar. It opens EventSource for processing captures and refreshes the list on terminal status. After a full reload, it reconnects for processing captures created within the last 15 minutes; older processing captures display as stalled and are not resubscribed. Server-side jobs continue if the tab is closed.
- `/search` uses the search API and renders source results. `/settings` is placeholder UI; `/[project]` is static mock content rather than a data-backed project workflow. Sign-in and sign-up are separate routes.
- `globals.css` defines `--app-bg`, `--card`, `--surface-muted`, `--border`, `--border-strong`, `--ink`, `--ink-soft`, `--ink-muted`, `--primary`, `--primary-hover`, `--primary-soft`, `--danger`, and `--success`, mapped into Tailwind theme colors.

## 9. Current status

Implemented: cookie/session auth and CSRF; encrypted PostgreSQL content; asynchronous capture ingestion; retry sweeper and hourly session purge; capture-status SSE; streamed assistant replies; source-aware semantic search; frontend shared capture state and processing/failed/stalled states.

Known gaps: `/[project]` and `/settings` remain static/placeholder pages; there are no automated tests or Docker packaging; embeddings are not encrypted; processing events are not resumed after reload for captures older than the frontend's 15-minute tracking window (status is still displayed, and server work continues).

## 10. Key decisions and why

- **Envelope encryption:** a server-held KEK wraps a random per-user DEK; content fields use AES-GCM and the DEK can be rewrapped independently of user content.
- **Qdrant separate from PostgreSQL:** isolate vector representations from encrypted source content and use a dedicated vector engine. Residual risk: embeddings are derived from plaintext and are not encrypted.
- **Sentence-aware overlapping chunks:** a 500-token target with 90-token overlap preserves context across boundaries; tokenization uses `tiktoken` and NLTK.
- **Track dual writes per chunk:** PostgreSQL chunk rows track embedding state because PostgreSQL and Qdrant writes are not atomic; retry jobs recover eligible work.
- **RQ over a PostgreSQL queue or arq:** Redis/RQ provides background processing with the existing Redis service and a separate worker process.
- **ID-only jobs:** jobs carry database IDs, not plaintext, so capture content does not sit in Redis job arguments.
- **SSE plus Redis Pub/Sub instead of polling:** workers publish terminal capture state and connected clients receive it through the API event endpoint.
- **Double-submit CSRF:** cookie/header equality protects cookie-authenticated mutating routes.
- **Index user-authored content only:** assistant replies are never embedded, avoiding retrieval feedback loops and unnecessary indexing.
- **No saved apology messages:** failed AI generation is represented as an explicit error and retried where applicable, rather than persisted as assistant content.
- **Asynchronous capture processing:** chunking, embedding, title generation, and the initial reply run off the create request so capture creation returns promptly.
