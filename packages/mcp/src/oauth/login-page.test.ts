import { escapeHtml, redirectDestination, renderLoginPage } from "./login-page";

const view = {
  params: {
    client_id: "c",
    redirect_uri: "https://claude.ai/cb",
    code_challenge: "abc",
    code_challenge_method: "S256",
    state: '"><script>x</script>',
  },
  app: { name: "Claude", isSelfRegistered: false },
  csrf: { ts: "1", sig: "s" },
};

describe("renderLoginPage", () => {
  test("step 1 asks for email and password", () => {
    const html = renderLoginPage(view);
    expect(html).toContain('name="password"');
    expect(html).not.toContain('name="code"');
  });

  test("step 2 asks for the code and carries the challenge", () => {
    const html = renderLoginPage({ ...view, challenge: "ch<1>" });
    expect(html).toContain('name="code"');
    expect(html).toContain('value="ch&lt;1&gt;"');
    expect(html).not.toContain('name="password"');
  });

  test("escapes every reflected value", () => {
    const html = renderLoginPage({ ...view, error: "<b>bad</b>" });
    expect(html).not.toContain("<script>x</script>");
    expect(html).toContain("&lt;b&gt;bad&lt;/b&gt;");
  });
});

describe("consent wording", () => {
  test("names the app, what it can do, and where the person is sent", () => {
    const html = renderLoginPage(view);
    expect(html).toContain("Allow <strong>Claude</strong>");
    expect(html).toContain("delete your decks");
    expect(html).toContain("cannot see or change your email");
    expect(html).toContain("sent to <strong>claude.ai</strong>");
    expect(html).not.toContain("chose this name itself");
  });

  test("flags a self-registered name as unverified and escapes it", () => {
    const html = renderLoginPage({
      ...view,
      app: { name: "<img src=x>", isSelfRegistered: true },
    });
    expect(html).toContain("&lt;img src=x&gt;");
    expect(html).toContain("chose this name itself");
  });
});

describe("redirectDestination", () => {
  test.each([
    ["https://claude.ai/api/mcp/auth_callback", "claude.ai"],
    ["http://localhost:4567/callback", "an app on this computer (localhost)"],
    ["http://127.0.0.1:9/callback", "an app on this computer (localhost)"],
  ])("%s → %s", (uri, expected) => {
    expect(redirectDestination(uri)).toBe(expected);
  });
});

describe("escapeHtml", () => {
  test("escapes the five HTML-significant characters", () => {
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
  });
});
