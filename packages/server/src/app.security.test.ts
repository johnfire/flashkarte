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

describe("metrics endpoint", () => {
  const originalMetricsToken = process.env.METRICS_TOKEN;

  afterEach(() => {
    if (originalMetricsToken) process.env.METRICS_TOKEN = originalMetricsToken;
    else delete process.env.METRICS_TOKEN;
  });

  it("does not expose metrics without a configured token", async () => {
    delete process.env.METRICS_TOKEN;
    const response = await request(app).get("/metrics");
    expect(response.status).toBe(404);
  });

  it("serves metrics to a caller holding the configured token", async () => {
    process.env.METRICS_TOKEN = "metrics-test-token";
    const response = await request(app)
      .get("/metrics")
      .set("Authorization", "Bearer metrics-test-token");
    expect(response.status).toBe(200);
    expect(response.text).toContain("flashkarte_http_requests_total");
  });

  it("rejects a token of the correct length but wrong content", async () => {
    process.env.METRICS_TOKEN = "metrics-test-token";
    const response = await request(app)
      .get("/metrics")
      .set("Authorization", "Bearer XXXXXXXXXXXXXXXXXX"); // 18 chars, same length
    expect(response.status).toBe(404);
  });
});
