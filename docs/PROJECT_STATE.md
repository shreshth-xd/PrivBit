# PrivBit project state

This file reflects the code as it exists in the repo today, not a design aspirational snapshot. It is intentionally brief and factual.

## 1. Product and runtime shape

PrivBit is a privacy-first personal knowledge base: users capture notes, those notes are encrypted and semantically indexed, and they can ask questions grounded in their own content.

Current runtime stack from the code:
- Frontend: Next.js App Router + React + TypeScript + Tailwind
- Backend: FastAPI + SQLAlchemy 2.x + Alembic + Pydantic v2
- Auth: JWT access tokens + HTTP-only cookies + hashed rotating refresh tokens
- Data stores: PostgreSQL, Qdrant, Redis
- AI: Google GenAI / Gemini embeddings and generation

Main app bootstrap is in `backend/app/main.py`: it mounts `/health`, `/auth`, `/search`, and `/captures` routers, and allows CORS from `http://localhost:3000` with credentials enabled.

## 2. Config and environment variables

The backend loads configuration from `backend/.env`; the frontend loads browser config from `frontend/.env.local`.

Environment names referenced by the code include:
- `DATABASE_URL`
- `REDIS_URL`
- `ACCESS_TOKEN_SIG`
- `ACCESS_TOKEN_TTL`
- `REFRESH_TOKEN_TTL_DAYS`
- `ENCRYPTION_KEK`
- `GEMINI_API_KEY`
- `GEMINI_EMBEDDING_MODEL`
- `GEMINI_ANSWER_MODEL`
- `QDRANT_URL`
- `NEXT_PUBLIC_API_URL`

The code also consults `ACCESS_TOKEN_TTL_MIN` in local config, but the runtime code path in `backend/app/core/security.py` reads `ACCESS_TOKEN_TTL` and falls back to a default value. This is a configuration drift point that is not currently normalized in the code.

## 3. Persistence and schema

The SQLAlchemy models in `backend/app/models/` define the core schema:
- `users`: id, email, password_hash, encrypted_dek, created_at, updated_at
- `sessions`: refresh token hash, expiry, revoke state, user linkage
- `captures`: id, user_id, encrypted_title, encrypted_content, status, timestamps
- `messages`: capture/thread message rows, encrypted_content, role, message_index, embedding_status
- `chunks`: per-capture or per-message text chunks, encrypted_content, token_count, embedding_status, user_id, source_type

`chunks` is intentionally polymorphic: `capture_id` or `message_id` is set, not both. The model comments and migration logic make that explicit.

Schema lineage from Alembic:
1. `4daa97e258e8` create users and sessions
2. `49258da2fb49` add nullable `encrypted_dek` to users
3. `7195f4e91604` make `encrypted_dek` non-null
4. `6f469958de7d` add captures and chunks tables
5. `c8d9355c1db0` add messages + polymorphic chunks
6. `4ed272eda6f6` add `captures.status` and remove the old chunks check constraint

## 4. Data protection model

The app follows envelope encryption:
- a project-wide KEK is loaded from `ENCRYPTION_KEK`
- each user gets a random DEK generated at registration
- the DEK is encrypted under the KEK and stored as `users.encrypted_dek`
- capture content, titles, and message content are encrypted with the per-user DEK before being stored in Postgres

The vector store is intentionally separate from the encrypted content store. `backend/app/core/vector_store.py` creates a Qdrant collection named `privbit` and adds a payload index on `user_id`. Qdrant points store only vector data plus payload like `user_id` and `chunk_id`; plaintext is never persisted there.

## 5. Authentication flow

Auth is cookie-based and session-backed:
- `POST /auth/register` creates a user, stores a session row, and sets both `access_token` and `refresh_token` cookies
- `POST /auth/login` does the same for an existing user
- `POST /auth/logout` revokes the current refresh token and clears cookies
- `POST /auth/refresh` validates the current refresh token, rotates it, and issues a new access token
- `GET /auth/me` returns the current user identity from the access-token cookie

Implementation details:
- access tokens are JWTs signed with HS256 using `ACCESS_TOKEN_SIG`
- refresh tokens are opaque random values, hashed with SHA-256 before storage in `sessions.refresh_token_hash`
- `session_service.rotate_session` implements replay detection: if a previously used refresh token is re-presented, all sessions for that user are revoked

