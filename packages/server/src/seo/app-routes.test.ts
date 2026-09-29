import fs from "fs";
import path from "path";
import { APP_ROUTES, isKnownAppPath } from "./routes";

const appSource = fs.readFileSync(
  path.join(__dirname, "../../../web/src/App.tsx"),
  "utf8",
);
// Every <Route path="…"> in the web app, except the catch-all.
const webRoutes = [...appSource.matchAll(/path=\s*"([^"]+)"/g)]
  .map((m) => m[1])
  .filter((p) => p !== "*");

describe("APP_ROUTES stays in step with web/src/App.tsx", () => {
  it("has every route the web app defines (a missing one would 404 on refresh)", () => {
    const missing = webRoutes.filter(
      (r) => !(APP_ROUTES as readonly string[]).includes(r),
    );
    expect(missing).toEqual([]);
  });
  it("has no route the web app no longer defines", () => {
    const stale = APP_ROUTES.filter((r) => !webRoutes.includes(r));
    expect(stale).toEqual([]);
  });
  it("accepts a concrete URL for each web route", () => {
    for (const route of webRoutes) {
      const concrete = route.replace(/:[A-Za-z]+/g, "some-value-1");
      expect({ concrete, known: isKnownAppPath(concrete) }).toEqual({
        concrete,
        known: true,
      });
    }
  });
});

describe("isKnownAppPath", () => {
  it.each([
    "/",
    "/help",
    "/help/",
    "/HELP/AI",
    "/d/spanish-basics-a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "/decks/42/cards/7",
    "/learn/subject-1/lessons/intro/read",
    "/library/courses/official/collections/9",
    "/settings",
  ])("knows %s", (p) => expect(isKnownAppPath(p)).toBe(true));

  it.each([
    "/this-page-does-not-exist",
    "/help/nope",
    "/help/getting-started/extra",
    "/decks",
    "/decks/42",
    "/assets/missing.js",
    "/wp-login.php",
    "/.env",
    "/d/",
    "//",
  ])("does not know %s", (p) => expect(isKnownAppPath(p)).toBe(false));

  it("does not let a parameter swallow a slash", () => {
    expect(isKnownAppPath("/d/a/b")).toBe(false);
  });
  it("does not treat regex characters in a pattern as wildcards", () => {
    expect(isKnownAppPath("/verify-emailX")).toBe(false);
    expect(isKnownAppPath("/app-decks.")).toBe(false);
  });
});
