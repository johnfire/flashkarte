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

import { configureProductionWeb } from "./app";
import express from "express";

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
