# Security Review Fixes — Implementation Plan

**Date:** 2026-07-20
**Source:** Full-stack security review conducted 2026-07-20 (server, web, MCP, Android, infra).
**Audience:** the engineer/agent implementing these fixes. Every fix below is
self-contained with exact files, code, and verification steps.

**Context:** the review found **zero Critical/High issues**. This plan covers the
2 Medium findings and the actionable Low findings. Each fix is independently
mergeable — implement and commit them one at a time, in the order listed.

---

## Ground rules (read first)

1. **One fix = one commit.** Commit message format: `security(<area>): <what>`
   matching repo history (e.g. `security(mcp): session-bind login CSRF token`).
2. **Do not refactor unrelated code.** Touch only what the fix requires.
3. **Follow existing style.** Run `npm run format` and `npm run lint` at the repo
   root before committing. The repo uses Prettier + ESLint + strict TypeScript.
4. **Tests must pass.** Commands per package are given in each fix. If a fix has
   a "Tests" section, write those tests — they are part of the fix, not optional.
5. **Do not touch the Deferred list** at the bottom of this document.
6. If a file's current content does not match what this plan quotes, STOP and
   re-read the file — the plan was written against commit `286f4ac`.

General verification (repo root):

```bash
npm run build --workspace=packages/shared   # prerequisite for server/web types
npm test                                     # all workspaces
npm run typecheck && npm run lint
cd android && ./gradlew :app:assembleDebug :app:testDebugUnitTest
```

---

## Fix 1 — Web: stop leaking reset/verify tokens into the error log

**Severity:** Low · **Effort:** XS
**File:** `packages/web/src/api/client.ts` (line 100, inside `reportClientError`)

**Problem:** error reports send `location.href` to `POST /api/client-errors`.
Password-reset and email-verification tokens live in the query string
(`/reset-password?token=…`, `/verify-email?token=…`), so any uncaught error on
those pages persists a live single-use token in the server-side error log.

**Change:** send origin + pathname only — no query string, no fragment.

```ts
// before (line 100):
url: typeof location !== "undefined" ? location.href : undefined,

// after:
url:
  typeof location !== "undefined"
    ? location.origin + location.pathname
    : undefined,
```

**Tests:** no dedicated test exists for this function and none is required (the
function is a fire-and-forget reporter mocked in page tests). Verify
`packages/web` tests pass: `npm test --workspace=packages/web`.

---

## Fix 2 — Server: timing-safe comparison for the /metrics token

**Severity:** Low · **Effort:** XS
**File:** `packages/server/src/app.ts` (lines 149–157)

**Problem:** the metrics bearer token is compared with `!==`, which
short-circuits on the first differing byte (theoretical timing oracle).

**Change:** use `crypto.timingSafeEqual` with a length guard.

```ts
// add to the imports at the top of app.ts:
import crypto from "crypto";

// replace the body of the /metrics handler:
app.get("/metrics", (req, res) => {
  const expectedToken = process.env.METRICS_TOKEN;
  const suppliedToken = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const a = Buffer.from(suppliedToken ?? "");
  const b = Buffer.from(expectedToken ?? "");
  if (!expectedToken || a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    res.status(404).end();
    return;
  }
  res.type("text/plain").send(renderHttpMetrics());
});
```

**Tests:** the existing `describe("metrics endpoint")` block in
`packages/server/src/app.security.test.ts` already covers both paths (no token →
404, correct token → 200) and must still pass. Add one case: a token of the
correct length but wrong content → 404. Run `npm test --workspace=packages/server`.

---

## Fix 3 — MCP: fail closed when the per-request API key is missing

**Severity:** Low · **Effort:** XS
**File:** `packages/mcp/src/api.ts` (line 12)

