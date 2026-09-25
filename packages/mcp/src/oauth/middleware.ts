import { RequestHandler, Response } from "express";
import { requestKeyStore } from "../api";
import { verifyMcpAccessToken } from "./tokens";
import { resolveAccessSession } from "./store";

export function createMcpAuthMiddleware(baseUrl: string): RequestHandler {
  // RFC 9728 §5.1: a 401 names the protected-resource metadata, so an MCP
  // client can find the login flow without being told the URL.
  const challenge = `Bearer resource_metadata="${baseUrl}/.well-known/oauth-protected-resource"`;
  const unauthorized = (res: Response, error: string) => {
    res.setHeader("WWW-Authenticate", challenge);
    res.status(401).json({ error });
  };

  return (req, res, next) => {
    const raw =
      (req.headers["x-api-key"] as string | undefined) ??
      req.headers.authorization?.replace(/^Bearer\s+/i, "");

    if (!raw) {
      unauthorized(res, "API key required");
      return;
    }

    // Direct fk_ key — kept for local dev and CLI.
    if (raw.startsWith("fk_")) {
      requestKeyStore.run(raw, next);
      return;
    }

    // OAuth JWT access token: verify signature, then resolve the opaque session
    // id to the fk_ key held server-side.
    const payload = verifyMcpAccessToken(raw);
    const session = payload ? resolveAccessSession(payload.sid) : null;
    if (session) {
      requestKeyStore.run(session.fk_key, next);
      return;
    }

    unauthorized(res, "Invalid or expired token");
  };
}
