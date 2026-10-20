# PrivBit


<div align="center">

A privacy-first, RAG-based personal knowledge base. Capture your thoughts,
have them semantically indexed, and converse with an AI grounded in your own
context. Content is encrypted at rest in PostgreSQL; semantic embeddings are
stored separately in Qdrant and are not encrypted.


<br/>


## Tech Stack

### Backend
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-D71F00?style=for-the-badge&logo=sqlalchemy&logoColor=white)
![Alembic](https://img.shields.io/badge/Alembic-Migrations-6BA539?style=for-the-badge)
![Pydantic](https://img.shields.io/badge/Pydantic-E92063?style=for-the-badge&logo=pydantic&logoColor=white)
![Cryptography](https://img.shields.io/badge/Cryptography-AES--GCM-6D28D9?style=for-the-badge)
![tiktoken](https://img.shields.io/badge/tiktoken-Tokenization-412991?style=for-the-badge)
![NLTK](https://img.shields.io/badge/NLTK-NLP-154F3C?style=for-the-badge)
![Docker](https://img.shields.io/badge/Docker-Containerized_DB-2496ED?style=for-the-badge\&logo=docker\&logoColor=white)

### Frontend
![Next.js](https://img.shields.io/badge/Next.js-App_Router-000000?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)

### Data Stores & Job Processing
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Qdrant](https://img.shields.io/badge/Qdrant-DC244C?style=for-the-badge)

### AI / ML
![Google Gemini](https://img.shields.io/badge/Google_Gemini-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white)
![RAG](https://img.shields.io/badge/RAG-Retrieval_Augmented_Generation-2563EB?style=for-the-badge)
![Vector Search](https://img.shields.io/badge/Vector_Search-Embedding_Based_Retrieval-0F766E?style=for-the-badge)



</div>

## Core design principles

- **Privacy by architecture, with explicit limits.** Content is encrypted at
  rest under a per-user envelope-encryption scheme (KEK/DEK). The vector store
  is separate from PostgreSQL, but embeddings are not encrypted and can leak
  information about their source text.
- **Separation of concerns end-to-end.** Encrypted content and its vector
  representation are never colocated in the same store; auth, business
  logic, and route handling are layered (routes → controllers → services);
  chunking, embedding, and encryption are independent, composable steps.
- **Deliberate, documented trade-offs.** Redis/RQ handles background jobs;
  operational gaps and data-protection limits are listed below rather than
  implied away.

## Features

- **Encrypted personal knowledge capture** — write freely; content is
  chunked, embedded, and encrypted transparently.
- **Semantic search** — ask questions in natural language and get answers
  grounded in your own captured content via RAG (retrieval-augmented
  generation), not generic model knowledge.
- **Conversational threads** — every capture can be continued as a
  multi-turn conversation, with full context passed to the LLM on each
  turn, similar to ChatGPT/Claude Desktop's chat model.
- **Automatic titling** — captures are titled by the LLM on creation, and
  are user-editable afterward.
- **Secure, rotating auth** — JWT access tokens paired with opaque,
  rotating refresh tokens with reuse detection (token replay revokes all
  sessions for that user).
- **Background capture processing** — capture creation returns promptly;
  the RQ worker performs chunking, embeddings, titling, and the initial reply.
- **Processing updates** — capture state is published over Redis Pub/Sub and
  delivered through Server-Sent Events (SSE); a retry worker reschedules
  stale work and purges expired sessions hourly.
- **Streamed thread replies** — assistant text arrives as SSE deltas and is
  saved after successful generation.
- **Source-aware search** — semantic results include the matching capture
  titles and IDs.
- **CSRF protection** — mutating capture/search routes and logout use a
  double-submit cookie/header check.

## Architecture

```
Next.js frontend
  | cookie-authenticated HTTP / SSE
  v
FastAPI API --------------------------> PostgreSQL
  |                                      ^
  | enqueue IDs                          | load/decrypt/index
  v                                      |
Redis (RQ queue + Pub/Sub) <---------- RQ worker
  ^                                      |  \
  | retry sweeper                        |   +--> Gemini
  |                                      +------> Qdrant
  +---------------- retry worker                 (vectors)

Capture completion: worker commits status -> publishes Redis event ->
API SSE endpoint delivers it to EventSource clients (with a DB status
check on connect). Thread replies stream Gemini deltas through the API
and are saved to PostgreSQL on success.
```

**Ingestion:** `POST /captures/` encrypts and stores the capture in
PostgreSQL, then enqueues a job containing only its IDs in Redis/RQ. The RQ
worker decrypts the content, chunks it, stores encrypted chunks, sends
plaintext to Gemini for embeddings, and upserts `{chunk_id, vector,
user_id}` to Qdrant. Qdrant stores vectors and IDs, not source text. The
API creates the `privbit` collection on first startup if absent (768
dimensions, cosine distance, keyword `user_id` payload index).

**Retrieval:** query embedded → Qdrant semantic search filtered by
`user_id` → matching chunks fetched from PostgreSQL in relevance order and
decrypted → answer generated by Gemini with unique capture sources returned
to the client. Capture completion status uses Redis Pub/Sub and SSE;
thread reply generation streams deltas to the client and persists a
successful reply.

## Tech stack

**Backend:** Python, FastAPI, SQLAlchemy 2.x, Alembic, Pydantic v2,
`passlib`/`bcrypt`, `cryptography` (AES-GCM), `tiktoken`, NLTK

**Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS

**Data stores and jobs:** PostgreSQL (users, sessions, captures, messages,
encrypted chunks), Redis/RQ (job queue, locks, and Pub/Sub events), Qdrant
(vectors and ID payloads only)

**AI/ML:** Gemini (`gemini-embedding-001` for embeddings, Gemini Flash for
answer generation and titling) — model names are environment-configurable,
not hardcoded

## Getting started

### Prerequisites
- Python 3.12+
- Node.js (required to run Next.js/npm — the frontend's underlying JS runtime, not a separately-chosen backend technology)
- PostgreSQL
- Redis
- Qdrant
- A Gemini API key

### Backend setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Copy `backend/.env.example` to `backend/.env` and set its values. The
backend variables are `DATABASE_URL`, `REDIS_URL`, `QDRANT_URL`,
`ACCESS_TOKEN_SIG`, `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL_DAYS`,
`ENCRYPTION_KEK`, `GEMINI_API_KEY`, `GEMINI_EMBEDDING_MODEL`,
`GEMINI_ANSWER_MODEL`, `COOKIE_SECURE`, `COOKIE_DOMAIN`, and
`CORS_ORIGINS`. Do not commit real credentials.

Run migrations and start all three backend processes in separate terminals,
from `backend/` with the virtual environment active:

```bash
alembic upgrade head
fastapi dev app/main.py
```

```bash
python -m app.worker
```

```bash
python -m app.retry_worker
```

The API creates the Qdrant collection automatically on first startup if it
does not exist: collection `privbit`, 768 dimensions, cosine distance, and
a keyword payload index on `user_id`. Restart both workers after changing
job code; they run as separate processes.

### Frontend setup

```bash
cd frontend
npm install
```

Copy `frontend/.env.example` to `frontend/.env.local` and set
`NEXT_PUBLIC_API_URL`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

```bash
npm run dev
```

### Production notes

Serve the API behind HTTPS and set `COOKIE_SECURE=true`. Set `CORS_ORIGINS`
to the exact frontend origin(s). Set `COOKIE_DOMAIN` when the frontend and
API use different subdomains and need to share cookies.

## API overview

| Endpoint | Description |
|---|---|
| `POST /auth/register` | Create a user, immediately authenticated |
| `POST /auth/login` | Authenticate, issues access + refresh tokens |
| `POST /auth/refresh` | Rotates refresh token, issues new access token |
| `GET /auth/me` | Current authenticated user |
| `POST /auth/logout` | Revokes session, clears cookies |
| `GET /health/` | Health check |
| `POST /captures/` | Create encrypted capture and enqueue processing; returns `{id, created_at, status}` |
| `GET /captures/` | List a user's captures, including processing status |
| `PATCH /captures/{id}` | Rename a capture |
| `DELETE /captures/{id}` | Delete a capture and its chunks/messages, including Qdrant cleanup |
| `POST /captures/{id}/messages` | Post a follow-up message and return a complete reply |
| `POST /captures/{id}/messages/stream` | Post a follow-up message and stream assistant reply events |
| `GET /captures/{id}/messages` | Retrieve a capture's full message history |
| `GET /captures/{id}/events` | Stream capture `ready`/`failed` status events |
| `POST /search/` | Semantic search and grounded answer, including source captures |

Authenticated routes use the HTTP-only `access_token` cookie. For CSRF,
`POST /auth/logout` and mutating `/captures` and `/search` routes require
the readable `csrf_token` cookie value in the `X-CSRF-Token` header. Register,
login, and refresh are exempt. Capture creation returns immediately; status
updates arrive over SSE. The thread stream uses SSE `delta`, `done`, and
`error` events.

## Known trade-offs & roadmap

- **Static pages:** `/[project]` is mock project content and `/settings` is
  placeholder UI; neither is a data-backed workflow.
- **No automated tests** are currently included.
- **No Docker packaging** is currently included.
- **Embeddings are not encrypted.** They are derived from plaintext and can
  leak information about the source text even though Qdrant does not store
  that text.
- **Capture status after a reload:** the capture list reloads status and the
  frontend reconnects to events for processing captures created within the
  last 15 minutes. Older processing captures are shown as stalled and are
  not resubscribed. Closing the tab does not stop the server-side job.