## 6. Capture lifecycle and ingestion

The route layer is in `backend/app/routes/captures.py` and the controller/service split is in `backend/app/controllers/capture_controller.py` and `backend/app/services/capture_service.py`.

Actual capture lifecycle:
- `POST /captures/` creates a `Capture` row with encrypted content and returns a `processing` status immediately
- `capture_service.create_capture` encrypts the note, persists the capture, then enqueues a Redis/RQ job: `process_new_capture(capture_id, user_id, content)`
- worker processing happens in `backend/app/jobs/capture_jobs.py`

The worker does the heavy ingestion work:
1. load user + capture
2. decrypt the user DEK
3. call `chunk_indexing_service.index_content(...)`
4. generate a title with the LLM
5. create the initial user message row
6. generate an assistant reply
7. set `capture.status = "ready"` or `"failed"`
8. publish a Redis event to `capture:{capture_id}:events`

SSE endpoint: `GET /captures/{capture_id}/events` subscribes to the Redis channel and streams statuses to the frontend. If the capture is already `ready` or `failed`, it emits that state immediately; otherwise it waits for the worker publish and then exits.

## 7. Message and thread behavior

The message system is in `backend/app/services/message_service.py` and `backend/app/controllers/message_controller.py`.

Behavior today:
- a user message is encrypted and saved with `message_index` ordering
- only user-originated messages are embedded/indexed into Qdrant
- assistant replies are not embedded; they remain in Postgres as encrypted content
- the assistant reply is generated from full conversation history, using message content decrypted by the user DEK
- each `Message` row stores `role`, `encrypted_content`, `message_index`, and optional `embedding_status`

This makes the thread look like a sealed personal conversation backed by encrypted storage, while the retrieval layer sees only the user-owned semantic chunks.

## 8. Retrieval and search pipeline

The answer pipeline is in `backend/app/services/retrieval_service.py`.

Flow:
1. generate a query embedding using `RETRIEVAL_QUERY`
2. query Qdrant with a `user_id` payload filter
3. collect matching `chunk_id`s
4. load the matching chunk rows from Postgres
5. decrypt those rows with the user DEK
6. call the LLM with the decrypted context to answer the question

`search_controller` exposes `POST /search/`, and `frontend/lib/api.ts` calls it through the authenticated fetch wrapper.

## 9. Frontend behavior

The UI is split across the App Router pages:
- `frontend/app/page.tsx`: landing page and quick capture composer
- `frontend/app/threads/[captureId]/page.tsx`: thread view and message composer
- `frontend/components/Sidebar.tsx`: capture list, capture rename/delete, logout

Authentication state is centralized in `frontend/lib/auth-context.tsx`: on mount it calls `/auth/me`, and if it fails it clears the user session instead of leaving stale auth state.

The frontend API layer in `frontend/lib/api.ts` wraps every request with `credentials: "include"` and performs a single refresh retry on a `401` by calling `/auth/refresh` once before giving up.

## 10. Current code-state observations

- The app is functional as a local dev stack, but it depends on live PostgreSQL, Redis, and Qdrant services being available.
- Background workers are part of the actual architecture. If the Redis/RQ worker is not running, new captures remain in the `processing` state and never finish ingestion.
- The code has a real SSE mechanism for capture status updates, and the frontend uses it indirectly by polling or state transitions rather than by exposing explicit streaming UI for every capture.
- There is a leftover debug print in `backend/app/jobs/capture_jobs.py` when a capture is published as ready.
- The app stores all user payloads encrypted in Postgres, yet it still relies on Qdrant for retrieval relevance and is not a fully offline/local-only system; it uses Gemini APIs for both embeddings and generation.

## 11. Working status

As coded, the project is a working local-first personal RAG system with privacy-preserving storage and a queue-backed ingestion lifecycle. The most important implementation realities to remember are:
- encrypted content lives in Postgres
- vector data lives in Qdrant
- auth is cookie-based with rotating refresh tokens
- capture ingestion is asynchronous via Redis/RQ
- retrieval is per-user and grounded in decrypted chunks fetched back from Postgres

No secrets are included in this document; only the environment variable names are listed.
