# claude.ai-ready MCP (OAuth) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an OAuth 2.1 + PKCE authorization layer to `packages/mcp` so users can connect flashkarte to claude.ai as a custom connector, log in with their own account, and have their AI generate decks into that account.

**Architecture:** Mirror notes-world's `oauth/` module (discovery → authorize → token → middleware, with in-memory code/refresh stores and an HS256 access JWT), but replace its single-key auto-approve with a per-user login page. The authorize POST calls the flashkarte backend (`POST /api/auth/login` then `POST /api/keys`) to mint the connecting user's `fk_` key and binds the OAuth code to it. The access JWT carries that `fk_` key; existing tool calls are unchanged.

**Tech Stack:** TypeScript, Express, `@modelcontextprotocol/sdk` (StreamableHTTP), `jsonwebtoken`, Jest + ts-jest + supertest. Web: React + Vite + Vitest.

**Spec:** docs/superpowers/specs/2026-06-08-mcp-claude-ai-oauth-design.md

---

## File Structure

All new MCP code lives in `packages/mcp/src/oauth/`:

- `store.ts` — in-memory auth-code + refresh-token maps (single-use codes, rotating refresh).
- `tokens.ts` — HS256 sign/verify of the access JWT (carries `fk_key`).
- `discovery.ts` — RFC 9728 + RFC 8414 metadata endpoints.
- `authorize.ts` — login form (GET) + credential→key→code exchange (POST). **The only materially new logic.**
- `token.ts` — `/oauth/token`: `authorization_code` (PKCE verify) + `refresh_token` (rotate) grants.
- `middleware.ts` — accept a raw `fk_` key or an OAuth JWT; thread the `fk_` key to the backend.

Modified:

- `packages/mcp/src/api.ts` — add `backendLogin` + `backendCreateKey` helpers.
- `packages/mcp/src/index.ts` — wire the OAuth routers and the new auth middleware; add required env.
- `packages/mcp/package.json` — add `jsonwebtoken`, `supertest` (+ types).
- `packages/mcp/src/tools/decks.ts` — tighten tool/markdown descriptions.
- `docker-compose.prod.yml`, `.env.example` — OAuth env vars.
- `packages/web/src/pages/SettingsPage.tsx` — fix connect URL + "Connect to claude.ai" blurb.

---

## Task 1: Add dependencies

**Files:**

- Modify: `packages/mcp/package.json`

- [ ] **Step 1: Add runtime + dev deps**

Edit `packages/mcp/package.json` so `dependencies` includes `"jsonwebtoken": "^9.0.3"` and `devDependencies` includes `"@types/jsonwebtoken": "^9.0.10"`, `"supertest": "^7.0.0"`, `"@types/supertest": "^6.0.2"`. Final relevant sections:

```json
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.29.0",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "jsonwebtoken": "^9.0.3",
    "zod": "^4.4.3"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.12",
    "@types/jsonwebtoken": "^9.0.10",
    "@types/node": "^20.12.0",
    "@types/supertest": "^6.0.2",
    "jest": "^29.7.0",
    "supertest": "^7.0.0",
    "ts-jest": "^29.1.2",
    "ts-node": "^10.9.2",
    "typescript": "^5.4.0"
  }
```

- [ ] **Step 2: Install from the repo root**

Run: `cd /home/chris/ppp2/flashkarte && npm install`
Expected: completes; `jsonwebtoken` and `supertest` resolve under the workspace.

- [ ] **Step 3: Commit**

```bash
cd /home/chris/ppp2/flashkarte
git add packages/mcp/package.json package-lock.json
git commit -m "build(mcp): add jsonwebtoken + supertest for OAuth layer"
```

---

## Task 2: OAuth store (auth codes + refresh tokens)

**Files:**

- Create: `packages/mcp/src/oauth/store.ts`
- Test: `packages/mcp/src/oauth/store.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/mcp/src/oauth/store.test.ts`:

```ts
import {
  createAuthCode,
  consumeAuthCode,
  createRefreshToken,
  consumeRefreshToken,
} from "./store";

const baseCode = {
  code_challenge: "chal",
  redirect_uri: "https://example.com/cb",
  client_id: "client",
  fk_key: "fk_abc",
};

describe("oauth store", () => {
  test("auth code round-trips once and carries the fk_key", () => {
    const code = createAuthCode(baseCode);
    const entry = consumeAuthCode(code);
    expect(entry?.fk_key).toBe("fk_abc");
    expect(entry?.code_challenge).toBe("chal");
  });

  test("auth code is single-use", () => {
    const code = createAuthCode(baseCode);
    expect(consumeAuthCode(code)).not.toBeNull();
    expect(consumeAuthCode(code)).toBeNull();
  });

  test("unknown auth code returns null", () => {
    expect(consumeAuthCode("nope")).toBeNull();
  });

  test("refresh token round-trips once", () => {
    const token = createRefreshToken("fk_xyz");
    expect(consumeRefreshToken(token)).toEqual({ fk_key: "fk_xyz" });
    expect(consumeRefreshToken(token)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/chris/ppp2/flashkarte/packages/mcp && npx jest src/oauth/store.test.ts`
Expected: FAIL — cannot find module `./store`.

- [ ] **Step 3: Write the implementation**

Create `packages/mcp/src/oauth/store.ts`:

