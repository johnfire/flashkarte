import { backendLogin, backendCreateKey } from "./api";

const mockFetch = jest.fn();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).fetch = mockFetch;

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

  test("backendLogin returns the parsed body on 200", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(true, 200, { accessToken: "jwt123" }),
    );
    const out = await backendLogin("a@b.com", "pw");
    expect(out).toEqual({ accessToken: "jwt123" });
    const [url, opts] = mockFetch.mock.calls[0];
    expect(String(url)).toContain("/api/auth/login");
    expect(opts.method).toBe("POST");
  });

  test("backendLogin returns null on bad credentials", async () => {
    mockFetch.mockResolvedValue(jsonResponse(false, 401, { error: "no" }));
    expect(await backendLogin("a@b.com", "pw")).toBeNull();
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
});
