import express from "express";
import request from "supertest";
import { createDiscoveryRouter } from "./discovery";

const app = express().use(createDiscoveryRouter("https://mcp.example.com"));

describe("oauth discovery", () => {
  test("protected-resource points at the authorization server", async () => {
    const res = await request(app).get("/.well-known/oauth-protected-resource");
    expect(res.status).toBe(200);
    expect(res.body.resource).toBe("https://mcp.example.com/mcp");
    expect(res.body.authorization_servers).toEqual(["https://mcp.example.com"]);
  });

  test("protected-resource also matches a subpath (RFC 9728 §3)", async () => {
    const res = await request(app).get(
      "/.well-known/oauth-protected-resource/mcp",
    );
    expect(res.status).toBe(200);
  });

  test("authorization-server advertises S256 + endpoints", async () => {
    const res = await request(app).get(
      "/.well-known/oauth-authorization-server",
    );
    expect(res.status).toBe(200);
    expect(res.body.code_challenge_methods_supported).toContain("S256");
    expect(res.body.authorization_endpoint).toBe(
      "https://mcp.example.com/oauth/authorize",
    );
    expect(res.body.token_endpoint).toBe("https://mcp.example.com/oauth/token");
  });
});
