# PrivBit

A privacy-first, RAG-based personal knowledge base. Capture your thoughts,
have them semantically indexed, and converse with an AI grounded in your own
private context — with encryption and embedding deliberately kept as
separate concerns throughout the architecture.

## Core design principles

- **Privacy by architecture, not by promise.** Content is encrypted at rest
  under a per-user envelope-encryption scheme (KEK/DEK), and the vector
  store holding semantic embeddings is kept isolated from the encrypted
  content store — no single compromised system exposes both what you wrote
  and its searchable meaning.
- **Separation of concerns end-to-end.** Encrypted content and its vector
  representation are never colocated in the same store; auth, business
  logic, and route handling are layered (routes → controllers → services);
  chunking, embedding, and encryption are independent, composable steps.
- **Deliberate, documented trade-offs.** Where scalability or security
  competes with simplicity (Qdrant over pgvector, synchronous ingestion as
  an interim step before a background job queue), the trade-off is made
  explicitly and revisited as the project matures — not left implicit.

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

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Next.js    │ ───▶ │   FastAPI    │ ───▶ │  PostgreSQL  │
│  (frontend)  │      │  (backend)   │      │ (encrypted   │
└─────────────┘      └──────┬───────┘      │  content,    │
                             │              │  auth, users)│
                             ▼              └─────────────┘
                      ┌──────────────┐
                      │    Qdrant     │
                      │ (vector store,│
                      │  no plaintext)│
                      └──────────────┘
```

**Ingestion:** capture → chunked (token-based, overlap, sentence-boundary
aware) → each chunk encrypted (AES-GCM, per-user DEK) and stored in
Postgres → each chunk's *plaintext* embedded (Gemini) and upserted to
Qdrant as `{chunk_id, vector, user_id}` — Qdrant never stores plaintext or
encrypted content, only vectors and IDs.

**Retrieval:** query embedded → Qdrant semantic search (filtered by
`user_id`) returns matching `chunk_id`s → those chunks fetched from
Postgres and decrypted → assembled as context → fed to the LLM for a
grounded answer.

## Tech stack

**Backend:** Python, FastAPI, SQLAlchemy 2.x, Alembic, Pydantic v2,
`passlib`/`bcrypt`, `cryptography` (AES-GCM), `tiktoken`, NLTK

**Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS

**Data stores:** PostgreSQL (users, sessions, captures, messages, chunks —
all encrypted content), Qdrant (vector embeddings only)

**AI/ML:** Gemini (`gemini-embedding-001` for embeddings, Gemini Flash for
answer generation and titling) — model names are environment-configurable,
not hardcoded

## Getting started

### Prerequisites
- Python 3.12+
- Node.js (required to run Next.js/npm — the frontend's underlying JS runtime, not a separately-chosen backend technology)
- PostgreSQL
- A running Qdrant instance (e.g. via Docker)
- A Gemini API key

### Backend setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

(If `requirements.txt` doesn't exist yet in your checkout, generate it from
your working environment with `pip freeze > requirements.txt` and commit
it — it should include at minimum: `fastapi`, `uvicorn`, `sqlalchemy`,
`alembic`, `psycopg`, `pydantic`, `python-dotenv`, `PyJWT`, `passlib`,
`bcrypt==4.0.1` (pinned — newer versions break `passlib`'s version
detection), `cryptography`, `tiktoken`, `nltk`, `google-genai`,
`qdrant-client`.)

Create `backend/.env`:

```env
DATABASE_URL=postgresql+psycopg://username:password@localhost:5432/privbit

ACCESS_TOKEN_SIG=<generate with: python -c "import secrets; print(secrets.token_urlsafe(64))">
ACCESS_TOKEN_TTL=15
REFRESH_TOKEN_TTL_DAYS=7

ENCRYPTION_KEK=<generate with: python -c "import secrets, base64; print(base64.b64encode(secrets.token_bytes(32)).decode())">

GEMINI_API_KEY=<your Gemini API key>
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
GEMINI_ANSWER_MODEL=<your chosen Gemini Flash model>

QDRANT_URL=http://localhost:6333
```

Run migrations and start the server:

```bash
alembic upgrade head
fastapi dev app/main.py
```

### Frontend setup

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

```bash
npm run dev
```

## API overview

| Endpoint | Description |
|---|---|
| `POST /auth/register` | Create a user, immediately authenticated |
| `POST /auth/login` | Authenticate, issues access + refresh tokens |
| `POST /auth/refresh` | Rotates refresh token, issues new access token |
| `GET /auth/me` | Current authenticated user |
| `POST /auth/logout` | Revokes session, clears cookies |
| `POST /captures/` | Create a capture — chunks, encrypts, embeds, titles, and generates an initial reply |
| `GET /captures/` | List a user's captures |
| `PATCH /captures/{id}` | Rename a capture |
| `DELETE /captures/{id}` | Delete a capture and its chunks/messages, including Qdrant cleanup |
| `POST /captures/{id}/messages` | Post a follow-up message in a capture's thread |
| `GET /captures/{id}/messages` | Retrieve a capture's full message history |
| `POST /search/` | Semantic search + LLM-generated grounded answer across a user's captures |

All endpoints except `/auth/register` and `/auth/login` require a valid
access token, delivered via HTTP-only cookie.

## Known trade-offs & roadmap

- **Ingestion is currently synchronous** — chunking, embedding, title
  generation, and initial-reply generation all happen inline within the
  request/response cycle. A background job queue is planned to decouple
  this, once needed.
- **Failed chunk embeddings** are tracked per-chunk (`embedding_status`)
  but not yet automatically retried — a retry worker is a natural extension
  of the eventual job queue.
- **No streaming AI output yet** — replies are returned whole; token-level
  streaming is a planned UX improvement.
- **No CSRF protection yet** — deferred during initial auth buildout,
  flagged for the production security hardening pass.
