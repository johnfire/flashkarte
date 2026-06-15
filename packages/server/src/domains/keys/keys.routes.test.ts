import request from "supertest";

jest.mock("./keys.service");
jest.mock("../../db/client", () => ({
  getPool: jest.fn(),
  query: jest.fn(),
  queryOne: jest.fn(),
  closePool: jest.fn(),
}));
jest.mock("../../middleware/auth", () => ({
  requireFullScope: (
    _req: import("express").Request,
    _res: import("express").Response,
    next: import("express").NextFunction,
  ) => next(),
  requireAuth: (
    req: import("express").Request,
    _res: import("express").Response,
    next: import("express").NextFunction,
  ) => {
    req.userId = "u1";
    next();
  },
  requireAdmin: (
    _req: import("express").Request,
    _res: import("express").Response,
    next: import("express").NextFunction,
  ) => next(),
}));

import * as service from "./keys.service";
import { createApp } from "../../app";
import { NotFoundError } from "../../utils/errors";

const mock = service as jest.Mocked<typeof service>;
const app = createApp();
beforeEach(() => jest.clearAllMocks());

describe("keys routes", () => {
  test("POST /api/keys -> 201 returns the raw key once", async () => {
    mock.createKey.mockResolvedValue({
      key: "fk_abcdef",
      name: "MCP",
      key_prefix: "fk_abcdef12",
      created_at: "x",
    } as never);
    const res = await request(app).post("/api/keys").send({ name: "MCP" });
    expect(res.status).toBe(201);
    expect(res.body.key).toBe("fk_abcdef");
    expect(mock.createKey).toHaveBeenCalledWith("u1", "MCP", undefined);
  });

  test("GET /api/keys -> 200 never includes raw keys", async () => {
    mock.listKeys.mockResolvedValue([
      { name: "MCP", key_prefix: "fk_abcdef12", created_at: "x" },
    ] as never);
    const res = await request(app).get("/api/keys");
    expect(res.status).toBe(200);
    expect(res.body[0].key_prefix).toBe("fk_abcdef12");
    expect(res.body[0].key).toBeUndefined();
  });

  test("DELETE /api/keys/:prefix -> 204", async () => {
    mock.revokeKey.mockResolvedValue(undefined as never);
    const res = await request(app).delete("/api/keys/fk_abcdef12");
    expect(res.status).toBe(204);
    expect(mock.revokeKey).toHaveBeenCalledWith("u1", "fk_abcdef12");
  });

  test("DELETE unknown prefix -> 404", async () => {
    mock.revokeKey.mockRejectedValue(new NotFoundError("API key not found"));
    const res = await request(app).delete("/api/keys/fk_nope");
    expect(res.status).toBe(404);
  });
});
