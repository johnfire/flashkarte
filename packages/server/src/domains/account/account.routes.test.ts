import request from "supertest";

jest.mock("./account.service");
jest.mock("../audit/audit.service");
jest.mock("../../db/client", () => ({
  getPool: jest.fn(),
  query: jest.fn(),
  queryOne: jest.fn(),
  closePool: jest.fn(),
}));
jest.mock("../../middleware/auth", () => ({
  requireFullScope: (
    req: import("express").Request,
    res: import("express").Response,
    next: import("express").NextFunction,
  ) => {
    if (req.keyScope === "deck") {
      res.status(403).json({
        error: { code: "FORBIDDEN", message: "Full-scope credential required" },
      });
      return;
    }
    next();
  },
  requireAuth: (
    req: import("express").Request,
    res: import("express").Response,
    next: import("express").NextFunction,
  ) => {
    const header = req.headers.authorization;
    if (!header) {
      res
        .status(401)
        .json({ error: { code: "AUTH_ERROR", message: "Missing token" } });
      return;
    }
    req.userId = "u1";
    if (header === "Bearer deck-key") req.keyScope = "deck";
    next();
  },
  requireAdmin: (
    _req: import("express").Request,
    _res: import("express").Response,
    next: import("express").NextFunction,
  ) => next(),
}));

import * as service from "./account.service";
import { auditFromRequest } from "../audit/audit.service";
import { createApp } from "../../app";

const mock = service as jest.Mocked<typeof service>;
const mockAudit = auditFromRequest as jest.MockedFunction<
  typeof auditFromRequest
>;
const app = createApp();
beforeEach(() => {
  jest.clearAllMocks();
  mockAudit.mockResolvedValue(undefined);
});

const sampleExport = {
  exportedAt: "2026-07-16T00:00:00.000Z",
  profile: {
    email: "a@b.c",
    displayName: null,
    role: "user",
    accountType: "free",
    language: null,
    emailVerifiedAt: null,
    createdAt: "c",
  },
  decks: [],
  cardProgress: [],
  reviewEvents: [],
  apiKeys: [],
};

describe("GET /api/account/export", () => {
  test("401 without authentication", async () => {
    const res = await request(app).get("/api/account/export");
    expect(res.status).toBe(401);
    expect(mock.exportData).not.toHaveBeenCalled();
  });

  test("403 for deck-scoped MCP keys", async () => {
    const res = await request(app)
      .get("/api/account/export")
      .set("Authorization", "Bearer deck-key");
    expect(res.status).toBe(403);
    expect(mock.exportData).not.toHaveBeenCalled();
  });

  test("200 returns the export as an attachment and audits it", async () => {
    mock.exportData.mockResolvedValue(sampleExport as never);
    const res = await request(app)
      .get("/api/account/export")
      .set("Authorization", "Bearer jwt");
    expect(res.status).toBe(200);
    expect(res.body.profile.email).toBe("a@b.c");
    expect(res.headers["content-disposition"]).toBe(
      'attachment; filename="flashkarte-export-2026-07-16.json"',
    );
    expect(mock.exportData).toHaveBeenCalledWith("u1");
    expect(mockAudit).toHaveBeenCalledWith(
      expect.anything(),
      "account.data_exported",
      "user",
      "u1",
    );
  });
});
