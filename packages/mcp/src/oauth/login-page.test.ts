import { escapeHtml, renderLoginPage } from "./login-page";

const view = {
  params: {
    client_id: "c",
    redirect_uri: "https://claude.ai/cb",
    code_challenge: "abc",
    code_challenge_method: "S256",
    state: '"><script>x</script>',
  },
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

describe("escapeHtml", () => {
  test("escapes the five HTML-significant characters", () => {
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
  });
});