**Problem:** `authHeaders` falls back to a process-global `FLASHKARTE_API_KEY`
when the AsyncLocalStorage request store is empty. If ALS context is ever lost
(a known real-world failure mode) while that env var is set, tool calls silently
execute as a shared account — a cross-user confused deputy. Grep confirmed the
env var is referenced nowhere else in the repo, so nothing depends on it.

**Change:** only honor the env fallback outside production; in production an
empty store means no `Authorization` header (the backend then correctly 401s).

```ts
// replace line 12:
const key =
  requestKeyStore.getStore() ??
  (process.env.NODE_ENV === "production"
    ? undefined
    : process.env.FLASHKARTE_API_KEY);
```

Add a short comment above it: `// Production must never fall back to an ambient
shared key — fail closed (backend 401) if the request context was lost.`

**Tests:** `npm test --workspace=packages/mcp`.

---

## Fix 4 — MCP: remove the hardcoded CSRF-secret fallback + require secret strength

**Severity:** Low · **Effort:** XS
**Files:** `packages/mcp/src/oauth/authorize.ts` (lines 19–21), `packages/mcp/src/index.ts` (line 24)

**Problem:** `csrfSecret()` falls back to the published constant
`"<development-only value>"`. The shipped server guards this with
`requireEnv("MCP_JWT_SECRET")` in `index.ts`, but the exported router doesn't
defend itself, and a short/weak secret is also accepted. Additionally, nothing
enforces that `MCP_JWT_SECRET` is strong — one weak secret makes both JWTs
forgeable and the encrypted OAuth store brute-forceable.

**Change in `authorize.ts`** — mirror the per-process random dev fallback used by
the main server's `getJwtSecret()` (never a shared constant):

```ts
// replace csrfSecret():
let devCsrfSecret: string | null = null;
function csrfSecret(): string {
  const secret = process.env.MCP_JWT_SECRET; // set a unique production secret
  if (secret) return secret;
  if ((process.env.NODE_ENV ?? "development") === "production") {
    throw new Error("MCP_JWT_SECRET must be set in production");
  }
  // Per-process random dev fallback — tokens don't survive restarts, and no
  // attacker-known constant ever signs anything.
  if (!devCsrfSecret) devCsrfSecret = crypto.randomBytes(32).toString("hex");
  return devCsrfSecret;
}
```

**Change in `index.ts`** — after the existing `requireEnv("MCP_JWT_SECRET")`
(line 24), add a strength check:

```ts
if (requireEnv("MCP_JWT_SECRET").length < 32) {
  throw new Error("MCP_JWT_SECRET must be at least 32 characters");
}
```

(Replace the bare `requireEnv("MCP_JWT_SECRET");` call with this block.)

**Tests:** existing tests construct the router directly without setting the env
var — the random dev fallback keeps them working unchanged.
`npm test --workspace=packages/mcp`.

---

## Fix 5 — MCP: bound the login rate-limiter map

**Severity:** Low · **Effort:** S
**File:** `packages/mcp/src/oauth/authorize.ts` (lines 159–170, inside `createAuthorizeRouter`)

**Problem:** the `attempts` map never deletes entries — it gains one permanent
entry per distinct source IP for the life of the process (IPv6 rotation → slow
memory growth in a long-lived container).

**Change:** sweep expired entries on a timer, and cap the map. Replace the
limiter block with:

```ts
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_TRACKED_IPS = 10_000;

function sweepAttempts(): void {
  const now = Date.now();
  for (const [key, entry] of attempts) {
    if (entry.resetAt < now) attempts.delete(key);
  }
}

// Unref'd so the timer never keeps the process alive (tests, CLI runs).
setInterval(sweepAttempts, ATTEMPT_WINDOW_MS).unref();

function rateLimited(ip: string | undefined): boolean {
  const key = ip ?? "unknown";
  const now = Date.now();
  if (attempts.size >= MAX_TRACKED_IPS) sweepAttempts();
  const e = attempts.get(key);
  if (!e || e.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + ATTEMPT_WINDOW_MS });
    return false;
  }
  e.count += 1;
  return e.count > ATTEMPT_LIMIT;
}
```

