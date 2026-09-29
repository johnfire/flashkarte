import fs from "fs";
import path from "path";
import { HELP_PATHS, staticMeta } from "./meta";

// The help center is the site's main body of keyword-rich text. Its per-page
// title and description are written twice: in the web app's i18n file (used by
// the browser) and in the server's meta table (used by crawlers before any
// JavaScript runs). These tests keep the two copies, and the route list, honest.
const WEB_SRC = path.join(__dirname, "../../../web/src");
const en = JSON.parse(
  fs.readFileSync(path.join(WEB_SRC, "i18n/locales/en.json"), "utf8"),
) as { help: Record<string, { metaTitle?: string; metaDescription?: string }> };
const appSource = fs.readFileSync(path.join(WEB_SRC, "App.tsx"), "utf8");

const KEY_FOR_PATH: Record<string, string> = {
  "/help": "index",
  "/help/getting-started": "gettingStarted",
  "/help/writing-decks": "writingDecks",
  "/help/advanced-cards": "advancedCards",
  "/help/branching-decks": "branchingDecks",
  "/help/studying": "studying",
  "/help/ai": "ai",
  "/help/sharing": "sharing",
};

describe("help-center SEO meta", () => {
  it("covers exactly the help routes the web app defines", () => {
    const routes = [...appSource.matchAll(/path="(\/help[^"]*)"/g)].map(
      (m) => m[1],
    );
    expect([...HELP_PATHS].sort()).toEqual([...routes].sort());
  });

  it.each(Object.entries(KEY_FOR_PATH))(
    "%s matches the browser's title and description (help.%s)",
    (routePath, key) => {
      const web = en.help[key];
      const server = staticMeta(routePath);
      expect(server.title).toBe(web.metaTitle);
      expect(server.description).toBe(web.metaDescription);
    },
  );

  it("gives every help page its own title, canonical and OG url", () => {
    const metas = HELP_PATHS.map((p) => staticMeta(p));
    expect(new Set(metas.map((m) => m.title)).size).toBe(HELP_PATHS.length);
    expect(new Set(metas.map((m) => m.canonical)).size).toBe(HELP_PATHS.length);
    for (const m of metas) {
      expect(m.canonical).toMatch(/^https:\/\/learnwohl\.app\/help/);
      expect(m.og.url).toBe(m.canonical);
      expect(m.title).toContain("LearnWohl");
      expect(m.description.length).toBeGreaterThan(20);
    }
  });
});
