// frontend/lib/api.ts

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_BASE_URL) {
  throw new Error("NEXT_PUBLIC_API_URL is not set");
}

// --- Types matching your backend Pydantic schemas ---

export interface UserResponse {
  id: string;
  email: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

// --- Custom error so callers can distinguish API errors from network errors ---

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
    this.name = "ApiError";
  }
}

// --- Core fetch wrapper ---
// Every call goes through this so `credentials: "include"` (send/receive cookies
// cross-origin) is never forgotten on an individual call site.

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const method = (options.method ?? "GET").toUpperCase();
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (method !== "GET" && method !== "HEAD" && typeof document !== "undefined") {
    const csrfCookie = document.cookie
      .split(";")
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith("csrf_token="));
    if (csrfCookie) {
      headers.set("X-CSRF-Token", decodeURIComponent(csrfCookie.slice("csrf_token=".length)));
    }
  }
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers,
  });
}

// --- 401 → refresh → retry-once wrapper ---
// This is the interceptor. It wraps apiFetch: if a call comes back 401,
// it attempts exactly one /auth/refresh, then retries the original call
// exactly once. If refresh itself fails, it gives up (session is truly dead —
// caller should redirect to /signin).

let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  // Coalesce concurrent 401s into a single /auth/refresh call, rather than
  // firing one refresh request per failed request if several happen at once.
  if (!refreshPromise) {
    refreshPromise = apiFetch("/auth/refresh", { method: "POST" })
      .then((res) => res.ok)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

async function authedFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const response = await apiFetch(path, options);

  if (response.status !== 401) {
    return response;
  }

  const refreshed = await refreshAccessToken();
  if (!refreshed) {
    return response; // refresh failed — return the original 401, caller handles it
  }

  return apiFetch(path, options); // retry original request exactly once
}

// --- Helper to parse a response or throw ApiError with backend's `detail` message ---

async function parseOrThrow<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let detail = "Something went wrong";
    try {
      const body = await response.json();
      detail = body.detail ?? detail;
    } catch {
      // response wasn't JSON — keep default detail
    }
    throw new ApiError(response.status, detail);
  }
  return response.json();
}

// --- Public API functions ---

export async function register(payload: RegisterPayload): Promise<UserResponse> {
  const response = await apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return parseOrThrow<UserResponse>(response);
}

export async function login(payload: LoginPayload): Promise<UserResponse> {
  const response = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return parseOrThrow<UserResponse>(response);
}


export async function logout(): Promise<void> {
  await apiFetch("/auth/logout", { method: "POST" });
}


export async function getCurrentUser(): Promise<UserResponse> {
  const response = await authedFetch("/auth/me");
  return parseOrThrow<UserResponse>(response);
}

// --- New endpoints: captures and search ---

export interface CaptureResponse {
  id: string;
  created_at: string;
  status: string;
}

export type CaptureEventStatus = "ready" | "failed";

export interface CaptureListItem {
  id: string;
  title: string | null;
  created_at: string;
  status: "processing" | "ready" | "failed";
}

export interface CaptureListResponse {
  captures: CaptureListItem[];
}

export interface MessageResponse {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

export interface MessageListResponse {
  messages: MessageResponse[];
}

export interface SearchResponse {
  answer: string;
  sources_count: number;
}

export interface StreamMessageHandlers {
  onDelta: (text: string) => void;
  onDone: (messageId: string) => void;
  onError: (detail: string) => void;
}

export async function createCapture(content: string): Promise<CaptureResponse> {
  const response = await authedFetch("/captures/", {
    method: "POST",
    body: JSON.stringify({ content }),
  });
  return parseOrThrow<CaptureResponse>(response);
}

export async function listCaptures(): Promise<CaptureListResponse> {
  const response = await authedFetch("/captures/");
  return parseOrThrow<CaptureListResponse>(response);
}

export function subscribeToCaptureEvents(
  captureId: string,
  onStatus: (status: CaptureEventStatus) => void,
): () => void {
  const eventSource = new EventSource(
    `${API_BASE_URL}/captures/${encodeURIComponent(captureId)}/events`,
    { withCredentials: true },
  );
  let terminalStatusReceived = false;

  eventSource.onmessage = (event) => {
    try {
      const { status } = JSON.parse(event.data) as { status: CaptureEventStatus };
      onStatus(status);
      if (status === "ready" || status === "failed") {
        terminalStatusReceived = true;
        eventSource.close();
      }
    } catch {
      // Ignore malformed events and keep listening for a valid terminal status.
    }
  };

  eventSource.onerror = () => {
    if (eventSource.readyState === EventSource.CONNECTING) return;
    if (eventSource.readyState === EventSource.CLOSED && !terminalStatusReceived) {
      terminalStatusReceived = true;
      onStatus("failed");
    }
  };

  return () => {
    terminalStatusReceived = true;
    eventSource.close();
  };
}

export async function updateCaptureTitle(captureId: string, title: string): Promise<CaptureListItem> {
  const response = await authedFetch(`/captures/${encodeURIComponent(captureId)}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });
  return parseOrThrow<CaptureListItem>(response);
}

export async function deleteCapture(captureId: string): Promise<void> {
  const response = await authedFetch(`/captures/${encodeURIComponent(captureId)}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    await parseOrThrow<void>(response);
  }
}

export async function getMessages(captureId: string): Promise<MessageListResponse> {
  const response = await authedFetch(`/captures/${encodeURIComponent(captureId)}/messages`);
  return parseOrThrow<MessageListResponse>(response);
}

export async function postMessage(captureId: string, content: string): Promise<MessageResponse> {
  const response = await authedFetch(`/captures/${encodeURIComponent(captureId)}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
  return parseOrThrow<MessageResponse>(response);
}

export async function streamMessage(
  captureId: string,
  content: string,
  handlers: StreamMessageHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const response = await authedFetch(`/captures/${encodeURIComponent(captureId)}/messages/stream`, {
    method: "POST",
    body: JSON.stringify({ content }),
    signal,
  });
  if (!response.ok) {
    await parseOrThrow<void>(response);
    return;
  }
  if (!response.body) {
    throw new ApiError(response.status, "The response stream is unavailable.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let terminalEventReceived = false;

  const dispatchFrame = (frame: string) => {
    for (const line of frame.split(/\r?\n/)) {
      if (!line.startsWith("data: ")) continue;
      const event = JSON.parse(line.slice(6)) as
        | { type: "delta"; text: string }
        | { type: "done"; message_id: string }
        | { type: "error"; detail: string };
      if (event.type === "delta") handlers.onDelta(event.text);
      if (event.type === "done") {
        terminalEventReceived = true;
        handlers.onDone(event.message_id);
      }
      if (event.type === "error") {
        terminalEventReceived = true;
        handlers.onError(event.detail);
      }
    }
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const frames = buffer.split(/\r?\n\r?\n/);
      buffer = frames.pop() ?? "";
      for (const frame of frames) dispatchFrame(frame);
      if (done) break;
    }
    if (buffer.trim()) dispatchFrame(buffer);
    if (!terminalEventReceived) {
      throw new ApiError(response.status, "The response ended before the reply completed.");
    }
  } finally {
    reader.releaseLock();
  }
}

export async function search(query: string): Promise<SearchResponse> {
  const response = await authedFetch("/search/", {
    method: "POST",
    body: JSON.stringify({ query }),
  });
  return parseOrThrow<SearchResponse>(response);
}

