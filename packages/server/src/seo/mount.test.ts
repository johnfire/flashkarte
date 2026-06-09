import express from "express";
import request from "supertest";
import { mountSeo } from "./mount";
import { deckSlug } from "@flashkarte/shared";

const TEMPLATE = `<!doctype html><html><head><title>flashkarte</title></head><body><div id="root"></div></body></html>`;

function app() {
  const a = express();
  mountSeo(a, {
    template: TEMPLATE,
    sitemapUrls: () => [{ loc: "https://flashkarte.christopherrehm.de/" }],
  });
  return a;
}

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
    expect(res.text).toContain(
      'href="https://flashkarte.christopherrehm.de/privacy"',
    );
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
    sitemapUrls: () => [{ loc: "https://flashkarte.christopherrehm.de/" }],
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
});