**Tests:** the existing rate-limit test (`authorize.test.ts`, "rate-limits
repeated login attempts from one client") must still pass.
`npm test --workspace=packages/mcp`.

---

## Fix 6 — MCP: make the login CSRF token actually bind the browser session

**Severity:** **Medium** (the most important fix in this plan) · **Effort:** M
**Files:** `packages/mcp/src/oauth/authorize.ts`, `packages/mcp/src/oauth/authorize.test.ts`

**Problem (three defects):**

1. The token is stateless and its HMAC covers only attacker-chosen inputs
   (`ts, client_id, redirect_uri, code_challenge`). The server mints a fresh
   valid token to anyone who GETs the authorize page — so an attacker can mint
   one themselves and cross-site POST the login form. The control is decorative.
2. `state` is not covered by the HMAC, so a token minted for one `state`
   validates a POST carrying another.
3. Future timestamps are accepted (`Date.now() - tsNum > TTL` is never true for
   future `tsNum`), so a token with a far-future timestamp never expires.

**Design (double-submit cookie):** the GET sets an `HttpOnly; SameSite=Strict`
cookie holding a random nonce, and the HMAC additionally covers that nonce and
`state`. A cross-site POST then fails twice over: the browser won't send the
`SameSite=Strict` cookie cross-site, and the attacker cannot produce a signature
bound to a nonce they cannot read.

**Known tradeoff (acceptable):** two concurrent tabs running the connect flow
share one cookie — the second GET invalidates the first tab's form. This is a
rare, self-healing UX edge (the failed POST re-renders a fresh form with a fresh
nonce), not a security issue. Do not try to "solve" it with multi-nonce cookies.

### Step 6.1 — rework the CSRF functions in `authorize.ts`

Replace `signCsrf` / `csrfValid` (currently lines 23–38) with:

```ts
const CSRF_COOKIE = "mcp_csrf";
// Allow 60s of client clock skew when rejecting future timestamps.
const CLOCK_SKEW_MS = 60 * 1000;

function signCsrf(p: OAuthParams, ts: string, nonce: string): string {
  return crypto
    .createHmac("sha256", csrfSecret())
    .update(
      [ts, nonce, p.client_id, p.redirect_uri, p.code_challenge, p.state ?? ""].join("\n"),
    )
    .digest("base64url");
}

function csrfValid(
  p: OAuthParams,
  ts?: string,
  sig?: string,
  nonce?: string,
): boolean {
  if (!ts || !sig || !nonce) return false;
  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum)) return false;
  if (tsNum > Date.now() + CLOCK_SKEW_MS) return false; // future ts
  if (Date.now() - tsNum > CSRF_TTL_MS) return false; // expired
  const expected = signCsrf(p, ts, nonce);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Minimal cookie reader — avoids a cookie-parser dependency for one value.
function readCookie(req: express.Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return undefined;
}

function setCsrfCookie(res: express.Response, nonce: string): void {
  const secure = (process.env.NODE_ENV ?? "development") === "production";
  res.setHeader(
    "Set-Cookie",
    `${CSRF_COOKIE}=${nonce}; HttpOnly; SameSite=Strict; Path=/oauth; Max-Age=${CSRF_TTL_MS / 1000}${secure ? "; Secure" : ""}`,
  );
}
```

Add `import express from "express";` — actually the file already imports
`Router` from express; change that line to `import express, { Router } from "express";`.

Update the top-of-file comment (lines 14–16) to describe the new mechanism:
`// --- Login CSRF: double-submit cookie. GET sets a SameSite=Strict HttpOnly
// nonce cookie and signs [ts, nonce, OAuth params, state] into the form; POST
// must present a signature bound to the cookie's nonce. A cross-site submit
// fails (browser withholds the cookie; the nonce is unreadable to the attacker).`

### Step 6.2 — one form-rendering helper that always issues a fresh nonce

Change `renderLoginForm(p, error?)` to `renderLoginForm(p, nonce, error?)`
(signature: nonce becomes the second parameter) and inside it:

```ts
const csrfTs = String(Date.now());
const csrfSig = signCsrf(p, csrfTs, nonce);
```

Add a helper next to it:

```ts
function sendLoginForm(
  res: express.Response,
  p: OAuthParams,
  status: number,
  error?: string,
): void {
  const nonce = crypto.randomBytes(16).toString("base64url");
  setCsrfCookie(res, nonce);
  res.status(status).type("html").send(renderLoginForm(p, nonce, error));
}
```

### Step 6.3 — rewire the two route handlers

- **GET** (currently line 182): replace `res.type("html").send(renderLoginForm(v.params));`
  with `sendLoginForm(res, v.params, 200);`
- **POST**: replace every `res.status(<n>).type("html").send(renderLoginForm(v.params, "<msg>"));`
  call with `sendLoginForm(res, v.params, <n>, "<msg>");` — there are five
  (CSRF failure 400, missing credentials 400, rate-limited 429, bad login 401,
  key-creation failure 500). This makes every retry form carry a valid fresh
  nonce/cookie pair.
- The CSRF check becomes:
  ```ts
  if (!csrfValid(v.params, body.csrf_ts, body.csrf_sig, readCookie(req, CSRF_COOKIE))) {
  ```

### Step 6.4 — update `authorize.test.ts`

At the top of the file (after the imports), set a known secret so tests can mint
signatures themselves:

```ts
process.env.MCP_JWT_SECRET = "<32-character test value>";
```

Update the `postAuthorize` helper to forward the cookie from GET to POST:

```ts
async function postAuthorize(
  app: ReturnType<typeof makeApp>,
  fields: Record<string, string> = {},
) {
  const form = await request(app).get("/oauth/authorize").query(goodQuery);
  const ts = /name="csrf_ts" value="([^"]+)"/.exec(form.text)?.[1] ?? "";
  const sig = /name="csrf_sig" value="([^"]+)"/.exec(form.text)?.[1] ?? "";
  const cookies = form.headers["set-cookie"];
  return request(app)
    .post("/oauth/authorize")
    .set("Cookie", Array.isArray(cookies) ? cookies : [cookies].filter(Boolean))
    .type("form")
    .send({ ...goodQuery, csrf_ts: ts, csrf_sig: sig, ...fields });
}
```

Add these regression tests to the `describe("authorize POST")` block:

```ts
// M1: a valid signature without the session cookie must fail (attacker can
// mint signatures but cannot read the SameSite=Strict nonce cookie).
test("rejects a signed POST that presents no CSRF cookie", async () => {
  const app = makeApp();
  const form = await request(app).get("/oauth/authorize").query(goodQuery);
  const ts = /name="csrf_ts" value="([^"]+)"/.exec(form.text)?.[1] ?? "";
  const sig = /name="csrf_sig" value="([^"]+)"/.exec(form.text)?.[1] ?? "";
  const res = await request(app)
    .post("/oauth/authorize")
    .type("form")
    .send({ ...goodQuery, csrf_ts: ts, csrf_sig: sig, email: "a@b.com", password: "pw" });
  expect(res.status).toBe(400);
  expect(mockApi.backendLogin).not.toHaveBeenCalled();
});

test("rejects a signature bound to a different nonce (cookie mismatch)", async () => {
  const app = makeApp();
  const form1 = await request(app).get("/oauth/authorize").query(goodQuery);
  const sig1 = /name="csrf_sig" value="([^"]+)"/.exec(form1.text)?.[1] ?? "";
  const ts1 = /name="csrf_ts" value="([^"]+)"/.exec(form1.text)?.[1] ?? "";
  const form2 = await request(app).get("/oauth/authorize").query(goodQuery); // new nonce
  const cookies2 = form2.headers["set-cookie"];
  const res = await request(app)
    .post("/oauth/authorize")
    .set("Cookie", Array.isArray(cookies2) ? cookies2 : [cookies2].filter(Boolean))
    .type("form")
    .send({ ...goodQuery, csrf_ts: ts1, csrf_sig: sig1, email: "a@b.com", password: "pw" });
  expect(res.status).toBe(400);
});

test("rejects a token with a future timestamp", async () => {
  // Mint a token exactly like the server does, but with a future ts.
  const futureTs = String(Date.now() + 60 * 60 * 1000);
  const nonce = "testnonce123";
  const sig = require("crypto")
    .createHmac("sha256", process.env.MCP_JWT_SECRET!)
    .update(
      [futureTs, nonce, goodQuery.client_id, goodQuery.redirect_uri, goodQuery.code_challenge, goodQuery.state].join("\n"),
    )
    .digest("base64url");
  const res = await request(makeApp())
    .post("/oauth/authorize")
    .set("Cookie", `mcp_csrf=${nonce}`)
    .type("form")
    .send({ ...goodQuery, csrf_ts: futureTs, csrf_sig: sig, email: "a@b.com", password: "pw" });
  expect(res.status).toBe(400);
});

test("rejects a signature minted for a different state", async () => {
  const app = makeApp();
  const form = await request(app).get("/oauth/authorize").query(goodQuery);
  const cookies = form.headers["set-cookie"];
  // Sig was minted over state "xyz"; submit the form with a different state.
  const ts = /name="csrf_ts" value="([^"]+)"/.exec(form.text)?.[1] ?? "";
  const sig = /name="csrf_sig" value="([^"]+)"/.exec(form.text)?.[1] ?? "";
  const res = await request(app)
    .post("/oauth/authorize")
    .set("Cookie", Array.isArray(cookies) ? cookies : [cookies].filter(Boolean))
    .type("form")
    .send({ ...goodQuery, state: "forged", csrf_ts: ts, csrf_sig: sig, email: "a@b.com", password: "pw" });
  expect(res.status).toBe(400);
});
```

(Prefer `import crypto from "crypto"` at the top over `require` — match the
file's existing import style.)

**Tests:** `npm test --workspace=packages/mcp` — all pre-existing tests must
also pass (the helper change keeps them valid).

---

## Fix 7 — Android: always delete the legacy plaintext database

**Severity:** Low · **Effort:** XS (one-line logic change)
**File:** `android/app/src/main/java/com/flashmd/data/local/db/EncryptedDatabaseProvider.kt` (line 30)

**Problem:** if migration is interrupted after the encrypted file is activated
(`renameTo`, line 45) but before the legacy plaintext DB is deleted (line 46),
then on every later launch the guard `if (encryptedFile.exists() || !legacyFile.exists()) return`
skips the whole block — and the plaintext copy of all study data stays on disk
forever, silently defeating the encryption.

**Change:** delete the legacy file whenever it exists, even if migration already
completed. Replace line 30 with:

```kotlin
if (!legacyFile.exists()) return
if (encryptedFile.exists()) {
    // Migration previously completed but was interrupted before cleanup —
    // never let the plaintext copy linger.
    deleteDatabaseFiles(context, LEGACY_NAME)
    return
}
```

(The remaining migration code below stays exactly as-is.)

**Tests:** `cd android && ./gradlew :app:testDebugUnitTest`. The existing
`PlaintextDatabaseMigratorTest` is unaffected (this file is thin orchestration).

---

## Fix 8 — Android: add a root-level backup certificate pin

**Severity:** **Medium** (operational availability, not attacker-exploitable) · **Effort:** S
**File:** `android/app/src/main/java/com/flashmd/di/ApiCertificatePinning.kt`

**Problem:** the pinner pins exactly two Let's Encrypt *intermediates* (YE1,
YE2). If Let's Encrypt rotates issuance to new intermediates (they have done so
before), every installed app loses all API connectivity until an app update
clears Play review — a self-inflicted total outage.

