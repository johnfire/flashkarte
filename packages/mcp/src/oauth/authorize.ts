import express, { Router } from "express";
import crypto from "crypto";
import { createAuthCode } from "./store";
import { backendLogin, backendCreateKey } from "../api";

interface OAuthParams {
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  code_challenge_method: string;
  state?: string;
}

// --- Login CSRF: double-submit cookie. GET sets a SameSite=Strict HttpOnly
// nonce cookie and signs [ts, nonce, OAuth params, state] into the form; POST
// must present a signature bound to the cookie's nonce. A cross-site submit
// fails (browser withholds the cookie; the nonce is unreadable to the attacker).
const CSRF_TTL_MS = 10 * 60 * 1000;
const CSRF_COOKIE = "mcp_csrf";
// Allow 60s of client clock skew when rejecting future timestamps.
const CLOCK_SKEW_MS = 60 * 1000;

let devCsrfSecret: string | null = null;
function csrfSecret(): string {
  const secret = process.env.MCP_JWT_SECRET;
  if (secret) return secret;
  if ((process.env.NODE_ENV ?? "development") === "production") {
    throw new Error("MCP_JWT_SECRET must be set in production");
  }
  // Per-process random dev fallback — tokens don't survive restarts, and no
  // attacker-known constant ever signs anything.
  if (!devCsrfSecret) devCsrfSecret = crypto.randomBytes(32).toString("hex");
  return devCsrfSecret;
}

function signCsrf(p: OAuthParams, ts: string, nonce: string): string {
  return crypto
    .createHmac("sha256", csrfSecret())
    .update(
      [
        ts,
        nonce,
        p.client_id,
        p.redirect_uri,
        p.code_challenge,
        p.state ?? "",
      ].join("\n"),
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

// --- Per-IP login rate limit (the authorize POST is an unauthenticated
// password-guessing oracle against real flashkarte accounts otherwise).
const ATTEMPT_LIMIT = 10;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

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

function renderLoginForm(
  p: OAuthParams,
  nonce: string,
  error?: string,
): string {
  const hidden = (name: string, val?: string) =>
    val
      ? `<input type="hidden" name="${name}" value="${escapeHtml(val)}">`
      : "";
  const csrfTs = String(Date.now());
  const csrfSig = signCsrf(p, csrfTs, nonce);
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
${hidden("csrf_ts", csrfTs)}
${hidden("csrf_sig", csrfSig)}
<input name="email" type="email" placeholder="Email" autocomplete="username" required>
<input name="password" type="password" placeholder="Password" autocomplete="current-password" required>
<button type="submit">Log in &amp; connect</button>
</form>
</body></html>`;
}

function sendLoginForm(
  res: express.Response,
  p: OAuthParams,
  status: number,
  error?: string,
): void {
  const nonce = crypto.randomBytes(16).toString("base64url");
  setCsrfCookie(res, nonce);
  res
    .status(status)
    .type("html")
    .send(renderLoginForm(p, nonce, error));
}

type Validation =
  | { ok: true; params: OAuthParams }
  | { ok: false; status: number; body: object };

function validate(
  clientId: string,
  allowedRedirectUris: string[],
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
  // Exact-match allowlist. An open redirect_uri lets an attacker initiate the
  // flow with their own callback + PKCE and steal the victim's auth code, so a
  // mere "is HTTPS" check is not enough — the URI must be pre-registered.
  if (!redirect_uri || !allowedRedirectUris.includes(redirect_uri))
    return {
      ok: false,
      status: 400,
      body: {
        error: "invalid_request",
        error_description: "redirect_uri is not registered",
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

export function createAuthorizeRouter(
  clientId: string,
  allowedRedirectUris: string[],
): Router {
  const router = Router();

  // Per-instance so each app gets a fresh limiter (one instance in prod).
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

  router.get("/oauth/authorize", (req, res) => {
    const v = validate(
      clientId,
      allowedRedirectUris,
      req.query as Record<string, string | undefined>,
    );
    if (!v.ok) {
      res.status(v.status).json(v.body);
      return;
    }
    sendLoginForm(res, v.params, 200);
  });

  router.post("/oauth/authorize", async (req, res) => {
    const body = req.body as Record<string, string | undefined>;
    const v = validate(clientId, allowedRedirectUris, body);
    if (!v.ok) {
      res.status(v.status).json(v.body);
      return;
    }
    if (
      !csrfValid(
        v.params,
        body.csrf_ts,
        body.csrf_sig,
        readCookie(req, CSRF_COOKIE),
      )
    ) {
      sendLoginForm(
        res,
        v.params,
        400,
        "Your session expired. Please try again.",
      );
      return;
    }
    const { email, password } = body;
    if (!email || !password) {
      sendLoginForm(res, v.params, 400, "Email and password are required.");
      return;
    }
    if (rateLimited(req.ip)) {
      sendLoginForm(
        res,
        v.params,
        429,
        "Too many attempts. Please wait a few minutes and try again.",
      );
      return;
    }

    const login = await backendLogin(email, password);
    if (!login) {
      sendLoginForm(res, v.params, 401, "Invalid email or password.");
      return;
    }

    let fkKey: string;
    try {
      const key = await backendCreateKey(login.accessToken, "claude.ai");
      fkKey = key.key;
    } catch {
      sendLoginForm(
        res,
        v.params,
        500,
        "Could not create an API key. Please try again.",
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
