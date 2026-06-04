import { AsyncLocalStorage } from "async_hooks";

const BASE_URL = process.env.FLASHKARTE_API_URL ?? "http://localhost:3001";

// Per-request API key threaded from the incoming MCP HTTP request, so each
// tool call acts as the user who owns that key.
export const requestKeyStore = new AsyncLocalStorage<string>();

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  const key = requestKeyStore.getStore() ?? process.env.FLASHKARTE_API_KEY;
  if (key) headers["Authorization"] = `Bearer ${key}`;
  return headers;
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
    throw new Error(`API ${method} ${path} returned ${res.status}: ${text}`);
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
export const del = <T = unknown>(path: string) => api<T>("DELETE", path);
