import { buildSitemap } from "./sitemap";

describe("buildSitemap", () => {
  it("emits valid urlset XML with absolute locs", () => {
    const xml = buildSitemap([
      { loc: "https://x/" },
      { loc: "https://x/privacy" },
    ]);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain("<urlset");
    expect(xml).toContain("<loc>https://x/</loc>");
    expect(xml).toContain("<loc>https://x/privacy</loc>");
    expect((xml.match(/<url>/g) ?? []).length).toBe(2);
  });
  it("escapes ampersands in loc", () => {
    const xml = buildSitemap([{ loc: "https://x/d/a&b" }]);
    expect(xml).toContain("https://x/d/a&amp;b");
  });
});