```ts
import crypto from "crypto";

interface AuthCodeEntry {
  code_challenge: string;
  redirect_uri: string;
  client_id: string;
  fk_key: string;
  expires_at: number;
}

interface RefreshTokenEntry {
  fk_key: string;
  expires_at: number;
}

const AUTH_CODE_TTL_MS = 10 * 60 * 1000;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const authCodes = new Map<string, AuthCodeEntry>();
const refreshTokens = new Map<string, RefreshTokenEntry>();

function pruneExpired<T extends { expires_at: number }>(
  map: Map<string, T>,
): void {
  const now = Date.now();
  for (const [key, entry] of map) {
    if (entry.expires_at < now) map.delete(key);
  }
}

export function createAuthCode(
  params: Omit<AuthCodeEntry, "expires_at">,
): string {
  pruneExpired(authCodes);
  const code = crypto.randomBytes(32).toString("hex");
  authCodes.set(code, { ...params, expires_at: Date.now() + AUTH_CODE_TTL_MS });
  return code;
}

export function consumeAuthCode(code: string): AuthCodeEntry | null {
  const entry = authCodes.get(code);
  authCodes.delete(code);
  if (!entry || entry.expires_at < Date.now()) return null;
  return entry;
}

export function createRefreshToken(fk_key: string): string {
  pruneExpired(refreshTokens);
  const token = crypto.randomBytes(48).toString("hex");
  refreshTokens.set(token, {
    fk_key,
    expires_at: Date.now() + REFRESH_TOKEN_TTL_MS,
  });
  return token;
}

export function consumeRefreshToken(token: string): { fk_key: string } | null {
  const entry = refreshTokens.get(token);
  refreshTokens.delete(token);
  if (!entry || entry.expires_at < Date.now()) return null;
  return { fk_key: entry.fk_key };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/chris/ppp2/flashkarte/packages/mcp && npx jest src/oauth/store.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
cd /home/chris/ppp2/flashkarte
git add packages/mcp/src/oauth/store.ts packages/mcp/src/oauth/store.test.ts
git commit -m "feat(mcp): in-memory OAuth code + refresh-token store"
```

---

## Task 3: Access-token sign/verify

**Files:**

- Create: `packages/mcp/src/oauth/tokens.ts`
- Test: `packages/mcp/src/oauth/tokens.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/mcp/src/oauth/tokens.test.ts`:

```ts
process.env.MCP_JWT_SECRET = "test-secret";
import { signMcpAccessToken, verifyMcpAccessToken } from "./tokens";

describe("mcp access tokens", () => {
  test("signs and verifies, carrying the fk_key", () => {
    const token = signMcpAccessToken("fk_secret");
    const payload = verifyMcpAccessToken(token);
    expect(payload?.fk_key).toBe("fk_secret");
    expect(payload?.sub).toBe("mcp-service");
  });

  test("rejects a garbage token", () => {
    expect(verifyMcpAccessToken("not.a.jwt")).toBeNull();
  });

  test("rejects a token signed with a different secret", () => {
    const jwt = require("jsonwebtoken");
    const forged = jwt.sign({ sub: "mcp-service", fk_key: "x" }, "wrong", {
      algorithm: "HS256",
    });
    expect(verifyMcpAccessToken(forged)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/chris/ppp2/flashkarte/packages/mcp && npx jest src/oauth/tokens.test.ts`
Expected: FAIL — cannot find module `./tokens`.

- [ ] **Step 3: Write the implementation**

Create `packages/mcp/src/oauth/tokens.ts`:

```ts
import jwt from "jsonwebtoken";

export const ACCESS_TOKEN_TTL_SEC = 3600;
const JWT_ALGORITHM = "HS256" as const;

interface McpTokenPayload {
  sub: "mcp-service";
  fk_key: string;
}

function getMcpJwtSecret(): string {
  const secret = process.env.MCP_JWT_SECRET;
  if (!secret)
    throw new Error("MCP_JWT_SECRET environment variable is not set");
  return secret;
}

export function signMcpAccessToken(fkKey: string): string {
  return jwt.sign(
    { sub: "mcp-service", fk_key: fkKey } satisfies McpTokenPayload,
    getMcpJwtSecret(),
    { expiresIn: ACCESS_TOKEN_TTL_SEC, algorithm: JWT_ALGORITHM },
  );
}

export function verifyMcpAccessToken(token: string): McpTokenPayload | null {
  try {
    return jwt.verify(token, getMcpJwtSecret(), {
      algorithms: [JWT_ALGORITHM],
    }) as McpTokenPayload;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/chris/ppp2/flashkarte/packages/mcp && npx jest src/oauth/tokens.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
cd /home/chris/ppp2/flashkarte
git add packages/mcp/src/oauth/tokens.ts packages/mcp/src/oauth/tokens.test.ts
git commit -m "feat(mcp): HS256 access-token sign/verify carrying fk_key"
```

---

## Task 4: Discovery metadata

**Files:**

- Create: `packages/mcp/src/oauth/discovery.ts`
- Test: `packages/mcp/src/oauth/discovery.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/mcp/src/oauth/discovery.test.ts`:

```ts
import express from "express";
import request from "supertest";
import { createDiscoveryRouter } from "./discovery";

const app = express().use(createDiscoveryRouter("https://mcp.example.com"));

describe("oauth discovery", () => {
  test("protected-resource points at the authorization server", async () => {
    const res = await request(app).get("/.well-known/oauth-protected-resource");
    expect(res.status).toBe(200);
    expect(res.body.resource).toBe("https://mcp.example.com/mcp");
    expect(res.body.authorization_servers).toEqual(["https://mcp.example.com"]);
  });

  test("protected-resource also matches a subpath (RFC 9728 §3)", async () => {
    const res = await request(app).get(
      "/.well-known/oauth-protected-resource/mcp",
    );
    expect(res.status).toBe(200);
  });

  test("authorization-server advertises S256 + endpoints", async () => {
    const res = await request(app).get(
      "/.well-known/oauth-authorization-server",
    );
    expect(res.status).toBe(200);
    expect(res.body.code_challenge_methods_supported).toContain("S256");
    expect(res.body.authorization_endpoint).toBe(
      "https://mcp.example.com/oauth/authorize",
    );
    expect(res.body.token_endpoint).toBe("https://mcp.example.com/oauth/token");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/chris/ppp2/flashkarte/packages/mcp && npx jest src/oauth/discovery.test.ts`
Expected: FAIL — cannot find module `./discovery`.

- [ ] **Step 3: Write the implementation**

Create `packages/mcp/src/oauth/discovery.ts`:

