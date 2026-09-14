import request from "supertest";

jest.mock("./categories.service");
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

import * as service from "./categories.service";
import { createApp } from "../../app";
import {
  ValidationError,
  NotFoundError,
  ConflictError,
} from "../../utils/errors";

const mock = service as jest.Mocked<typeof service>;
const app = createApp();

const TREE = [
  {
    id: "cat-1",
    title: "Language Learning",
    parentId: null,
    officialCount: 3,
    publicCount: 0,
    subcategories: [
      {
        id: "cat-2",
        title: "German",
        parentId: "cat-1",
        officialCount: 3,
        publicCount: 0,
        subcategories: [],
      },
    ],
  },
  {
    id: "uncategorized",
    title: "Uncategorized",
    parentId: null,
    officialCount: 1,
    publicCount: 0,
    subcategories: [],
  },
];

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GET /api/categories (browse)", () => {
  test("returns the tree", async () => {
    mock.getTree.mockResolvedValue(TREE as never);
    const res = await request(app).get("/api/categories");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ categories: TREE });
  });
});

describe("GET /api/admin/categories", () => {
  test("returns the tree", async () => {
    mock.getTree.mockResolvedValue(TREE as never);
    const res = await request(app).get("/api/admin/categories");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ categories: TREE });
  });
});

describe("POST /api/admin/categories", () => {
  test("creates a top-level category -> 201", async () => {
    mock.create.mockResolvedValue({
      id: "cat-3",
      title: "AI",
      parentId: null,
    } as never);
    const res = await request(app)
      .post("/api/admin/categories")
      .send({ title: "AI" });
    expect(res.status).toBe(201);
    expect(mock.create).toHaveBeenCalledWith("AI", undefined);
    expect(res.body.category.title).toBe("AI");
  });

  test("propagates a validation error as 422", async () => {
    mock.create.mockRejectedValue(
      new ValidationError("title must not be blank"),
    );
    const res = await request(app)
      .post("/api/admin/categories")
      .send({ title: "" });
    expect(res.status).toBe(422);
    expect(res.body.error.message).toBe("title must not be blank");
  });
});

describe("PATCH /api/admin/categories/:id", () => {
  test("renames a category -> 200", async () => {
    mock.update.mockResolvedValue({
      id: "cat-1",
      title: "Languages",
      parentId: null,
    } as never);
    const res = await request(app)
      .patch("/api/admin/categories/cat-1")
      .send({ title: "Languages" });
    expect(res.status).toBe(200);
    expect(mock.update).toHaveBeenCalledWith("cat-1", "Languages", undefined);
  });

  test("propagates a not-found error as 404", async () => {
    mock.update.mockRejectedValue(new NotFoundError("Category not found"));
    const res = await request(app)
      .patch("/api/admin/categories/missing")
      .send({ title: "x" });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/admin/categories/:id", () => {
  test("deletes an empty category -> 204", async () => {
    mock.remove.mockResolvedValue(undefined);
    const res = await request(app).delete("/api/admin/categories/cat-2");
    expect(res.status).toBe(204);
    expect(mock.remove).toHaveBeenCalledWith("cat-2");
  });

  test("propagates a conflict error as 409", async () => {
    mock.remove.mockRejectedValue(
      new ConflictError(
        "Move or delete its subcategories before deleting this category",
      ),
    );
    const res = await request(app).delete("/api/admin/categories/cat-1");
    expect(res.status).toBe(409);
  });
});
