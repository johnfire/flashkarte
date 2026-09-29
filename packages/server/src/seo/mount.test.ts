import express from "express";
import request from "supertest";
import { mountSeo } from "./mount";
import { HELP_PATHS } from "./meta";
import { deckSlug } from "@flashkarte/shared";

const TEMPLATE = `<!doctype html><html><head><title>LearnWohl</title></head><body><div id="root"></div></body></html>`;

function app() {
  const a = express();
  mountSeo(a, {
    template: TEMPLATE,
    sitemapUrls: () => [{ loc: "https://learnwohl.app/" }],
  });
  return a;
}

describe("mountSeo www redirect", () => {
  it("301s www.<domain> to the canonical host, keeping path and query", async () => {
    const res = await request(app())
      .get("/help/ai?utm_source=x")
      .set("Host", "www.learnwohl.app");
    expect(res.status).toBe(301);
    expect(res.headers.location).toBe(
      "https://learnwohl.app/help/ai?utm_source=x",
    );
  });
  it("redirects the home page and HEAD requests too", async () => {
    const home = await request(app()).get("/").set("Host", "www.learnwohl.app");
    expect(home.headers.location).toBe("https://learnwohl.app/");
    const head = await request(app())
      .head("/explore")
      .set("Host", "WWW.LearnWohl.app");
    expect(head.status).toBe(301);
  });
  it("does not redirect the canonical host", async () => {
    const res = await request(app()).get("/").set("Host", "learnwohl.app");
    expect(res.status).toBe(200);
  });
  it("does not redirect other hosts or lookalikes", async () => {
    for (const host of [
      "localhost:3001",
      "www.evil.test",
      "wwwlearnwohl.app",
      "www.learnwohl.app.evil.test",
    ]) {
      const res = await request(app()).get("/").set("Host", host);
      expect({ host, status: res.status }).toEqual({ host, status: 200 });
    }
  });
  it("leaves POST alone (a redirect would turn it into a GET)", async () => {
    const res = await request(app())
      .post("/sitemap.xml")
      .set("Host", "www.learnwohl.app");
    expect(res.status).not.toBe(301);
  });
  it("follows SITE_ORIGIN, and cannot loop when it names a www host", async () => {
    const previous = process.env.SITE_ORIGIN;
    try {
      process.env.SITE_ORIGIN = "https://example.org";
      const moved = await request(app())
        .get("/x")
        .set("Host", "www.example.org");
      expect(moved.headers.location).toBe("https://example.org/x");

      process.env.SITE_ORIGIN = "https://www.example.org";
      const same = await request(app()).get("/").set("Host", "www.example.org");
      expect(same.status).toBe(200); // already canonical: no redirect, no loop
    } finally {
      if (previous === undefined) delete process.env.SITE_ORIGIN;
      else process.env.SITE_ORIGIN = previous;
    }
  });
});

describe("mountSeo", () => {
  it("GET / injects home meta + JSON-LD", async () => {
    const res = await request(app()).get("/");
    expect(res.status).toBe(200);
    expect(res.text).toContain('rel="canonical"');
    expect(res.text).toContain("WebApplication");
    expect(res.headers["content-type"]).toMatch(/html/);
  });
  it("GET /privacy injects privacy canonical", async () => {
    const res = await request(app()).get("/privacy");
    expect(res.text).toContain('href="https://learnwohl.app/privacy"');
  });
  it("GET /help/getting-started serves its own single title, canonical and OG url", async () => {
    const res = await request(app()).get("/help/getting-started");
    expect(res.status).toBe(200);
    expect(res.text.match(/<title>/g)).toHaveLength(1);
    expect(res.text).toContain(
      "<title>Getting started — LearnWohl Help</title>",
    );
    expect(res.text).toContain(
      'href="https://learnwohl.app/help/getting-started"',
    );
    expect(res.text).toContain(
      'content="https://learnwohl.app/help/getting-started"',
    );
  });
  it("serves every help page with distinct meta", async () => {
    const titles = new Set<string>();
    for (const p of HELP_PATHS) {
      const res = await request(app()).get(p);
      expect(res.status).toBe(200);
      titles.add(res.text.match(/<title>(.*?)<\/title>/)![1]);
    }
    expect(titles.size).toBe(HELP_PATHS.length);
  });
  it("GET /guide 301-redirects to /help (a real redirect, not a JS one)", async () => {
    const res = await request(app()).get("/guide");
    expect(res.status).toBe(301);
    expect(res.headers.location).toBe("/help");
  });
  it("GET /welcome 301-redirects to /", async () => {
    const res = await request(app()).get("/welcome");
    expect(res.status).toBe(301);
    expect(res.headers.location).toBe("/");
  });
  it("GET /sitemap.xml returns XML urlset", async () => {
    const res = await request(app()).get("/sitemap.xml");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/xml/);
    expect(res.text).toContain("<urlset");
  });
});

const PREVIEW = {
  id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  title: "Spanish Basics",
  author: "Chris",
  cardCount: 1,
  publishedAt: null,
  cards: [{ front: "hola", category: null }],
};

function deckApp() {
  const a = express();
  mountSeo(a, {
    template: TEMPLATE,
    sitemapUrls: () => [{ loc: "https://learnwohl.app/" }],
    getDeckPreview: async (id: string) => (id === PREVIEW.id ? PREVIEW : null),
  });
  return a;
}

describe("mountSeo deck pages", () => {
  it("GET /explore injects explore meta", async () => {
    const res = await request(deckApp()).get("/explore");
    expect(res.status).toBe(200);
    expect(res.text).toContain("Explore public flashcard decks");
  });
  it("GET /d/:slug injects deck meta + question list", async () => {
    const slug = deckSlug(PREVIEW.title, PREVIEW.id);
    const res = await request(deckApp()).get(`/d/${slug}`);
    expect(res.status).toBe(200);
    expect(res.text).toContain("LearningResource");
    expect(res.text).toContain("hola");
  });
  it("301s a non-canonical slug to the canonical path", async () => {
    const res = await request(deckApp()).get(`/d/wrong-title-${PREVIEW.id}`);
    expect(res.status).toBe(301);
    expect(res.headers.location).toBe(
      `/d/${deckSlug(PREVIEW.title, PREVIEW.id)}`,
    );
  });
  it("404 + noindex for an unknown deck", async () => {
    const res = await request(deckApp()).get(
      "/d/x-00000000-0000-0000-0000-000000000000",
    );
    expect(res.status).toBe(404);
    expect(res.text).toContain('name="robots" content="noindex"');
  });
  it("404 when the slug has no UUID", async () => {
    const res = await request(deckApp()).get("/d/not-a-real-slug");
    expect(res.status).toBe(404);
  });
  it("returns 500 when the deck lookup throws", async () => {
    const a = express();
    mountSeo(a, {
      template: TEMPLATE,
      sitemapUrls: () => [],
      getDeckPreview: async () => {
        throw new Error("db down");
      },
    });
    const res = await request(a).get(
      "/d/x-a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    );
    expect(res.status).toBe(500);
  });
});