```ts
import { Router } from "express";

export function createDiscoveryRouter(baseUrl: string): Router {
  const router = Router();

  // RFC 9728: tells MCP clients which authorization server handles this resource.
  // Clients may append the resource path (e.g. /mcp) per RFC 9728 §3 — match any subpath.
  router.get(/^\/\.well-known\/oauth-protected-resource/, (_req, res) => {
    res.json({
      resource: `${baseUrl}/mcp`,
      authorization_servers: [baseUrl],
    });
  });

  // RFC 8414: authorization server metadata.
  // code_challenge_methods_supported MUST include S256 or MCP clients refuse.
  router.get("/.well-known/oauth-authorization-server", (_req, res) => {
    res.json({
      issuer: baseUrl,
      authorization_endpoint: `${baseUrl}/oauth/authorize`,
      token_endpoint: `${baseUrl}/oauth/token`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
    });
  });

  return router;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/chris/ppp2/flashkarte/packages/mcp && npx jest src/oauth/discovery.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
cd /home/chris/ppp2/flashkarte
git add packages/mcp/src/oauth/discovery.ts packages/mcp/src/oauth/discovery.test.ts
git commit -m "feat(mcp): OAuth discovery metadata endpoints"
```

---

## Task 5: Backend helpers (login + mint key)

**Files:**

- Modify: `packages/mcp/src/api.ts`
- Test: `packages/mcp/src/api.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/mcp/src/api.test.ts`:

```ts
import { backendLogin, backendCreateKey } from "./api";

const mockFetch = jest.fn();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).fetch = mockFetch;

function jsonResponse(ok: boolean, status: number, body: unknown) {
  return {
    ok,
    status,
    headers: { get: () => "application/json" },
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

describe("backend helpers", () => {
  beforeEach(() => mockFetch.mockReset());

  test("backendLogin returns the parsed body on 200", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(true, 200, { accessToken: "jwt123" }),
    );
    const out = await backendLogin("a@b.com", "pw");
    expect(out).toEqual({ accessToken: "jwt123" });
    const [url, opts] = mockFetch.mock.calls[0];
    expect(String(url)).toContain("/api/auth/login");
    expect(opts.method).toBe("POST");
  });

  test("backendLogin returns null on bad credentials", async () => {
    mockFetch.mockResolvedValue(jsonResponse(false, 401, { error: "no" }));
    expect(await backendLogin("a@b.com", "pw")).toBeNull();
  });

  test("backendCreateKey sends the JWT and returns the raw key", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(true, 201, { key: "fk_new", key_prefix: "fk_new" }),
    );
    const out = await backendCreateKey("jwt123", "claude.ai");
    expect(out.key).toBe("fk_new");
    const [url, opts] = mockFetch.mock.calls[0];
    expect(String(url)).toContain("/api/keys");
    expect(opts.headers.Authorization).toBe("Bearer jwt123");
  });

  test("backendCreateKey throws on failure", async () => {
    mockFetch.mockResolvedValue(jsonResponse(false, 500, {}));
    await expect(backendCreateKey("jwt", "n")).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/chris/ppp2/flashkarte/packages/mcp && npx jest src/api.test.ts`
Expected: FAIL — `backendLogin` / `backendCreateKey` are not exported.

- [ ] **Step 3: Add the helpers**

Append to `packages/mcp/src/api.ts` (after the existing `del` export):

```ts
interface LoginResult {
  accessToken: string;
}

interface CreatedKey {
  key: string;
  key_prefix: string;
}

/** Authenticate against the flashkarte backend; null on bad credentials. */
export async function backendLogin(
  email: string,
  password: string,
): Promise<LoginResult | null> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) return null;
  return (await res.json()) as LoginResult;
}

/** Mint a personal fk_ key for the logged-in user, using their JWT. */
export async function backendCreateKey(
  accessToken: string,
  name: string,
): Promise<CreatedKey> {
  const res = await fetch(`${BASE_URL}/api/keys`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`create key failed ${res.status}: ${text}`);
  }
  return (await res.json()) as CreatedKey;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/chris/ppp2/flashkarte/packages/mcp && npx jest src/api.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
cd /home/chris/ppp2/flashkarte
git add packages/mcp/src/api.ts packages/mcp/src/api.test.ts
git commit -m "feat(mcp): backend login + mint-key helpers for OAuth authorize"
```

---

## Task 6: Authorize router (login page + code issuance)

**Files:**

- Create: `packages/mcp/src/oauth/authorize.ts`
- Test: `packages/mcp/src/oauth/authorize.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/mcp/src/oauth/authorize.test.ts`:

```ts
import express from "express";
import request from "supertest";
import { createAuthorizeRouter } from "./authorize";
import * as apiModule from "../api";
import * as store from "./store";

jest.mock("../api", () => ({
  backendLogin: jest.fn(),
  backendCreateKey: jest.fn(),
}));
const mockApi = apiModule as jest.Mocked<typeof apiModule>;

const CLIENT = "test-client";
function makeApp() {
  return express()
    .use(express.urlencoded({ extended: false }))
    .use(createAuthorizeRouter(CLIENT));
}

const goodQuery = {
  response_type: "code",
  client_id: CLIENT,
  redirect_uri: "https://claude.ai/cb",
  code_challenge: "abc",
  code_challenge_method: "S256",
  state: "xyz",
};

describe("authorize GET", () => {
  test("renders a login form for a valid request", async () => {
    const res = await request(makeApp())
      .get("/oauth/authorize")
      .query(goodQuery);
    expect(res.status).toBe(200);
    expect(res.text).toContain("<form");
    expect(res.text).toContain('name="password"');
    expect(res.text).toContain("abc"); // code_challenge preserved in a hidden field
  });

  test("rejects a non-S256 PKCE request", async () => {
    const res = await request(makeApp())
      .get("/oauth/authorize")
      .query({ ...goodQuery, code_challenge_method: "plain" });
    expect(res.status).toBe(400);
  });

  test("rejects a non-HTTPS redirect_uri", async () => {
    const res = await request(makeApp())
      .get("/oauth/authorize")
      .query({ ...goodQuery, redirect_uri: "http://evil.test/cb" });
    expect(res.status).toBe(400);
  });

  test("rejects a wrong client_id", async () => {
    const res = await request(makeApp())
      .get("/oauth/authorize")
      .query({ ...goodQuery, client_id: "nope" });
    expect(res.status).toBe(400);
  });
});

describe("authorize POST", () => {
  beforeEach(() => jest.clearAllMocks());

  test("good credentials mint a key and redirect with a code", async () => {
    mockApi.backendLogin.mockResolvedValue({ accessToken: "jwt" });
    mockApi.backendCreateKey.mockResolvedValue({
      key: "fk_minted",
      key_prefix: "fk_minted",
    });
    const res = await request(makeApp())
      .post("/oauth/authorize")
      .type("form")
      .send({ ...goodQuery, email: "a@b.com", password: "pw" });

    expect(res.status).toBe(302);
    const loc = new URL(res.headers.location);
    expect(loc.origin + loc.pathname).toBe("https://claude.ai/cb");
    expect(loc.searchParams.get("state")).toBe("xyz");
    const code = loc.searchParams.get("code");
    expect(code).toBeTruthy();
    // the issued code is bound to the minted fk_ key
    expect(store.consumeAuthCode(code as string)?.fk_key).toBe("fk_minted");
  });

  test("bad credentials re-render the form with an error", async () => {
    mockApi.backendLogin.mockResolvedValue(null);
    const res = await request(makeApp())
      .post("/oauth/authorize")
      .type("form")
      .send({ ...goodQuery, email: "a@b.com", password: "wrong" });
    expect(res.status).toBe(401);
    expect(res.text).toContain("<form");
    expect(res.text).toContain("Invalid email or password");
    expect(mockApi.backendCreateKey).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/chris/ppp2/flashkarte/packages/mcp && npx jest src/oauth/authorize.test.ts`
Expected: FAIL — cannot find module `./authorize`.

- [ ] **Step 3: Write the implementation**

Create `packages/mcp/src/oauth/authorize.ts`:

```ts
import { Router } from "express";
import { createAuthCode } from "./store";
import { backendLogin, backendCreateKey } from "../api";

interface OAuthParams {
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  code_challenge_method: string;
  state?: string;
}

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

function renderLoginForm(p: OAuthParams, error?: string): string {
  const hidden = (name: string, val?: string) =>
    val
      ? `<input type="hidden" name="${name}" value="${escapeHtml(val)}">`
      : "";
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Connect flashkarte</title>
<style>
body{font-family:system-ui,sans-serif;max-width:22rem;margin:4rem auto;padding:0 1rem}
input{display:block;width:100%;padding:.6rem;margin:.4rem 0;box-sizing:border-box}
button{padding:.65rem 1rem;width:100%;cursor:pointer}
.err{color:#b00020}
</style></head>
<body>
<h1>Connect flashkarte to your AI</h1>
<p>Log in to let your AI create decks in your account.</p>
${error ? `<p class="err">${escapeHtml(error)}</p>` : ""}
<form method="post" action="/oauth/authorize">
${hidden("response_type", "code")}
${hidden("client_id", p.client_id)}
${hidden("redirect_uri", p.redirect_uri)}
${hidden("code_challenge", p.code_challenge)}
${hidden("code_challenge_method", p.code_challenge_method)}
${hidden("state", p.state)}
<input name="email" type="email" placeholder="Email" autocomplete="username" required>
<input name="password" type="password" placeholder="Password" autocomplete="current-password" required>
<button type="submit">Log in &amp; connect</button>
</form>
</body></html>`;
}

type Validation =
  | { ok: true; params: OAuthParams }
  | { ok: false; status: number; body: object };

function validate(
  clientId: string,
  q: Record<string, string | undefined>,
): Validation {
  const {
    response_type,
    client_id,
    redirect_uri,
    code_challenge,
    code_challenge_method,
    state,
  } = q;
  if (response_type !== "code")
    return {
      ok: false,
      status: 400,
      body: { error: "unsupported_response_type" },
    };
  if (client_id !== clientId)
    return { ok: false, status: 400, body: { error: "invalid_client" } };
  if (!redirect_uri || !redirect_uri.startsWith("https://"))
    return {
      ok: false,
      status: 400,
      body: {
        error: "invalid_request",
        error_description: "redirect_uri must be HTTPS",
      },
    };
  if (code_challenge_method !== "S256" || !code_challenge)
    return {
      ok: false,
      status: 400,
      body: {
        error: "invalid_request",
        error_description: "PKCE S256 is required",
      },
    };
  return {
    ok: true,
    params: {
      client_id,
      redirect_uri,
      code_challenge,
      code_challenge_method,
      state,
    },
  };
}

