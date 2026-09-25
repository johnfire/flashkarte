import express, { Router } from "express";
import { createAuthCode } from "./store";
import {
  backendCreateKey,
  backendLogin,
  backendVerifyTwoFactor,
  LoginOutcome,
} from "../api";
import {
  csrfValid,
  issueCsrfToken,
  OAuthParams,
  readCsrfCookie,
  setCsrfCookie,
} from "./csrf";
import { createLoginLimiter } from "./login-limiter";
import { renderLoginPage } from "./login-page";
import { ClientInfo, lookupClient, matchesRegistered } from "./redirect-policy";

type FormBody = Record<string, string | undefined>;

type Validation =
  | { ok: true; params: OAuthParams; client: ClientInfo }
  | { ok: false; status: number; body: object };

function validate(staticClientId: string, q: FormBody): Validation {
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
  const client = client_id ? lookupClient(client_id, staticClientId) : null;
  if (!client_id || !client)
    return { ok: false, status: 400, body: { error: "invalid_client" } };
  // An open redirect_uri lets an attacker start the flow with their own
  // callback + PKCE and steal the victim's auth code, so a mere "is HTTPS"
  // check is not enough — the URI must be one this client registered.
  if (!redirect_uri || !matchesRegistered(redirect_uri, client.redirectUris))
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
    client,
    params: {
      client_id,
      redirect_uri,
      code_challenge,
      code_challenge_method,
      state,
    },
  };
}

interface PageOptions {
  error?: string;
  challenge?: string;
}

interface Connection {
  params: OAuthParams;
  client: ClientInfo;
}

function sendLoginPage(
  res: express.Response,
  { params, client }: Connection,
  status: number,
  options: PageOptions = {},
): void {
  const nonce = setCsrfCookie(res);
  const csrf = issueCsrfToken(params, nonce);
  const app = { name: client.name, isSelfRegistered: client.isSelfRegistered };
  res
    .status(status)
    .type("html")
    .send(renderLoginPage({ params, app, csrf, ...options }));
}

/** The form is step 2 (2FA code) when it carries the backend's challenge. */
function missingFieldMessage(body: FormBody): string | null {
  if (body.challenge) {
    return body.code ? null : "Enter the code from your authenticator app.";
  }
  return body.email && body.password
    ? null
    : "Email and password are required.";
}

function signIn(
  body: FormBody,
  clientIp: string | undefined,
): Promise<LoginOutcome> {
  if (body.challenge) {
    const code = (body.code ?? "").trim();
    return backendVerifyTwoFactor(body.challenge, code, clientIp);
  }
  return backendLogin(body.email ?? "", body.password ?? "", clientIp);
}

const TOO_MANY_ATTEMPTS =
  "Too many attempts. Please wait a few minutes and try again.";

function rejectionMessage(body: FormBody): string {
  return body.challenge
    ? "That code didn't work, or it took too long. Please log in again."
    : "Invalid email or password.";
}

async function issueCode(
  res: express.Response,
  connection: Connection,
  accessToken: string,
): Promise<void> {
  const params = connection.params;
  let fkKey: string;
  try {
    fkKey = (await backendCreateKey(accessToken, "claude.ai")).key;
  } catch {
    sendLoginPage(res, connection, 500, {
      error: "Could not create an API key. Please try again.",
    });
    return;
  }
  const code = createAuthCode({
    code_challenge: params.code_challenge,
    redirect_uri: params.redirect_uri,
    client_id: params.client_id,
    fk_key: fkKey,
  });
  const dest = new URL(params.redirect_uri);
  dest.searchParams.set("code", code);
  if (params.state) dest.searchParams.set("state", params.state);
  res.redirect(dest.toString());
}

export function createAuthorizeRouter(staticClientId: string): Router {
  const router = Router();
  // Per-instance so each app gets a fresh limiter (one instance in prod).
  const limiter = createLoginLimiter();

  router.get("/oauth/authorize", (req, res) => {
    const v = validate(staticClientId, req.query as FormBody);
    if (!v.ok) {
      res.status(v.status).json(v.body);
      return;
    }
    sendLoginPage(res, { params: v.params, client: v.client }, 200);
  });

  router.post("/oauth/authorize", async (req, res) => {
    const body = req.body as FormBody;
    const v = validate(staticClientId, body);
    if (!v.ok) {
      res.status(v.status).json(v.body);
      return;
    }
    const params = v.params;
    const connection = { params, client: v.client };
    const challenge = body.challenge;
    if (!csrfValid(params, body.csrf_ts, body.csrf_sig, readCsrfCookie(req))) {
      sendLoginPage(res, connection, 400, {
        error: "Your session expired. Please try again.",
      });
      return;
    }
    const missing = missingFieldMessage(body);
    if (missing) {
      sendLoginPage(res, connection, 400, { error: missing, challenge });
      return;
    }
    if (limiter.isLimited(req.ip)) {
      sendLoginPage(res, connection, 429, { error: TOO_MANY_ATTEMPTS });
      return;
    }
    const outcome = await signIn(body, req.ip);
    if (outcome.kind === "needs-2fa") {
      sendLoginPage(res, connection, 200, { challenge: outcome.challenge });
    } else if (outcome.kind === "rate-limited") {
      sendLoginPage(res, connection, 429, {
        error: TOO_MANY_ATTEMPTS,
        challenge,
      });
    } else if (outcome.kind === "rejected") {
      sendLoginPage(res, connection, 401, { error: rejectionMessage(body) });
    } else {
      await issueCode(res, connection, outcome.accessToken);
    }
  });

  return router;
}
