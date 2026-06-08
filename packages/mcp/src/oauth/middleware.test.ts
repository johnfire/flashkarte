process.env.MCP_JWT_SECRET = "test-secret";
import express from "express";
import request from "supertest";
import { createMcpAuthMiddleware } from "./middleware";
import { requestKeyStore } from "../api";
import { signMcpAccessToken } from "./tokens";

function makeApp() {
  const app = express();
  app.use(createMcpAuthMiddleware());
  app.get("/probe", (_req, res) => {
    res.json({ key: requestKeyStore.getStore() ?? null });
  });
  return app;
}

describe("mcp auth middleware", () => {
  test("401s without a credential", async () => {
    const res = await request(makeApp()).get("/probe");
    expect(res.status).toBe(401);
  });

  test("threads a raw fk_ key", async () => {
    const res = await request(makeApp())
      .get("/probe")
      .set("Authorization", "Bearer fk_direct");
    expect(res.status).toBe(200);
    expect(res.body.key).toBe("fk_direct");
  });

  test("threads the fk_ key from a valid OAuth JWT", async () => {
    const token = signMcpAccessToken("fk_fromjwt");
    const res = await request(makeApp())
      .get("/probe")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.key).toBe("fk_fromjwt");
  });

  test("401s on a garbage token", async () => {
    const res = await request(makeApp())
      .get("/probe")
      .set("Authorization", "Bearer garbage.token");
    expect(res.status).toBe(401);
  });
});
