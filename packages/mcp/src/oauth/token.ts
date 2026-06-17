import { Router } from "express";
import crypto from "crypto";
import {
  consumeAuthCode,
  createRefreshToken,
  consumeRefreshToken,
  createAccessSession,
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

      const access_token = signMcpAccessToken(
        createAccessSession(authCode.fk_key),
      );
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

      const access_token = signMcpAccessToken(
        createAccessSession(stored.fk_key),
      );
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
