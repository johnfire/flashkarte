import crypto from "crypto";
import express from "express";
import request from "supertest";
import { createAuthorizeRouter } from "./authorize";
import * as apiModule from "../api";
import * as store from "./store";

process.env.MCP_JWT_SECRET = "test-secret-that-is-long-enough-32chars";

jest.mock("../api", () => ({
  backendLogin: jest.fn(),
  backendCreateKey: jest.fn(),
}));
const mockApi = apiModule as jest.Mocked<typeof apiModule>;

const CLIENT = "test-client";
const ALLOWED_REDIRECTS = ["https://claude.ai/cb"];
function makeApp() {
  return express()
    .use(express.urlencoded({ extended: false }))
    .use(createAuthorizeRouter(CLIENT, ALLOWED_REDIRECTS));
}

const goodQuery = {
  response_type: "code",
  client_id: CLIENT,
  redirect_uri: "https://claude.ai/cb",
  code_challenge: "abc",
  code_challenge_method: "S256",
  state: "xyz",
};

// GET the form, lift its CSRF token, then POST with the cookie — mirrors a
// real browser so the double-submit cookie CSRF token validates.
async function postAuthorize(
  app: ReturnType<typeof makeApp>,
  fields: Record<string, string> = {},
) {
  const form = await request(app).get("/oauth/authorize").query(goodQuery);
  const ts = /name="csrf_ts" value="([^\"]+)"/.exec(form.text)?.[1] ?? "";
  const sig = /name="csrf_sig" value="([^\"]+)"/.exec(form.text)?.[1] ?? "";
  const cookies = form.headers["set-cookie"];
  return request(app)
    .post("/oauth/authorize")
    .set("Cookie", Array.isArray(cookies) ? cookies : [cookies].filter(Boolean))
    .type("form")
    .send({ ...goodQuery, csrf_ts: ts, csrf_sig: sig, ...fields });
}

describe("authorize GET", () => {
  test("renders a login form for a valid request", async () => {
    const res = await request(makeApp())
      .get("/oauth/authorize")
      .query(goodQuery);
    expect(res.status).toBe(200);
    expect(res.text).toContain("<form");
    expect(res.text).toContain('name="password"');
    expect(res.text).toContain("abc"); // code_challenge preserved in a hidden field
  });

  test("rejects a non-S256 PKCE request", async () => {
    const res = await request(makeApp())
      .get("/oauth/authorize")
      .query({ ...goodQuery, code_challenge_method: "plain" });
    expect(res.status).toBe(400);
  });

  test("rejects a non-HTTPS redirect_uri", async () => {
    const res = await request(makeApp())
      .get("/oauth/authorize")
      .query({ ...goodQuery, redirect_uri: "http://evil.test/cb" });
    expect(res.status).toBe(400);
  });

  test("rejects an HTTPS redirect_uri that is not in the allowlist", async () => {
    const res = await request(makeApp())
      .get("/oauth/authorize")
      .query({ ...goodQuery, redirect_uri: "https://evil.test/cb" });
    expect(res.status).toBe(400);
  });

  test("rejects a wrong client_id", async () => {
    const res = await request(makeApp())
      .get("/oauth/authorize")
      .query({ ...goodQuery, client_id: "nope" });
    expect(res.status).toBe(400);
  });
});

