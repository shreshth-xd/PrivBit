## [1.5.0] - 2026-08-27

### Added
- **JWT-based access token authentication** using PyJWT (HS256), with `sub`, `iat`, `exp` claims and a configurable TTL (default 15 minutes) via `ACCESS_TOKEN_SIG` and `ACCESS_TOKEN_TTL` environment variables.
- **Opaque refresh token mechanism** backed by the `sessions` table:
  - High-entropy random tokens (`secrets.token_urlsafe(32)`), only their SHA-256 hash persisted (`refresh_token_hash`).
  - 7-day TTL (`REFRESH_TOKEN_TTL_DAYS`).
  - **Refresh token rotation**: every successful `/auth/refresh` call issues a new refresh token and revokes the old session row.
  - **Reuse detection**: presenting an already-revoked (previously rotated) refresh token triggers revocation of *all* active sessions for that user, treating replay as a signal of token theft.
- **Password hashing** via `passlib` with the `bcrypt` backend.
- **Auth endpoints** (`app/routes/auth.py`, orchestrated through `app/controllers/auth_controller.py`):
  - `POST /auth/register` — creates a user, immediately issues tokens (no separate login step required).
  - `POST /auth/login` — authenticates and issues tokens.
  - `POST /auth/refresh` — rotates the refresh token and issues a new access token.
  - `GET /auth/me` — returns the authenticated user's `{id, email}`, resolved from the DB via the access token's `sub` claim.
  - `POST /auth/logout` — revokes the session tied to the presented refresh token and clears both auth cookies.
- **`app/services/session_service.py`** — session lifecycle logic: `create_session`, `revoke_session`, `revoke_all_sessions_for_user`, `rotate_session`, `revoke_session_by_raw_token`.
- **`app/services/user_service.py`** — user lookup/creation/authentication: `get_user_by_email`, `get_user_by_id`, `create_user`, `authenticate_user`.
- **`app/schemas/auth.py`** — Pydantic request/response schemas (`RegisterRequest`, `LoginRequest`, `UserResponse`).
- **Cookie-based token delivery**: both access and refresh tokens set as HTTP-only cookies (`set_access_token_cookie`, `set_refresh_token_cookie`, `clear_auth_cookies` in `core/security.py`), avoiding in-memory token storage on the frontend.
- **CORS middleware** in `main.py`, configured with an explicit origin allowlist (`http://localhost:3000`) and `allow_credentials=True` to support cookie-based cross-origin auth.
- **Frontend: `lib/api.ts`** — typed fetch wrapper for all auth calls, using `NEXT_PUBLIC_API_URL` and `credentials: "include"` throughout.
  - Built-in 401 → `/auth/refresh` → retry-once interceptor (`authedFetch`), with refresh-call coalescing (`refreshPromise`) to prevent concurrent 401s from firing duplicate refresh requests and falsely triggering reuse detection.
  - `ApiError` class for distinguishing backend API errors from generic network failures.
- **Frontend: `lib/auth-context.tsx`** — `AuthProvider`/`useAuth()` React context; restores session on page load via `/auth/me`, exposes `login`, `register`, `logout`, `user`, and `loading` state app-wide.
- **Frontend: route guarding** on the home page (`app/page.tsx`) — redirects unauthenticated visitors to `/signin`, with a loading state to prevent protected content from flashing before the auth check resolves.
- **Frontend: signin/signup pages wired to real auth logic** — form submission, inline error messaging, loading/disabled button states, and post-auth redirect to `/`.
- **Frontend: functional logout** — logout button in the sidebar profile block, calling the backend logout endpoint and clearing local auth state regardless of network outcome.

### Changed
- **Router configuration convention**: `prefix`/`tags` for all routers now declared centrally at `include_router()` calls in `main.py`, rather than inside individual router files (`APIRouter()` instantiated bare in route files).
- **`GET /auth/me`** now performs a real DB lookup (`get_user_by_id`) instead of returning only the JWT's `sub` claim, so its response shape (`{id, email}`) matches `register`/`login` for frontend consistency.

### Fixed
- **`app/core/pool.py`**: corrected an import-order bug (`pathlib.Path` referenced before import) and a name collision between `pathlib.Path` and `fastapi.Path` that caused the wrong `Path` to be imported.
- **`passlib`/`bcrypt` incompatibility**: pinned `bcrypt==4.0.1` to resolve `AttributeError: module 'bcrypt' has no attribute '__about__'`, which was manifesting as an opaque 500 error (itself surfacing to the browser as a misleading CORS failure, since Starlette's CORS middleware doesn't attach headers to unhandled-exception responses).
- **Missing route registration**: `auth_router` was defined but never included in `main.py`, leaving all `/auth/*` endpoints unreachable (404) despite being fully implemented.
- **Missing `/auth/register` and `/auth/login` handlers**: restored after being inadvertently dropped from `routes/auth.py` during a prior edit.
- **`NEXT_PUBLIC_API_URL` misconfiguration**: corrected from the frontend's own origin (`http://localhost:3000`) to the backend's origin (`http://localhost:8000`), which had been causing all API calls to silently 404 against the Next.js server instead of reaching FastAPI.

### Security
- Refresh tokens are never stored in plaintext — only SHA-256 hashes persist in the `sessions` table.
- Access tokens are stateless (no DB record), keeping their compromise blast radius limited to their short TTL.
- Refresh token rotation plus reuse detection (session-wide revocation on replay) added as a defense against token theft/replay attacks.