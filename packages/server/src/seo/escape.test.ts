import { escapeHtml, escapeJsonLd } from "./escape";

describe("escapeHtml", () => {
  it("escapes &, <, >, \", '", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;",
    );
  });
  it("returns empty string for nullish", () => {
    expect(escapeHtml(undefined as unknown as string)).toBe("");
  });
});

describe("escapeJsonLd", () => {
  it("escapes < to prevent </script> breakout", () => {
    const out = escapeJsonLd({ name: "</script><x>" });
    expect(out).not.toContain("</script>");
    expect(out).toContain("\\u003c");
  });
});