describe("authorize POST", () => {
  beforeEach(() => jest.clearAllMocks());

  test("good credentials mint a key and redirect with a code", async () => {
    mockApi.backendLogin.mockResolvedValue({ accessToken: "jwt" });
    mockApi.backendCreateKey.mockResolvedValue({
      key: "fk_minted",
      key_prefix: "fk_minted",
    });
    const res = await postAuthorize(makeApp(), {
      email: "a@b.com",
      password: "pw",
    });

    expect(res.status).toBe(302);
    const loc = new URL(res.headers.location);
    expect(loc.origin + loc.pathname).toBe("https://claude.ai/cb");
    expect(loc.searchParams.get("state")).toBe("xyz");
    const code = loc.searchParams.get("code");
    expect(code).toBeTruthy();
    // the issued code is bound to the minted fk_ key
    expect(store.consumeAuthCode(code as string)?.fk_key).toBe("fk_minted");
  });

  test("bad credentials re-render the form with an error", async () => {
    mockApi.backendLogin.mockResolvedValue(null);
    const res = await postAuthorize(makeApp(), {
      email: "a@b.com",
      password: "wrong",
    });
    expect(res.status).toBe(401);
    expect(res.text).toContain("<form");
    expect(res.text).toContain("Invalid email or password");
    expect(mockApi.backendCreateKey).not.toHaveBeenCalled();
  });

  test("missing email/password re-renders the form with a 400", async () => {
    const res = await postAuthorize(makeApp()); // valid CSRF, no credentials
    expect(res.status).toBe(400);
    expect(res.text).toContain("<form");
    expect(res.text).toContain("Email and password are required");
    expect(mockApi.backendLogin).not.toHaveBeenCalled();
  });

  test("a backend key-creation failure re-renders the form with a 500", async () => {
    mockApi.backendLogin.mockResolvedValue({ accessToken: "jwt" });
    mockApi.backendCreateKey.mockRejectedValue(new Error("boom"));
    const res = await postAuthorize(makeApp(), {
      email: "a@b.com",
      password: "pw",
    });
    expect(res.status).toBe(500);
    expect(res.text).toContain("<form");
    expect(res.text).toContain("Could not create an API key");
  });

  // MCP-004: login CSRF + brute-force protection.
  test("rejects a POST with no/invalid CSRF token (login CSRF)", async () => {
    const res = await request(makeApp())
      .post("/oauth/authorize")
      .type("form")
      .send({ ...goodQuery, email: "a@b.com", password: "pw" }); // no csrf
    expect(res.status).toBe(400);
    expect(mockApi.backendLogin).not.toHaveBeenCalled();
  });

  test("rate-limits repeated login attempts from one client", async () => {
    mockApi.backendLogin.mockResolvedValue(null); // always "wrong"
    const app = makeApp(); // shared instance -> shared limiter
    let last = 0;
    for (let i = 0; i < 12; i++) {
      const res = await postAuthorize(app, {
        email: "a@b.com",
        password: "wrong",
      });
      last = res.status;
    }
    expect(last).toBe(429); // tripped the per-IP limit
  });

  // M1: a valid signature without the session cookie must fail (attacker can
  // mint signatures but cannot read the SameSite=Strict nonce cookie).
  test("rejects a signed POST that presents no CSRF cookie", async () => {
    const app = makeApp();
    const form = await request(app).get("/oauth/authorize").query(goodQuery);
    const ts = /name="csrf_ts" value="([^\"]+)"/.exec(form.text)?.[1] ?? "";
    const sig = /name="csrf_sig" value="([^\"]+)"/.exec(form.text)?.[1] ?? "";
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
    const sig1 = /name="csrf_sig" value="([^\"]+)"/.exec(form1.text)?.[1] ?? "";
    const ts1 = /name="csrf_ts" value="([^\"]+)"/.exec(form1.text)?.[1] ?? "";
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
    const sig = crypto
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
    const ts = /name="csrf_ts" value="([^\"]+)"/.exec(form.text)?.[1] ?? "";
    const sig = /name="csrf_sig" value="([^\"]+)"/.exec(form.text)?.[1] ?? "";
    const res = await request(app)
      .post("/oauth/authorize")
      .set("Cookie", Array.isArray(cookies) ? cookies : [cookies].filter(Boolean))
      .type("form")
      .send({ ...goodQuery, state: "forged", csrf_ts: ts, csrf_sig: sig, email: "a@b.com", password: "pw" });
    expect(res.status).toBe(400);
  });
});
