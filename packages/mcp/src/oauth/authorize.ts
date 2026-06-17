import { Router } from "express";
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

// --- Login CSRF: a stateless signed token binding the form to its OAuth params.
// Without it, an attacker can cross-site-submit their own credentials to log a
// victim's connector into the attacker's account (login CSRF). 10-min validity.
const CSRF_TTL_MS = 10 * 60 * 1000;

function csrfSecret(): string {
  return process.env.MCP_JWT_SECRET ?? "mcp-dev-csrf-secret";
}

function signCsrf(p: OAuthParams, ts: string): string {
  return crypto
    .createHmac("sha256", csrfSecret())
    .update([ts, p.client_id, p.redirect_uri, p.code_challenge].join("\n"))
    .digest("base64url");
}

function csrfValid(p: OAuthParams, ts?: string, sig?: string): boolean {
  if (!ts || !sig) return false;
  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum) || Date.now() - tsNum > CSRF_TTL_MS) return false;
  const expected = signCsrf(p, ts);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
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

function renderLoginForm(p: OAuthParams, error?: string): string {
  const hidden = (name: string, val?: string) =>
    val
      ? `<input type="hidden" name="${name}" value="${escapeHtml(val)}">`
      : "";
  const csrfTs = String(Date.now());
  const csrfSig = signCsrf(p, csrfTs);
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
  function rateLimited(ip: string | undefined): boolean {
    const key = ip ?? "unknown";
    const now = Date.now();
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
    res.type("html").send(renderLoginForm(v.params));
  });

  router.post("/oauth/authorize", async (req, res) => {
    const body = req.body as Record<string, string | undefined>;
    const v = validate(clientId, allowedRedirectUris, body);
    if (!v.ok) {
      res.status(v.status).json(v.body);
      return;
    }
    if (!csrfValid(v.params, body.csrf_ts, body.csrf_sig)) {
      res
        .status(400)
        .type("html")
        .send(
          renderLoginForm(v.params, "Your session expired. Please try again."),
        );
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
    if (rateLimited(req.ip)) {
      res
        .status(429)
        .type("html")
        .send(
          renderLoginForm(
            v.params,
            "Too many attempts. Please wait a few minutes and try again.",
          ),
        );
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
