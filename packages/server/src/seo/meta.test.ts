import { staticMeta, metaToHeadHtml } from "./meta";

describe("staticMeta", () => {
  it("home has absolute canonical and WebApplication JSON-LD", () => {
    const m = staticMeta("/");
    expect(m.canonical).toBe("https://flashkarte.christopherrehm.de/");
    expect(m.og.url).toBe(m.canonical);
    expect(m.og.image).toBe("https://flashkarte.christopherrehm.de/og.png");
    expect(m.jsonLd).toMatchObject({ "@type": "WebApplication" });
    expect(m.title.length).toBeGreaterThan(10);
    expect(m.description.length).toBeGreaterThan(20);
  });
  it("privacy and impressum have their own canonical, no JSON-LD", () => {
    expect(staticMeta("/privacy").canonical).toBe(
      "https://flashkarte.christopherrehm.de/privacy",
    );
    expect(staticMeta("/impressum").jsonLd).toBeUndefined();
  });
});

describe("metaToHeadHtml", () => {
  it("renders title, description, canonical, OG, twitter, JSON-LD", () => {
    const html = metaToHeadHtml(staticMeta("/"));
    expect(html).toContain("<title>");
    expect(html).toContain('name="description"');
    expect(html).toContain('rel="canonical"');
    expect(html).toContain('property="og:title"');
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    expect(html).toContain("application/ld+json");
  });
  it("escapes the title", () => {
    const html = metaToHeadHtml({
      title: "a<b>",
      description: "d",
      canonical: "https://x/",
      og: {
        title: "a<b>",
        description: "d",
        image: "https://x/og.png",
        url: "https://x/",
        type: "website",
      },
    });
    expect(html).toContain("a&lt;b&gt;");
    expect(html).not.toContain("<title>a<b>");
  });
  it("adds robots meta only when set", () => {
    const base = staticMeta("/");
    expect(metaToHeadHtml(base)).not.toContain('name="robots"');
    expect(metaToHeadHtml({ ...base, robots: "noindex" })).toContain(
      '<meta name="robots" content="noindex"',
    );
  });
});