**Change:** add the SPKI pin of **ISRG Root YE**, the ECDSA trust anchor every
current and future LE ECDSA intermediate chains to. This pin was computed from
the live production chain on 2026-07-20 (`openssl s_client -showcerts`) — it is
the root's public key, not the leaf's, so 90-day renewals don't affect it:

```
sha256/sCkq5UWXjg+7mKu9lMhhYF5bGLsy7VI/UNW3tccdR7w=
```

Add it to the `CertificatePinner.Builder` for `flashkarte.christopherrehm.de`,
with a comment: `// ISRG Root YE (ECDSA trust anchor) — backup pin: survives
// Let's Encrypt intermediate rotation. Verified against the live chain
// 2026-07-20.`

**Verification after the change** (requires a release-signed or debug build
talking to prod): the existing `ApiCertificatePinningTest` must pass
(`./gradlew :app:testDebugUnitTest`), and before shipping, re-run this against
the live site and confirm one of the chain's SPKI hashes matches a pin:

```bash
echo | openssl s_client -connect flashkarte.christopherrehm.de:443 \
  -servername flashkarte.christopherrehm.de -showcerts 2>/dev/null \
  | awk '/BEGIN CERTIFICATE/,/END CERTIFICATE/{print}' > /tmp/chain.pem
# split chain.pem into one file per cert, then for each:
#   openssl x509 -in CERT -pubkey -noout | openssl pkey -pubin -outform der \
#     | openssl dgst -sha256 -binary | openssl enc -base64
```

