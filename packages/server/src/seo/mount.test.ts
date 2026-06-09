import express from "express";
import request from "supertest";
import { mountSeo } from "./mount";

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
