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
    const res = await request(makeApp())
      .post("/oauth/authorize")
      .type("form")
      .send({ ...goodQuery, email: "a@b.com", password: "pw" });

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
    const res = await request(makeApp())
      .post("/oauth/authorize")
      .type("form")
      .send({ ...goodQuery, email: "a@b.com", password: "wrong" });
    expect(res.status).toBe(401);
    expect(res.text).toContain("<form");
    expect(res.text).toContain("Invalid email or password");
    expect(mockApi.backendCreateKey).not.toHaveBeenCalled();
  });

  test("missing email/password re-renders the form with a 400", async () => {
    const res = await request(makeApp())
      .post("/oauth/authorize")
      .type("form")
      .send({ ...goodQuery }); // no email/password
    expect(res.status).toBe(400);
    expect(res.text).toContain("<form");
    expect(res.text).toContain("Email and password are required");
    expect(mockApi.backendLogin).not.toHaveBeenCalled();
  });

  test("a backend key-creation failure re-renders the form with a 500", async () => {
    mockApi.backendLogin.mockResolvedValue({ accessToken: "jwt" });
    mockApi.backendCreateKey.mockRejectedValue(new Error("boom"));
    const res = await request(makeApp())
      .post("/oauth/authorize")
      .type("form")
      .send({ ...goodQuery, email: "a@b.com", password: "pw" });
    expect(res.status).toBe(500);
    expect(res.text).toContain("<form");
    expect(res.text).toContain("Could not create an API key");
  });
});
