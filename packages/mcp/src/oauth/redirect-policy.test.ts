import {
  isRegistrableRedirect,
  matchesRegistered,
  staticClientRedirects,
} from "./redirect-policy";

afterEach(() => {
  delete process.env.MCP_ALLOWED_REDIRECT_URIS;
});

describe("isRegistrableRedirect", () => {
  it.each([
    "https://claude.ai/api/mcp/auth_callback",
    "http://localhost/callback",
    "http://127.0.0.1:9999/cb",
  ])("accepts %s", (uri) => expect(isRegistrableRedirect(uri)).toBe(true));

  it.each([
    "http://evil.example/cb",
    "javascript:alert(1)",
    "https://claude.ai/cb#frag",
    "https://user:pw@claude.ai/cb",
    "not a url",
  ])("rejects %s", (uri) => expect(isRegistrableRedirect(uri)).toBe(false));
});

describe("matchesRegistered", () => {
  const registered = [
    "https://claude.ai/api/mcp/auth_callback",
    "http://localhost/callback",
  ];

  it("needs an exact match for https", () => {
    expect(
      matchesRegistered("https://claude.ai/api/mcp/auth_callback", registered),
    ).toBe(true);
    expect(
      matchesRegistered(
        "https://claude.ai.evil.example/api/mcp/auth_callback",
        registered,
      ),
    ).toBe(false);
  });

  it("allows any port on a registered loopback path", () => {
    expect(
      matchesRegistered("http://localhost:4000/callback", registered),
    ).toBe(true);
    expect(matchesRegistered("http://localhost:4000/other", registered)).toBe(
      false,
    );
  });
});

describe("staticClientRedirects", () => {
  it("defaults to Claude's connector callbacks plus Claude Code's loopback ones", () => {
    expect(staticClientRedirects()).toEqual([
      "https://claude.ai/api/mcp/auth_callback",
      "https://claude.com/api/mcp/auth_callback",
      "http://localhost/callback",
      "http://127.0.0.1/callback",
    ]);
  });

  it("can be overridden by MCP_ALLOWED_REDIRECT_URIS", () => {
    process.env.MCP_ALLOWED_REDIRECT_URIS =
      "https://a.example/cb, https://b.example/cb";
    expect(staticClientRedirects().slice(0, 2)).toEqual([
      "https://a.example/cb",
      "https://b.example/cb",
    ]);
  });
});
