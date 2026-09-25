import { Router } from "express";
import { registerClient } from "./store";
import { isRegistrableRedirect } from "./redirect-policy";
import { createLoginLimiter } from "./login-limiter";

const MAX_REDIRECT_URIS = 10;

function validRedirectUris(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  if (value.length > MAX_REDIRECT_URIS) return null;
  const allValid = value.every(
    (uri) => typeof uri === "string" && isRegistrableRedirect(uri),
  );
  return allValid ? (value as string[]) : null;
}

/**
 * RFC 7591 dynamic client registration, so apps such as Claude Code can
 * connect without a pre-shared client id. Registering grants nothing: the
 * person still logs in and sees the app's name and redirect host first.
 */
export function createRegisterRouter(): Router {
  const router = Router();
  const limiter = createLoginLimiter();

  router.post("/oauth/register", (req, res) => {
    if (limiter.isLimited(req.ip)) {
      res.status(429).json({ error: "too_many_requests" });
      return;
    }
    const body = (req.body ?? {}) as {
      redirect_uris?: unknown;
      client_name?: unknown;
    };
    const redirect_uris = validRedirectUris(body.redirect_uris);
    if (!redirect_uris) {
      res.status(400).json({
        error: "invalid_redirect_uri",
        error_description:
          "redirect_uris must be 1-10 https URIs (or http on localhost / 127.0.0.1)",
      });
      return;
    }
    const client_name =
      typeof body.client_name === "string"
        ? body.client_name.slice(0, 100)
        : undefined;
    const client_id = registerClient(redirect_uris, client_name);
    res.status(201).json({
      client_id,
      redirect_uris,
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      ...(client_name ? { client_name } : {}),
    });
  });

  return router;
}
