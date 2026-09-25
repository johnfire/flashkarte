import {
  api,
  backendLogin,
  backendVerifyTwoFactor,
  backendCreateKey,
  requestCorrelationStore,
} from "./api";

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

function jsonResponse(ok: boolean, status: number, body: unknown) {
  return {
    ok,
    status,
    headers: { get: () => "application/json" },
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

describe("backend helpers", () => {
  beforeEach(() => mockFetch.mockReset());

  test("backendLogin reports a signed-in session on 200", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(true, 200, { accessToken: "jwt123" }),
    );
    const out = await backendLogin("a@b.com", "pw");
    expect(out).toEqual({ kind: "signed-in", accessToken: "jwt123" });
    const [url, opts] = mockFetch.mock.calls[0];
    expect(String(url)).toContain("/api/auth/login");
    expect(opts.method).toBe("POST");
  });

  test("backendLogin reports rejection on bad credentials", async () => {
    mockFetch.mockResolvedValue(jsonResponse(false, 401, { error: "no" }));
    expect(await backendLogin("a@b.com", "pw")).toEqual({ kind: "rejected" });
  });

  test("backendLogin passes on the 2FA challenge for accounts with 2FA", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(true, 200, { requiresTwoFactor: true, challenge: "ch" }),
    );
    expect(await backendLogin("a@b.com", "pw")).toEqual({
      kind: "needs-2fa",
      challenge: "ch",
    });
  });

  test("backendVerifyTwoFactor posts challenge and code to the verify route", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(true, 200, { accessToken: "jwt2fa" }),
    );
    const out = await backendVerifyTwoFactor("ch", "123456");
    expect(out).toEqual({ kind: "signed-in", accessToken: "jwt2fa" });
    const [url, opts] = mockFetch.mock.calls[0];
    expect(String(url)).toContain("/api/auth/2fa/verify");
    expect(JSON.parse(opts.body)).toEqual({ challenge: "ch", code: "123456" });
  });

  test("backendCreateKey sends the JWT and requests a deck-scoped key", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(true, 201, { key: "fk_new", key_prefix: "fk_new" }),
    );
    const out = await backendCreateKey("jwt123", "claude.ai");
    expect(out.key).toBe("fk_new");
    const [url, opts] = mockFetch.mock.calls[0];
    expect(String(url)).toContain("/api/keys");
    expect(opts.headers.Authorization).toBe("Bearer jwt123");
    expect(JSON.parse(opts.body)).toEqual({ name: "claude.ai", scope: "deck" });
  });

  test("backendCreateKey throws on failure", async () => {
    mockFetch.mockResolvedValue(jsonResponse(false, 500, {}));
    await expect(backendCreateKey("jwt", "n")).rejects.toThrow();
  });

  test("forwards the current correlation ID to the backend", async () => {
    mockFetch.mockResolvedValue(jsonResponse(true, 200, { ok: true }));
    await requestCorrelationStore.run("trace-42", () => api("GET", "/health"));
    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers["X-Request-ID"]).toBe("trace-42");
  });
});
