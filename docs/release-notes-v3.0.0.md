### Added
- Redis and RQ background processing for captures, with `processing`/`ready`/`failed` capture status and immediate capture-create responses.
- Capture SSE events through Redis Pub/Sub, including a database status check after subscription, plus streamed assistant replies.
- Retry worker sweeps for captures, chunks, and user-message indexing, capture/chunk attempt counters, job locks, and hourly purge of expired sessions.
- Search sources and Markdown rendering for assistant replies.
- Frontend EventSource tracking, shared captures context, and processing/failed/stalled states.
- CSRF protection, environment-driven cookie and CORS settings, and backend/frontend `.env.example` files.
- Centralized frontend color tokens and a fallback-reply cleanup script.
- Automatic Qdrant collection creation on API startup: 768-dimensional cosine vectors with a keyword `user_id` payload index.

### Changed
- **Breaking:** `POST /captures/` now returns `{id, created_at, status}` immediately; ingestion, title generation, and the initial reply run in the background.
- **Breaking:** mutating capture/search routes and logout require the `X-CSRF-Token` header matching the `csrf_token` cookie.
- Follow-up message indexing runs in the background; capture list items include status; search responses include source captures.
- Redesigned the frontend palette and centralized its color tokens.

### Fixed
- AI reply failures no longer save apology messages; failures are explicit and eligible processing is retried.
- Search chunk fetches now filter by `user_id` and preserve Qdrant relevance order.
- Embedding and LLM modules load `.env` themselves; the worker rolls back before marking a capture failed; debug prints were removed.

### Security
- Capture plaintext is no longer passed through Redis job arguments; jobs receive database IDs only.
- Added double-submit CSRF validation and Redis locks to avoid concurrent duplicate job execution.