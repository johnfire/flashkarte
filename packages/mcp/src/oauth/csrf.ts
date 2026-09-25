import crypto from "crypto";
import express from "express";

// Login CSRF: double-submit cookie. GET sets a SameSite=Strict HttpOnly nonce
// cookie and signs [ts, nonce, OAuth params, state] into the form; POST must
// present a signature bound to the cookie's nonce. A cross-site submit fails
// (browser withholds the cookie; the nonce is unreadable to the attacker).

export interface OAuthParams {
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  code_challenge_method: string;
  state?: string;
}

export interface CsrfToken {
  ts: string;
  sig: string;
}

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

/** Sign a fresh form token for this nonce. */
export function issueCsrfToken(p: OAuthParams, nonce: string): CsrfToken {
  const ts = String(Date.now());
  return { ts, sig: signCsrf(p, ts, nonce) };
}

export function csrfValid(
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
export function readCsrfCookie(req: express.Request): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === CSRF_COOKIE) return rest.join("=");
  }
  return undefined;
}

/** Set a new nonce cookie and return the nonce the form must be signed with. */
export function setCsrfCookie(res: express.Response): string {
  const nonce = crypto.randomBytes(16).toString("base64url");
  const secure = (process.env.NODE_ENV ?? "development") === "production";
  res.setHeader(
    "Set-Cookie",
    `${CSRF_COOKIE}=${nonce}; HttpOnly; SameSite=Strict; Path=/oauth; Max-Age=${CSRF_TTL_MS / 1000}${secure ? "; Secure" : ""}`,
  );
  return nonce;
}
