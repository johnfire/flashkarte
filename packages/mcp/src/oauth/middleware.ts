import { RequestHandler } from "express";
import { requestKeyStore } from "../api";
import { verifyMcpAccessToken } from "./tokens";
import { resolveAccessSession } from "./store";

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

    // OAuth JWT access token: verify signature, then resolve the opaque session
    // id to the fk_ key held server-side.
    const payload = verifyMcpAccessToken(raw);
    const session = payload ? resolveAccessSession(payload.sid) : null;
    if (session) {
      requestKeyStore.run(session.fk_key, next);
      return;
    }

    res.status(401).json({ error: "Invalid or expired token" });
  };
}
