import {
  User,
  AdminUser,
  AccountType,
  DeckWithCounts,
  DeckDetail,
  StudyCard,
  ReviewResult,
  DeckStats,
  ApiKey,
  CreatedApiKey,
  LibraryDeck,
  LibraryDeckDetail,
  PublicDeckPreview,
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

// A single shared refresh promise so concurrent 401s don't each POST
// /auth/refresh. With rotating refresh tokens only the first rotation succeeds;
// the rest would send the now-stale token and get logged out. Dedup avoids that.
let refreshPromise: Promise<boolean> | null = null;

function refreshAccessToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = raw("/auth/refresh", { method: "POST" })
      .then(async (refreshed) => {
        if (!refreshed.ok) return false;
        const { accessToken: tok } = await refreshed.json();
        setAccessToken(tok);
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  let res = await raw(path, opts);
  if (res.status === 401 && path !== "/auth/refresh") {
    if (await refreshAccessToken()) {
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
        url:
          typeof location !== "undefined"
            ? location.origin + location.pathname
            : undefined,
        userAgent:
          typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        ...r,
      }),
    }).catch(() => {});
  } catch {
    // reporting must never throw
  }
}

// Postgres returns count(*) as a string; coerce the deck-count fields to
// numbers so i18next pluralization (which checks `typeof count === "number"`)
// and any arithmetic in the UI behave correctly.
const DECK_COUNT_KEYS = [
  "card_count",
  "due_count",
  "viewed_count",
  "new_count",
  "again_count",
  "hard_count",
  "good_count",
  "easy_count",
] as const;

function withNumericCounts(deck: DeckWithCounts): DeckWithCounts {
  const out = { ...deck } as Record<string, unknown>;
  for (const k of DECK_COUNT_KEYS) {
    if (typeof out[k] === "string") out[k] = Number(out[k]);
  }
  return out as unknown as DeckWithCounts;
}

export const api = {
  auth: {
    signup: (email: string, password: string) =>
      request<{ user: User; accessToken: string; expiresIn: number }>(
        "/auth/signup",
        { method: "POST", body: JSON.stringify({ email, password }) },
      ),
    login: (email: string, password: string, rememberMe: boolean) =>
      request<
        | { requiresTwoFactor: true; challenge: string }
        | {
            requiresTwoFactor?: false;
            user: User;
            accessToken: string;
            expiresIn: number;
          }
      >("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, rememberMe }),
      }),
    refresh: () =>
      request<{ accessToken: string }>("/auth/refresh", { method: "POST" }),
    me: () => request<{ user: User }>("/auth/me"),
    updateProfile: (displayName?: string, language?: string) =>
      request<{ user: User }>("/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ displayName, language }),
      }),
    logout: () => request<void>("/auth/logout", { method: "POST" }),
    verifyEmail: (token: string) =>
      request<{ status: string }>("/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ token }),
      }),
    resendVerification: () =>
      request<{ status: string }>("/auth/resend-verification", {
        method: "POST",
      }),
    forgotPassword: (email: string) =>
      request<{ status: string; message: string }>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),
    resetPassword: (token: string, password: string) =>
      request<{ status: string }>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      }),
    changePassword: async (currentPassword: string, newPassword: string) => {
      const res = await request<{ user: User; accessToken: string }>(
        "/auth/change-password",
        {
          method: "POST",
          body: JSON.stringify({ currentPassword, newPassword }),
        },
      );
      // The server rotates all sessions; adopt the fresh access token so this
      // tab keeps working without waiting for a 401/refresh round-trip.
      setAccessToken(res.accessToken);
      return res;
    },
    requestEmailChange: (currentPassword: string, newEmail: string) =>
      request<{ status: string }>("/auth/change-email", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newEmail }),
      }),
    confirmEmailChange: (token: string) =>
      request<{ status: string }>("/auth/confirm-email-change", {
        method: "POST",
        body: JSON.stringify({ token }),
      }),
    deleteAccount: (currentPassword: string) =>
      request<void>("/auth/account", {
        method: "DELETE",
        body: JSON.stringify({ currentPassword }),
      }),
    exportData: () => request<unknown>("/account/export"),
    twoFactorLogin: (challenge: string, code: string, rememberMe: boolean) =>
      request<{ user: User; accessToken: string; expiresIn: number }>(
        "/auth/2fa/verify",
        {
          method: "POST",
          body: JSON.stringify({ challenge, code, rememberMe }),
        },
      ),
    twoFactorSetup: () =>
      request<{ otpauthUri: string; qrDataUrl: string }>("/account/2fa/setup", {
        method: "POST",
      }),
    twoFactorEnable: (code: string) =>
      request<{ backupCodes: string[] }>("/account/2fa/verify", {
        method: "POST",
        body: JSON.stringify({ code }),
      }),
    twoFactorDisable: (code: string) =>
      request<void>("/account/2fa/disable", {
        method: "POST",
        body: JSON.stringify({ code }),
      }),
  },
  decks: {
    list: () =>
      request<DeckWithCounts[]>("/decks").then((d) => d.map(withNumericCounts)),
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
    setPublic: (id: string, isPublic: boolean) =>
      request<DeckWithCounts>(`/decks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isPublic }),
      }),
    remove: (id: string) => request<void>(`/decks/${id}`, { method: "DELETE" }),
  },
  library: {
    list: (q?: string) =>
      request<{ decks: LibraryDeck[] }>(
        `/library${q ? `?q=${encodeURIComponent(q)}` : ""}`,
      ),
    get: (id: string) => request<LibraryDeckDetail>(`/library/${id}`),
    clone: (id: string) =>
      request<{ id: string; title: string; card_count: number }>(
        `/library/${id}/clone`,
        { method: "POST" },
      ),
  },
  publicLibrary: {
    list: (q?: string) =>
      request<{ decks: LibraryDeck[] }>(
        `/public/library${q ? `?q=${encodeURIComponent(q)}` : ""}`,
      ),
    preview: (id: string) =>
      request<PublicDeckPreview>(`/public/library/${id}/preview`),
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
  admin: {
    listUsers: () => request<{ users: AdminUser[] }>("/admin/users"),
    createUser: (email: string, password: string, accountType: AccountType) =>
      request<{ user: AdminUser }>("/admin/users", {
        method: "POST",
        body: JSON.stringify({ email, password, accountType }),
      }),
    setAccountType: (id: string, accountType: AccountType) =>
      request<{ user: AdminUser }>(`/admin/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ accountType }),
      }),
  },
};
