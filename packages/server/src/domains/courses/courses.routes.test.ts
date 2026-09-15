import request from "supertest";

jest.mock("./courses.service");
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

import * as service from "./courses.service";
import { createApp } from "../../app";
import { ValidationError, NotFoundError } from "../../utils/errors";

const mock = service as jest.Mocked<typeof service>;
const app = createApp();
beforeEach(() => jest.clearAllMocks());

const course = {
  id: "c1",
  user_id: "u1",
  title: "My Course",
  description: null,
  is_public: false,
  created_at: "x",
  updated_at: "x",
};

describe("courses routes", () => {
  test("POST /api/courses -> 201", async () => {
    mock.createCourse.mockResolvedValue(course as never);
    const res = await request(app)
      .post("/api/courses")
      .send({ title: "My Course" });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe("c1");
  });

  test("POST /api/courses with a blank title -> 422", async () => {
    mock.createCourse.mockRejectedValue(
      new ValidationError("Title is required"),
    );
    const res = await request(app).post("/api/courses").send({ title: "" });
    expect(res.status).toBe(422);
  });

  test("GET /api/courses -> 200 with the caller's courses", async () => {
    mock.listCourses.mockResolvedValue([
      { ...course, decks_total: 2, decks_mastered: 1 },
    ] as never);
    const res = await request(app).get("/api/courses");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  test("GET /api/courses/:id -> 404 when not found", async () => {
    mock.getCourse.mockRejectedValue(new NotFoundError("Course not found"));
    const res = await request(app).get("/api/courses/nope");
    expect(res.status).toBe(404);
  });

  test("PATCH /api/courses/:id -> 200", async () => {
    mock.updateCourse.mockResolvedValue({
      ...course,
      is_public: true,
    } as never);
    const res = await request(app)
      .patch("/api/courses/c1")
      .send({ isPublic: true });
    expect(res.status).toBe(200);
    expect(mock.updateCourse).toHaveBeenCalledWith("u1", "c1", {
      title: undefined,
      description: undefined,
      isPublic: true,
    });
  });

  test("DELETE /api/courses/:id -> 204", async () => {
    mock.deleteCourse.mockResolvedValue(undefined);
    const res = await request(app).delete("/api/courses/c1");
    expect(res.status).toBe(204);
  });

  test("POST /api/courses/:id/decks -> 201", async () => {
    mock.addDeckToCourse.mockResolvedValue({
      course_id: "c1",
      deck_id: "d1",
    });
    const res = await request(app)
      .post("/api/courses/c1/decks")
      .send({ deck_id: "d1" });
    expect(res.status).toBe(201);
    expect(mock.addDeckToCourse).toHaveBeenCalledWith("u1", "c1", "d1");
  });

  test("POST /api/courses/:id/decks with a duplicate deck -> 422", async () => {
    mock.addDeckToCourse.mockRejectedValue(
      new ValidationError("That deck is already in this course"),
    );
    const res = await request(app)
      .post("/api/courses/c1/decks")
      .send({ deck_id: "d1" });
    expect(res.status).toBe(422);
  });

  test("DELETE /api/courses/:id/decks/:deckId -> 204", async () => {
    mock.removeDeckFromCourse.mockResolvedValue(undefined);
    const res = await request(app).delete("/api/courses/c1/decks/d1");
    expect(res.status).toBe(204);
    expect(mock.removeDeckFromCourse).toHaveBeenCalledWith("u1", "c1", "d1");
  });

  test("PATCH /api/courses/:id/decks/reorder -> 200", async () => {
    mock.reorderCourseDecks.mockResolvedValue({
      course_id: "c1",
      order: ["d2", "d1"],
    });
    const res = await request(app)
      .patch("/api/courses/c1/decks/reorder")
      .send({ order: ["d2", "d1"] });
    expect(res.status).toBe(200);
    expect(res.body.order).toEqual(["d2", "d1"]);
  });

  test("PATCH /api/courses/:id/decks/reorder with a mismatched set -> 422", async () => {
    mock.reorderCourseDecks.mockRejectedValue(
      new ValidationError("no more and no fewer"),
    );
    const res = await request(app)
      .patch("/api/courses/c1/decks/reorder")
      .send({ order: ["d1"] });
    expect(res.status).toBe(422);
  });
});
