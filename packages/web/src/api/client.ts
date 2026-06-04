import {
  User,
  DeckWithCounts,
  DeckDetail,
  StudyCard,
  ReviewResult,
  DeckStats,
  ApiKey,
  CreatedApiKey,
} from "./types";

const APP_VERSION = "0.1.0";

let accessToken: string | null = null;
export function setAccessToken(t: string | null) {
  accessToken = t;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function raw(path: string, opts: RequestInit = {}): Promise<Response> {
  const headers = new Headers(opts.headers);
  if (!(opts.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  return fetch(`/api${path}`, { ...opts, headers, credentials: "include" });
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  let res = await raw(path, opts);
  if (res.status === 401 && path !== "/auth/refresh") {
    const refreshed = await raw("/auth/refresh", { method: "POST" });
    if (refreshed.ok) {
      const { accessToken: tok } = await refreshed.json();
      setAccessToken(tok);
      res = await raw(path, opts);
    }
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(
      res.status,
      body?.error?.code ?? "ERROR",
      body?.error?.message ?? `HTTP ${res.status}`,
    );
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function reportClientError(r: {
  message: string;
  context?: string;
  stack?: string;
}) {
  try {
    void fetch("/api/client-errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      keepalive: true,
      body: JSON.stringify({
        app: "web",
        appVersion: APP_VERSION,
        platform: "web",
        url: typeof location !== "undefined" ? location.href : undefined,
        userAgent:
          typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        ...r,
      }),
    }).catch(() => {});
  } catch {
    // reporting must never throw
  }
}

export const api = {
  auth: {
    signup: (email: string, password: string) =>
      request<{ user: User; accessToken: string; expiresIn: number }>(
        "/auth/signup",
        { method: "POST", body: JSON.stringify({ email, password }) },
      ),
    login: (email: string, password: string) =>
      request<{ user: User; accessToken: string; expiresIn: number }>(
        "/auth/login",
        { method: "POST", body: JSON.stringify({ email, password }) },
      ),
    refresh: () =>
      request<{ accessToken: string }>("/auth/refresh", { method: "POST" }),
    logout: () => request<void>("/auth/logout", { method: "POST" }),
  },
  decks: {
    list: () => request<DeckWithCounts[]>("/decks"),
    get: (id: string) => request<DeckDetail>(`/decks/${id}`),
    create: (markdown: string, title?: string) =>
      request<{ id: string; title: string; card_count: number }>("/decks", {
        method: "POST",
        body: JSON.stringify({ markdown, title }),
      }),
    createFromFile: (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      return request<{ id: string; title: string; card_count: number }>(
        "/decks",
        { method: "POST", body: fd },
      );
    },
    rename: (id: string, title: string) =>
      request<DeckWithCounts>(`/decks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ title }),
      }),
    remove: (id: string) => request<void>(`/decks/${id}`, { method: "DELETE" }),
  },
  study: {
    batch: (deckId: string) => request<StudyCard[]>(`/decks/${deckId}/study`),
    stats: (deckId: string) => request<DeckStats>(`/decks/${deckId}/stats`),
    review: (cardId: string, rating: number) =>
      request<ReviewResult>("/study/review", {
        method: "POST",
        body: JSON.stringify({ card_id: cardId, rating }),
      }),
  },
  keys: {
    list: () => request<ApiKey[]>("/keys"),
    create: (name: string) =>
      request<CreatedApiKey>("/keys", {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    revoke: (prefix: string) =>
      request<void>(`/keys/${prefix}`, { method: "DELETE" }),
  },
};
