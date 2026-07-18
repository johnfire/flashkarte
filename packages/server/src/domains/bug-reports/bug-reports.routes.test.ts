import request from "supertest";

jest.mock("./bug-reports.service");
jest.mock("../auth/auth.service", () => ({
  getCurrentUser: jest.fn(),
}));
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

import * as service from "./bug-reports.service";
import { getCurrentUser } from "../auth/auth.service";
import { createApp } from "../../app";

const mockService = service as jest.Mocked<typeof service>;
const mockGetUser = getCurrentUser as jest.Mock;
const app = createApp();

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUser.mockResolvedValue({ id: "u1", email: "bug@reporter.test" });
  mockService.submitBugReport.mockResolvedValue({
    issueUrl: "https://github.com/johnfire/flashkarte/issues/99",
  });
});

describe("bug-reports route", () => {
  test("POST /api/bug-reports -> 201 and files the report with reporter email", async () => {
    const res = await request(app).post("/api/bug-reports").send({
      title: "Crash on study",
      description: "It blew up",
      appVersion: "1.2.3",
    });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      issueUrl: "https://github.com/johnfire/flashkarte/issues/99",
    });
    expect(mockService.submitBugReport).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Crash on study",
        description: "It blew up",
        email: "bug@reporter.test",
        userId: "u1",
      }),
    );
  });

  test("422 when title missing", async () => {
    const res = await request(app)
      .post("/api/bug-reports")
      .send({ description: "no title here" });
    expect(res.status).toBe(422);
    expect(res.body.error.message).toBe("title is required");
    expect(mockService.submitBugReport).not.toHaveBeenCalled();
  });

  test("422 when description is blank", async () => {
    const res = await request(app)
      .post("/api/bug-reports")
      .send({ title: "Missing details", description: "   " });

    expect(res.status).toBe(422);
    expect(res.body.error.message).toBe("description is required");
    expect(mockService.submitBugReport).not.toHaveBeenCalled();
  });
});
