import request from "supertest";

jest.mock("./db/client", () => ({
  getPool: jest.fn(),
  query: jest.fn(),
  queryOne: jest.fn(),
  closePool: jest.fn(),
}));

import { createApp } from "./app";

const app = createApp();

describe("Content-Security-Policy", () => {
  it("allowlists the Umami analytics origin for script-src and connect-src", async () => {
    const res = await request(app).get("/health");
    const csp = res.headers["content-security-policy"];
    expect(csp).toBeDefined();

    const directive = (name: string) =>
      csp
        .split(";")
        .map((d: string) => d.trim())
        .find((d: string) => d.startsWith(`${name} `)) ?? "";

    expect(directive("script-src")).toContain("'self'");
    expect(directive("script-src")).toContain(
      "https://stats.christopherrehm.de",
    );
    expect(directive("connect-src")).toContain("'self'");
    expect(directive("connect-src")).toContain(
      "https://stats.christopherrehm.de",
    );
  });
});
