import fs from "fs";
import os from "os";
import path from "path";
import request from "supertest";

jest.mock("./db/client", () => ({
  getPool: jest.fn(),
  query: jest.fn(),
  queryOne: jest.fn(),
  closePool: jest.fn(),
}));
jest.mock("./domains/library/library.service");

import { configureProductionWeb } from "./app";
import express from "express";
import * as libraryService from "./domains/library/library.service";
import { deckSlug } from "@flashkarte/shared";
import { HELP_PATHS } from "./seo/meta";

const libMock = libraryService as jest.Mocked<typeof libraryService>;
const PREVIEW = {
  id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  referenceNumber: 1,
  title: "Spanish Basics",
  author: "Chris",
  cardCount: 1,
  publishedAt: null,
  cards: [{ front: "hola", category: null }],
};

describe("production web + SEO wiring", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fk-web-"));
  beforeAll(() => {
    fs.writeFileSync(
      path.join(dir, "index.html"),
      `<!doctype html><html><head><title>flashkarte</title></head><body><div id="root"></div></body></html>`,
    );
    fs.writeFileSync(path.join(dir, "robots.txt"), "User-agent: *\nAllow: /\n");
  });

  function app() {
    const a = express();
    configureProductionWeb(a, dir);
    return a;
  }

  it("injects meta on /", async () => {
    const res = await request(app()).get("/");
    expect(res.status).toBe(200);
    expect(res.text).toContain('rel="canonical"');
  });
  it("serves robots.txt statically", async () => {
    const res = await request(app()).get("/robots.txt");
    expect(res.status).toBe(200);
    expect(res.text).toContain("User-agent");
  });
  it("serves SPA fallback (no injection) for unknown app route", async () => {
    const res = await request(app()).get("/settings");
    expect(res.status).toBe(200);
    expect(res.text).toContain('<div id="root"></div>');
  });
});

describe("production deck SEO wiring", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fk-web-deck-"));
  beforeAll(() => {
    fs.writeFileSync(
      path.join(dir, "index.html"),
      `<!doctype html><html><head><title>flashkarte</title></head><body><div id="root"></div></body></html>`,
    );
  });

  function app() {
    const a = express();
    configureProductionWeb(a, dir);
    return a;
  }

  it("serves /d/:slug with injected deck meta", async () => {
    libMock.getPreview.mockResolvedValue(PREVIEW);
    const res = await request(app()).get(
      `/d/${deckSlug(PREVIEW.title, PREVIEW.id)}`,
    );
    expect(res.status).toBe(200);
    expect(res.text).toContain("LearningResource");
  });
  it("sitemap includes public deck URLs", async () => {
    libMock.list.mockResolvedValue([
      {
        id: PREVIEW.id,
        referenceNumber: PREVIEW.referenceNumber,
        title: PREVIEW.title,
        author: "Chris",
        cardCount: 1,
        publishedAt: null,
        categoryId: null,
        contentLanguage: null,
      },
    ]);
    const res = await request(app()).get("/sitemap.xml");
    expect(res.status).toBe(200);
    expect(res.text).toContain(`/d/${deckSlug(PREVIEW.title, PREVIEW.id)}`);
  });
  it("sitemap lists the help center and no longer lists the /guide redirect", async () => {
    libMock.list.mockResolvedValue([]);
    const res = await request(app()).get("/sitemap.xml");
    expect(res.status).toBe(200);
    for (const p of HELP_PATHS) {
      expect(res.text).toContain(`<loc>https://learnwohl.app${p}</loc>`);
    }
    expect(res.text).not.toContain("/guide");
  });
  it("serves /llms.txt as UTF-8 plain text listing public decks", async () => {
    libMock.list.mockResolvedValue([
      {
        id: PREVIEW.id,
        referenceNumber: PREVIEW.referenceNumber,
        title: PREVIEW.title,
        author: "Chris",
        cardCount: 1,
        publishedAt: null,
        categoryId: null,
        contentLanguage: null,
      },
    ]);
    const res = await request(app()).get("/llms.txt");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("text/plain; charset=utf-8");
    expect(res.text).toContain("# LearnWohl");
    expect(res.text).toContain(`/d/${deckSlug(PREVIEW.title, PREVIEW.id)}`);
  });
});
