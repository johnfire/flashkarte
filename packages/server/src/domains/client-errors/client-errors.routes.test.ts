import request from "supertest";

jest.mock("./client-errors.service");
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
  requireVerified: (
    _req: import("express").Request,
    _res: import("express").Response,
    next: import("express").NextFunction,
  ) => next(),
  requireAdmin: (
    _req: import("express").Request,
    _res: import("express").Response,
    next: import("express").NextFunction,
  ) => next(),
}));

import * as service from "./client-errors.service";
import { createApp } from "../../app";

const mock = service as jest.Mocked<typeof service>;
const app = createApp();
beforeEach(() => jest.clearAllMocks());

describe("client-errors route (public)", () => {
  test("POST /api/client-errors -> 202 and records", async () => {
    const res = await request(app)
      .post("/api/client-errors")
      .send({ app: "web", message: "boom", context: "Study" });
    expect(res.status).toBe(202);
    expect(res.body).toEqual({ status: "accepted" });
    expect(mock.recordClientError).toHaveBeenCalledWith(
      expect.objectContaining({ app: "web", message: "boom" }),
    );
  });

  test("defaults app to 'unknown' and 422 on missing message", async () => {
    const ok = await request(app)
      .post("/api/client-errors")
      .send({ message: "x" });
    expect(ok.status).toBe(202);
    expect(mock.recordClientError).toHaveBeenCalledWith(
      expect.objectContaining({ app: "unknown" }),
    );

    const bad = await request(app).post("/api/client-errors").send({});
    expect(bad.status).toBe(422);
    expect(bad.body.error.message).toBe("message is required");
  });

  test("rejects blank and non-string messages consistently", async () => {
    for (const message of ["   ", 42]) {
      const response = await request(app)
        .post("/api/client-errors")
        .send({ message });
      expect(response.status).toBe(422);
      expect(response.body.error.message).toBe("message is required");
    }
    expect(mock.recordClientError).not.toHaveBeenCalled();
  });
});
