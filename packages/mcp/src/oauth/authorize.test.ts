import express from "express";
import request from "supertest";
import { createAuthorizeRouter } from "./authorize";
import * as apiModule from "../api";
import * as store from "./store";

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

// GET the form, lift its CSRF token, then POST — mirrors a real browser so the
// stateless login-CSRF token validates.
async function postAuthorize(
  app: ReturnType<typeof makeApp>,
  fields: Record<string, string> = {},
) {
  const form = await request(app).get("/oauth/authorize").query(goodQuery);
  const ts = /name="csrf_ts" value="([^"]+)"/.exec(form.text)?.[1] ?? "";
  const sig = /name="csrf_sig" value="([^"]+)"/.exec(form.text)?.[1] ?? "";
  return request(app)
    .post("/oauth/authorize")
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
});