export function createAuthorizeRouter(clientId: string): Router {
  const router = Router();

  router.get("/oauth/authorize", (req, res) => {
    const v = validate(
      clientId,
      req.query as Record<string, string | undefined>,
    );
    if (!v.ok) {
      res.status(v.status).json(v.body);
      return;
    }
    res.type("html").send(renderLoginForm(v.params));
  });

  router.post("/oauth/authorize", async (req, res) => {
    const body = req.body as Record<string, string | undefined>;
    const v = validate(clientId, body);
    if (!v.ok) {
      res.status(v.status).json(v.body);
      return;
    }
    const { email, password } = body;
    if (!email || !password) {
      res
        .status(400)
        .type("html")
        .send(renderLoginForm(v.params, "Email and password are required."));
      return;
    }

    const login = await backendLogin(email, password);
    if (!login) {
      res
        .status(401)
        .type("html")
        .send(renderLoginForm(v.params, "Invalid email or password."));
      return;
    }

    let fkKey: string;
    try {
      const key = await backendCreateKey(login.accessToken, "claude.ai");
      fkKey = key.key;
    } catch {
      res
        .status(500)
        .type("html")
        .send(
          renderLoginForm(
            v.params,
            "Could not create an API key. Please try again.",
          ),
        );
      return;
    }

    const code = createAuthCode({
      code_challenge: v.params.code_challenge,
      redirect_uri: v.params.redirect_uri,
      client_id: v.params.client_id,
      fk_key: fkKey,
    });

    const dest = new URL(v.params.redirect_uri);
    dest.searchParams.set("code", code);
    if (v.params.state) dest.searchParams.set("state", v.params.state);
    res.redirect(dest.toString());
  });

  return router;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/chris/ppp2/flashkarte/packages/mcp && npx jest src/oauth/authorize.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
cd /home/chris/ppp2/flashkarte
git add packages/mcp/src/oauth/authorize.ts packages/mcp/src/oauth/authorize.test.ts
git commit -m "feat(mcp): login-on-authorize page binding the user's fk_ key"
```

---

## Task 7: Token router (code exchange + refresh)

**Files:**

- Create: `packages/mcp/src/oauth/token.ts`
- Test: `packages/mcp/src/oauth/token.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/mcp/src/oauth/token.test.ts`:

```ts
process.env.MCP_JWT_SECRET = "test-secret";
import crypto from "crypto";
import express from "express";
import request from "supertest";
import { createTokenRouter } from "./token";
import { createAuthCode } from "./store";
import { verifyMcpAccessToken } from "./tokens";

function makeApp() {
  return express()
    .use(express.urlencoded({ extended: false }))
    .use(express.json())
    .use(createTokenRouter());
}

const verifier = "verifier-string-1234567890";
const challenge = crypto
  .createHash("sha256")
  .update(verifier)
  .digest("base64url");

function issueCode() {
  return createAuthCode({
    code_challenge: challenge,
    redirect_uri: "https://claude.ai/cb",
    client_id: "test-client",
    fk_key: "fk_user",
  });
}

describe("token endpoint", () => {
  test("exchanges a code (PKCE ok) for an access + refresh token", async () => {
    const code = issueCode();
    const res = await request(makeApp())
      .post("/oauth/token")
      .type("form")
      .send({
        grant_type: "authorization_code",
        code,
        code_verifier: verifier,
        client_id: "test-client",
        redirect_uri: "https://claude.ai/cb",
      });
    expect(res.status).toBe(200);
    expect(res.body.token_type).toBe("Bearer");
    expect(res.body.refresh_token).toBeTruthy();
    expect(verifyMcpAccessToken(res.body.access_token)?.fk_key).toBe("fk_user");
  });

  test("rejects a bad PKCE verifier", async () => {
    const code = issueCode();
    const res = await request(makeApp())
      .post("/oauth/token")
      .type("form")
      .send({
        grant_type: "authorization_code",
        code,
        code_verifier: "wrong-verifier",
        client_id: "test-client",
        redirect_uri: "https://claude.ai/cb",
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_grant");
  });

  test("refresh_token grant rotates and returns a new access token", async () => {
    const code = issueCode();
    const first = await request(makeApp())
      .post("/oauth/token")
      .type("form")
      .send({
        grant_type: "authorization_code",
        code,
        code_verifier: verifier,
        client_id: "test-client",
        redirect_uri: "https://claude.ai/cb",
      });
    const refresh = first.body.refresh_token as string;
    const res = await request(makeApp())
      .post("/oauth/token")
      .type("form")
      .send({ grant_type: "refresh_token", refresh_token: refresh });
    expect(res.status).toBe(200);
    expect(verifyMcpAccessToken(res.body.access_token)?.fk_key).toBe("fk_user");
    expect(res.body.refresh_token).not.toBe(refresh); // rotated
  });

  test("rejects an unknown grant_type", async () => {
    const res = await request(makeApp())
      .post("/oauth/token")
      .type("form")
      .send({ grant_type: "password" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("unsupported_grant_type");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/chris/ppp2/flashkarte/packages/mcp && npx jest src/oauth/token.test.ts`
Expected: FAIL — cannot find module `./token`.

- [ ] **Step 3: Write the implementation**

Create `packages/mcp/src/oauth/token.ts`:

```ts
import { Router } from "express";
import crypto from "crypto";
import {
  consumeAuthCode,
  createRefreshToken,
  consumeRefreshToken,
} from "./store";
import { signMcpAccessToken, ACCESS_TOKEN_TTL_SEC } from "./tokens";

export function createTokenRouter(): Router {
  const router = Router();

  router.post("/oauth/token", (req, res) => {
    const body = req.body as Record<string, string | undefined>;
    const {
      grant_type,
      code,
      redirect_uri,
      client_id,
      code_verifier,
      refresh_token,
    } = body;

    if (grant_type === "authorization_code") {
      if (!code || !code_verifier || !client_id || !redirect_uri) {
        res.status(400).json({ error: "invalid_request" });
        return;
      }

      const authCode = consumeAuthCode(code);
      if (!authCode) {
        res.status(400).json({
          error: "invalid_grant",
          error_description: "Unknown or expired authorization code",
        });
        return;
      }

      const expectedChallenge = crypto
        .createHash("sha256")
        .update(code_verifier)
        .digest("base64url");
      if (expectedChallenge !== authCode.code_challenge) {
        res.status(400).json({
          error: "invalid_grant",
          error_description: "PKCE verification failed",
        });
        return;
      }

      if (redirect_uri !== authCode.redirect_uri) {
        res.status(400).json({
          error: "invalid_grant",
          error_description: "redirect_uri mismatch",
        });
        return;
      }

      if (client_id !== authCode.client_id) {
        res.status(400).json({ error: "invalid_client" });
        return;
      }

      const access_token = signMcpAccessToken(authCode.fk_key);
      const new_refresh_token = createRefreshToken(authCode.fk_key);

      res.json({
        access_token,
        token_type: "Bearer",
        expires_in: ACCESS_TOKEN_TTL_SEC,
        refresh_token: new_refresh_token,
      });
      return;
    }

    if (grant_type === "refresh_token") {
      if (!refresh_token) {
        res.status(400).json({ error: "invalid_request" });
        return;
      }

      const stored = consumeRefreshToken(refresh_token);
      if (!stored) {
        res.status(400).json({
          error: "invalid_grant",
          error_description: "Unknown or expired refresh token",
        });
        return;
      }

      const access_token = signMcpAccessToken(stored.fk_key);
      const rotated_refresh_token = createRefreshToken(stored.fk_key);

      res.json({
        access_token,
        token_type: "Bearer",
        expires_in: ACCESS_TOKEN_TTL_SEC,
        refresh_token: rotated_refresh_token,
      });
      return;
    }

    res.status(400).json({ error: "unsupported_grant_type" });
  });

  return router;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/chris/ppp2/flashkarte/packages/mcp && npx jest src/oauth/token.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
cd /home/chris/ppp2/flashkarte
git add packages/mcp/src/oauth/token.ts packages/mcp/src/oauth/token.test.ts
git commit -m "feat(mcp): OAuth token endpoint (code exchange + refresh rotation)"
```

---

## Task 8: Auth middleware (fk\_ key or OAuth JWT)

**Files:**

- Create: `packages/mcp/src/oauth/middleware.ts`
- Test: `packages/mcp/src/oauth/middleware.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/mcp/src/oauth/middleware.test.ts`:

```ts
process.env.MCP_JWT_SECRET = "test-secret";
import express from "express";
import request from "supertest";
import { createMcpAuthMiddleware } from "./middleware";
import { requestKeyStore } from "../api";
import { signMcpAccessToken } from "./tokens";

function makeApp() {
  const app = express();
  app.use(createMcpAuthMiddleware());
  app.get("/probe", (_req, res) => {
    res.json({ key: requestKeyStore.getStore() ?? null });
  });
  return app;
}

describe("mcp auth middleware", () => {
  test("401s without a credential", async () => {
    const res = await request(makeApp()).get("/probe");
    expect(res.status).toBe(401);
  });

  test("threads a raw fk_ key", async () => {
    const res = await request(makeApp())
      .get("/probe")
      .set("Authorization", "Bearer fk_direct");
    expect(res.status).toBe(200);
    expect(res.body.key).toBe("fk_direct");
  });

  test("threads the fk_ key from a valid OAuth JWT", async () => {
    const token = signMcpAccessToken("fk_fromjwt");
    const res = await request(makeApp())
      .get("/probe")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.key).toBe("fk_fromjwt");
  });

  test("401s on a garbage token", async () => {
    const res = await request(makeApp())
      .get("/probe")
      .set("Authorization", "Bearer garbage.token");
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/chris/ppp2/flashkarte/packages/mcp && npx jest src/oauth/middleware.test.ts`
Expected: FAIL — cannot find module `./middleware`.

- [ ] **Step 3: Write the implementation**

Create `packages/mcp/src/oauth/middleware.ts`:

```ts
import { RequestHandler } from "express";
import { requestKeyStore } from "../api";
import { verifyMcpAccessToken } from "./tokens";

export function createMcpAuthMiddleware(): RequestHandler {
  return (req, res, next) => {
    const raw =
      (req.headers["x-api-key"] as string | undefined) ??
      req.headers.authorization?.replace(/^Bearer\s+/i, "");

    if (!raw) {
      res.status(401).json({ error: "API key required" });
      return;
    }

    // Direct fk_ key — kept for local dev and CLI.
    if (raw.startsWith("fk_")) {
      requestKeyStore.run(raw, next);
      return;
    }

    // OAuth JWT access token.
    const payload = verifyMcpAccessToken(raw);
    if (payload) {
      requestKeyStore.run(payload.fk_key, next);
      return;
    }

    res.status(401).json({ error: "Invalid or expired token" });
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/chris/ppp2/flashkarte/packages/mcp && npx jest src/oauth/middleware.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
cd /home/chris/ppp2/flashkarte
git add packages/mcp/src/oauth/middleware.ts packages/mcp/src/oauth/middleware.test.ts
git commit -m "feat(mcp): auth middleware accepting fk_ key or OAuth JWT"
```

---

## Task 9: Wire the OAuth layer into the server

**Files:**

- Modify: `packages/mcp/src/index.ts`

- [ ] **Step 1: Replace the server entrypoint**

Overwrite `packages/mcp/src/index.ts` with:

```ts
import "dotenv/config";
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { registerDeckTools } from "./tools/decks";
import { createDiscoveryRouter } from "./oauth/discovery";
import { createAuthorizeRouter } from "./oauth/authorize";
import { createTokenRouter } from "./oauth/token";
import { createMcpAuthMiddleware } from "./oauth/middleware";

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`${name} environment variable is not set`);
  return val;
}

const PORT = parseInt(process.env.MCP_PORT ?? "3002", 10);
const MCP_BASE_URL = requireEnv("MCP_BASE_URL");
const MCP_OAUTH_CLIENT_ID = requireEnv("MCP_OAUTH_CLIENT_ID");
// Validated at startup so a misconfigured deploy fails fast.
requireEnv("MCP_JWT_SECRET");

function buildServer(): McpServer {
  const server = new McpServer({ name: "flashkarte", version: "0.1.0" });
  registerDeckTools(server);
  return server;
}

const app = express();
app.use(express.json());
// OAuth authorize form + token endpoint use form-encoded bodies.
app.use(express.urlencoded({ extended: false }));

app.get("/health", (_req, res) => {
  res.send("ok");
});

// OAuth 2.1 endpoints — public, no auth required.
app.use(createDiscoveryRouter(MCP_BASE_URL));
app.use(createAuthorizeRouter(MCP_OAUTH_CLIENT_ID));
app.use(createTokenRouter());

// Everything below requires a valid fk_ key or OAuth JWT.
app.use(createMcpAuthMiddleware());

// Stateless: a fresh server + transport per request.
app.all("/mcp", async (req, res) => {
  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
  res.on("finish", () => server.close());
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`flashkarte MCP server listening on :${PORT}`);
});
```

- [ ] **Step 2: Typecheck the package**

Run: `cd /home/chris/ppp2/flashkarte/packages/mcp && npx tsc -p tsconfig.json --noEmit`
Expected: no errors.

- [ ] **Step 3: Run the whole MCP test suite**

Run: `cd /home/chris/ppp2/flashkarte/packages/mcp && npx jest`
Expected: PASS — all oauth, api, and existing deck tests green.

- [ ] **Step 4: Boot-smoke the server locally**

Run:

```bash
cd /home/chris/ppp2/flashkarte/packages/mcp
MCP_BASE_URL=https://mcp.example.com MCP_OAUTH_CLIENT_ID=local MCP_JWT_SECRET=dev \
  MCP_PORT=3099 node -e "require('ts-node/register'); require('./src/index.ts');" &
sleep 1
curl -s localhost:3099/.well-known/oauth-authorization-server | grep -q S256 && echo OK
curl -s localhost:3099/health
kill %1
```

Expected: prints `OK` and `ok`.

- [ ] **Step 5: Commit**

```bash
cd /home/chris/ppp2/flashkarte
git add packages/mcp/src/index.ts
git commit -m "feat(mcp): wire OAuth discovery/authorize/token + auth middleware"
```

---

## Task 10: Deploy env (compose + example)

**Files:**

- Modify: `docker-compose.prod.yml`
- Modify: `.env.example`

- [ ] **Step 1: Add OAuth env to the mcp service**

In `docker-compose.prod.yml`, extend the `mcp` service `environment` list so it reads:

```yaml
mcp:
  image: ghcr.io/johnfire/flashkarte-mcp:${IMAGE_TAG:-latest}
  environment:
    - NODE_ENV=production
    - MCP_PORT=3002
    - FLASHKARTE_API_URL=http://app:3001
    - MCP_BASE_URL=https://mcp.flashkarte.christopherrehm.de
    - MCP_OAUTH_CLIENT_ID=${MCP_OAUTH_CLIENT_ID}
    - MCP_JWT_SECRET=${MCP_JWT_SECRET}
  ports:
    - "127.0.0.1:${MCP_PORT:-8091}:3002"
  depends_on:
    - app
  restart: unless-stopped
```

- [ ] **Step 2: Document the vars in `.env.example`**

Append to `.env.example`:

```
# MCP OAuth (claude.ai connector)
MCP_OAUTH_CLIENT_ID=claude-ai
MCP_JWT_SECRET=change-me-to-a-long-random-string
```

- [ ] **Step 3: Commit**

```bash
cd /home/chris/ppp2/flashkarte
git add docker-compose.prod.yml .env.example
git commit -m "build(mcp): OAuth env (MCP_BASE_URL/CLIENT_ID/JWT_SECRET) for deploy"
```

> **Deploy note (manual, do with the user):** set real `MCP_OAUTH_CLIENT_ID` and a strong `MCP_JWT_SECRET` in the VPS `.env` before redeploying. The `mcp.` subdomain + Apache vhost already exist (docs/deployment.md).

---

## Task 11: Settings — fix connect URL + claude.ai blurb

**Files:**

- Modify: `packages/web/src/pages/SettingsPage.tsx:8`
- Test: `packages/web/src/pages/SettingsPage.test.tsx`

- [ ] **Step 1: Write/extend the failing test**

Add this test to `packages/web/src/pages/SettingsPage.test.tsx` (inside the existing top-level `describe`, or add one). It asserts the rendered connect URL is the configured MCP host, not `location.origin`:

```ts
test("shows the configured MCP connect URL", async () => {
  // SettingsPage reads import.meta.env.VITE_MCP_URL with a production default.
  renderSettings(); // use the file's existing render helper
  expect(
    await screen.findByText(/mcp\.flashkarte\.christopherrehm\.de\/mcp/),
  ).toBeInTheDocument();
});
```

If the test file has no shared render helper, mirror the render setup already used by the other tests in this file (same providers/router wrapper).

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/chris/ppp2/flashkarte/packages/web && npx vitest run src/pages/SettingsPage.test.tsx`
Expected: FAIL — the current URL is `location.origin + "/mcp"` (jsdom origin `http://localhost`), not the MCP host.

- [ ] **Step 3: Fix the URL source**

In `packages/web/src/pages/SettingsPage.tsx`, replace line 8:

```ts
const MCP_URL = `${typeof location !== "undefined" ? location.origin : ""}/mcp`;
```

with:

```ts
const MCP_URL =
  import.meta.env.VITE_MCP_URL ??
  "https://mcp.flashkarte.christopherrehm.de/mcp";
```

- [ ] **Step 4: Add the "Connect to claude.ai" blurb**

Find the existing block that renders `MCP_URL` (the "connect your AI" section). Directly beneath where the URL is shown, add a short claude.ai note. Use the surrounding markup's styling conventions; the content:

```tsx
<p className="text-sm text-gray-500 mt-2">
  In claude.ai, add a custom connector with this URL, then log in with your
  flashkarte account. Then ask, e.g.:{" "}
  <em>"Turn this into a flashkarte deck: …"</em>
</p>
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd /home/chris/ppp2/flashkarte/packages/web && npx vitest run src/pages/SettingsPage.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd /home/chris/ppp2/flashkarte
git add packages/web/src/pages/SettingsPage.tsx packages/web/src/pages/SettingsPage.test.tsx
git commit -m "fix(web): point Settings MCP URL at the mcp subdomain + claude.ai blurb"
```

---

## Task 12: Authoring UX — tighten tool descriptions

**Files:**

- Modify: `packages/mcp/src/tools/decks.ts`
- Test: `packages/mcp/src/tools/decks.test.ts`

- [ ] **Step 1: Add a description assertion**

In `packages/mcp/src/tools/decks.test.ts`, extend the harness to capture each tool's description and assert `create_deck`'s guidance includes a worked example. Add, inside the existing `describe`:

```ts
test("create_deck description shows a concrete card example", () => {
  const descriptions: Record<string, string> = {};
  const server = {
    tool: (...args: unknown[]) => {
      descriptions[args[0] as string] = args[1] as string;
    },
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registerDeckTools(server as any);
  expect(descriptions["create_deck"]).toContain("**1.");
  expect(descriptions["create_deck"]).toContain("# ");
});
```

(Import `registerDeckTools` if the file doesn't already.)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/chris/ppp2/flashkarte/packages/mcp && npx jest src/tools/decks.test.ts -t "concrete card example"`
Expected: FAIL — current `MARKDOWN_HELP` has no `**1.` worked example.

- [ ] **Step 3: Tighten the markdown help**

In `packages/mcp/src/tools/decks.ts`, replace the `MARKDOWN_HELP` constant with:

```ts
const MARKDOWN_HELP =
  "Markdown deck format — one `# Title` line, optional `## Category` lines to " +
  "group cards, then numbered cards: a `**N. front**` line followed by the " +
  "answer on the next line(s). Number cards sequentially from 1. Keep fronts " +
  "as a single clear question and answers concise. Example:\n\n" +
  '# French Basics\n## Greetings\n**1. How do you say "hello"?**\nBonjour\n' +
  '**2. How do you say "thank you"?**\nMerci';
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /home/chris/ppp2/flashkarte/packages/mcp && npx jest src/tools/decks.test.ts`
Expected: PASS — all deck tests, including the new one.

- [ ] **Step 5: Commit**

```bash
cd /home/chris/ppp2/flashkarte
git add packages/mcp/src/tools/decks.ts packages/mcp/src/tools/decks.test.ts
git commit -m "feat(mcp): clearer deck markdown guidance with a worked example"
```

---

## Task 13: End-to-end smoke script

**Files:**

- Create: `packages/mcp/scripts/oauth-smoke.sh`

- [ ] **Step 1: Write the smoke script**

Create `packages/mcp/scripts/oauth-smoke.sh`:

```bash
#!/usr/bin/env bash
# Walks the full OAuth dance against a running MCP + backend, then creates a deck.
# Usage: BASE=http://localhost:3002 CLIENT=claude-ai EMAIL=you@x.com PASS=pw ./oauth-smoke.sh
set -euo pipefail

BASE="${BASE:?set BASE to the MCP base URL}"
CLIENT="${CLIENT:?set CLIENT to MCP_OAUTH_CLIENT_ID}"
EMAIL="${EMAIL:?set EMAIL}"
PASS="${PASS:?set PASS}"
REDIRECT="https://claude.ai/cb"

# PKCE pair
VERIFIER=$(openssl rand -hex 32)
CHALLENGE=$(printf '%s' "$VERIFIER" | openssl dgst -binary -sha256 | openssl base64 -A | tr '+/' '-_' | tr -d '=')

# 1) authorize POST -> 302 with ?code=
CODE=$(curl -s -o /dev/null -w '%{redirect_url}' -X POST "$BASE/oauth/authorize" \
  --data-urlencode "response_type=code" \
  --data-urlencode "client_id=$CLIENT" \
  --data-urlencode "redirect_uri=$REDIRECT" \
  --data-urlencode "code_challenge=$CHALLENGE" \
  --data-urlencode "code_challenge_method=S256" \
  --data-urlencode "email=$EMAIL" \
  --data-urlencode "password=$PASS" \
  | sed -n 's/.*[?&]code=\([^&]*\).*/\1/p')
echo "auth code: ${CODE:0:8}…"

# 2) token exchange
ACCESS=$(curl -s -X POST "$BASE/oauth/token" \
  --data-urlencode "grant_type=authorization_code" \
  --data-urlencode "code=$CODE" \
  --data-urlencode "code_verifier=$VERIFIER" \
  --data-urlencode "client_id=$CLIENT" \
  --data-urlencode "redirect_uri=$REDIRECT" \
  | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')
echo "access token acquired: ${ACCESS:+yes}"

# 3) call create_deck via the MCP endpoint
curl -s -X POST "$BASE/mcp" \
  -H "Authorization: Bearer $ACCESS" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"create_deck","arguments":{"markdown":"# Smoke Test\n**1. ping?**\npong"}}}'
echo
echo "Done — check the account for a 'Smoke Test' deck."
```

- [ ] **Step 2: Make it executable**

Run: `chmod +x /home/chris/ppp2/flashkarte/packages/mcp/scripts/oauth-smoke.sh`

- [ ] **Step 3: Commit**

```bash
cd /home/chris/ppp2/flashkarte
git add packages/mcp/scripts/oauth-smoke.sh
git commit -m "test(mcp): scripted OAuth end-to-end smoke (authorize→token→create_deck)"
```

> **Run it manually** once the MCP + backend are up (local or staging), with a real account, to confirm a deck lands. This is the automatable part of "verify it works"; the final claude.ai click-through is manual.

---

## Final verification

- [ ] **Full MCP suite:** `cd /home/chris/ppp2/flashkarte/packages/mcp && npx jest` → all green.
- [ ] **MCP typecheck:** `cd /home/chris/ppp2/flashkarte/packages/mcp && npx tsc -p tsconfig.json --noEmit` → no errors.
- [ ] **Web Settings test:** `cd /home/chris/ppp2/flashkarte/packages/web && npx vitest run src/pages/SettingsPage.test.tsx` → green.
- [ ] **Build the MCP package:** `cd /home/chris/ppp2/flashkarte/packages/mcp && npm run build` → emits `dist/` cleanly.
- [ ] **Smoke script** run against a live MCP+backend with a real account → "Smoke Test" deck appears.
- [ ] **Manual:** add the connector in claude.ai, log in, ask it to make a deck, confirm it appears in the app.