---

## Deferred (do NOT implement in this pass)

These are real but need a design or ops decision first — they're listed so they
aren't lost. Creating a tracking issue for each is appropriate.

| Item | Why deferred |
| --- | --- |
| Server refresh-token reuse detection / family revocation | Requires a schema migration (token tombstones or family IDs) plus a cleanup job. Design first. |
| MCP token revocation endpoint (RFC 7009) + "disconnect connector" UI | New feature spanning MCP, backend keys UI, and docs. |
| MCP→backend cleartext HTTP on the docker bridge (`FLASHKARTE_API_URL=http://app:3001`) | Infra trust decision: internal TLS vs documented trust boundary. Passwords and `fk_` keys cross this hop. |
| Reset/verify tokens in URL query reach the Umami analytics DB | Fragment-carried tokens (`#token=`) are a product-wide change (email templates, both clients). Fix 1 already removes the server-log copy. |
| Android release minification (R8) | Needs keep-rules for kotlinx.serialization/Hilt and a full release-build test round. |
| Android: recovery path for Keystore-failure crash loops | UX/product tradeoff (fail-closed vs degraded re-sync mode). |
| MCP tool input size caps (`.max()` on markdown/title) and `frame-ancestors` on the login page | One-line hardening; fine to batch into any later MCP change. |

---

## Final checklist for the implementer

- [ ] Fix 1 (web URL stripping) — `npm test --workspace=packages/web` green
- [ ] Fix 2 (metrics timing-safe) — `npm test --workspace=packages/server` green
- [ ] Fix 3 (MCP fail-closed key) — `npm test --workspace=packages/mcp` green
- [ ] Fix 4 (MCP CSRF secret) — `npm test --workspace=packages/mcp` green
- [ ] Fix 5 (MCP limiter map) — `npm test --workspace=packages/mcp` green
- [ ] Fix 6 (MCP CSRF session binding) — all MCP tests green incl. 4 new ones
- [ ] Fix 7 (Android legacy DB) — `:app:testDebugUnitTest` green
- [ ] Fix 8 (Android root pin) — `:app:testDebugUnitTest` green + live-chain check
- [ ] `npm run lint && npm run format:check` clean at repo root
- [ ] One commit per fix, messages in `security(<area>): …` format
