import { AsyncLocalStorage } from "async_hooks";

const BASE_URL = process.env.FLASHKARTE_API_URL ?? "http://localhost:3001";

// Per-request API key threaded from the incoming MCP HTTP request, so each
// tool call acts as the user who owns that key.
export const requestKeyStore = new AsyncLocalStorage<string>();
export const requestCorrelationStore = new AsyncLocalStorage<string>();

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  // Production must never fall back to an ambient shared key — fail closed
  // (backend 401) if the request context was lost.
  const key =
    requestKeyStore.getStore() ??
    (process.env.NODE_ENV === "production"
      ? undefined
      : process.env.FLASHKARTE_API_KEY);
  if (key) headers["Authorization"] = `Bearer ${key}`;
  const correlationId = requestCorrelationStore.getStore();
  if (correlationId) headers["X-Request-ID"] = correlationId;
  return headers;
}

/** An API error that keeps the HTTP status, so a caller can tell a 403 from a 500. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function api<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: body
      ? authHeaders({ "Content-Type": "application/json" })
      : authHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(
      res.status,
      `API ${method} ${path} returned ${res.status}: ${text}`,
    );
  }
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return res.json() as Promise<T>;
  }
  return (await res.text()) as unknown as T;
}

export const get = <T = unknown>(path: string) => api<T>("GET", path);
export const post = <T = unknown>(path: string, body?: unknown) =>
  api<T>("POST", path, body);
export const patch = <T = unknown>(path: string, body?: unknown) =>
  api<T>("PATCH", path, body);
export const put = <T = unknown>(path: string, body?: unknown) =>
  api<T>("PUT", path, body);
export const del = <T = unknown>(path: string) => api<T>("DELETE", path);

/** What a password or 2FA login led to: a session, a 2FA challenge, or a refusal. */
export type LoginOutcome =
  | { kind: "signed-in"; accessToken: string }
  | { kind: "needs-2fa"; challenge: string }
  | { kind: "rate-limited" }
  | { kind: "rejected" };

interface BackendLoginBody {
  accessToken?: string;
  requiresTwoFactor?: boolean;
  challenge?: string;
}

interface CreatedKey {
  key: string;
  key_prefix: string;
}

// The backend rate-limits logins per client IP. Every MCP login reaches it
// from the MCP container, so without the person's own IP they would all share
// one bucket and a few wrong passwords would lock everyone out. The backend
// trusts exactly one proxy hop, so this header is the IP it counts.
function loginHeaders(clientIp: string | undefined): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (clientIp) headers["X-Forwarded-For"] = clientIp;
  return headers;
}

async function postAuth(
  path: string,
  body: object,
  clientIp: string | undefined,
): Promise<LoginOutcome> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: loginHeaders(clientIp),
    body: JSON.stringify(body),
  });
  if (res.status === 429) return { kind: "rate-limited" };
  if (!res.ok) return { kind: "rejected" };
  const answer = (await res.json()) as BackendLoginBody;
  if (answer.requiresTwoFactor && answer.challenge) {
    return { kind: "needs-2fa", challenge: answer.challenge };
  }
  if (answer.accessToken) {
    return { kind: "signed-in", accessToken: answer.accessToken };
  }
  return { kind: "rejected" };
}

/** Check email + password against the flashkarte backend. */
export function backendLogin(
  email: string,
  password: string,
  clientIp?: string,
): Promise<LoginOutcome> {
  return postAuth("/api/auth/login", { email, password }, clientIp);
}

/** Finish a 2FA login with the backend's challenge and the person's code. */
export function backendVerifyTwoFactor(
  challenge: string,
  code: string,
  clientIp?: string,
): Promise<LoginOutcome> {
  return postAuth("/api/auth/2fa/verify", { challenge, code }, clientIp);
}

/**
 * Mint a deck-scoped fk_ key for the logged-in user, using their JWT. The key
 * is limited to deck operations server-side, so a compromised MCP store can't
 * be used to reach account-level routes.
 */
export async function backendCreateKey(
  accessToken: string,
  name: string,
  scope: "full" | "deck" = "deck",
): Promise<CreatedKey> {
  const res = await fetch(`${BASE_URL}/api/keys`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ name, scope }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`create key failed ${res.status}: ${text}`);
  }
  return (await res.json()) as CreatedKey;
}
