process.env.MCP_JWT_SECRET = "test-secret";
import crypto from "crypto";
import express from "express";
import request from "supertest";
import { createTokenRouter } from "./token";
import { createAuthCode, resolveAccessSession } from "./store";
import { verifyMcpAccessToken } from "./tokens";

/** The access token carries an opaque sid; resolve it to the backing fk_ key. */
function fkKeyFor(accessToken: string): string | undefined {
  const sid = verifyMcpAccessToken(accessToken)?.sid;
  return sid ? (resolveAccessSession(sid)?.fk_key ?? undefined) : undefined;
}

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
    expect(fkKeyFor(res.body.access_token)).toBe("fk_user");
    // The fk_ key must not be embedded in the (readable) JWT payload.
    expect(res.body.access_token).not.toContain("fk_user");
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
    expect(fkKeyFor(res.body.access_token)).toBe("fk_user");
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
