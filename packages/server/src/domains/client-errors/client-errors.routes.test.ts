import request from "supertest";

jest.mock("./client-errors.service");
jest.mock("../../db/client", () => ({
  getPool: jest.fn(),
  query: jest.fn(),
  queryOne: jest.fn(),
  closePool: jest.fn(),
}));
jest.mock("../../middleware/auth", () => ({
  requireAuth: (
    req: import("express").Request,
    _res: import("express").Response,
    next: import("express").NextFunction,
  ) => {
    req.userId = "u1";
    next();
  },
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
  });
});
