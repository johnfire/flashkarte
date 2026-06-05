import request from "supertest";

jest.mock("./library.service");
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
  requireAdmin: (
    _req: import("express").Request,
    _res: import("express").Response,
    next: import("express").NextFunction,
  ) => next(),
}));

import * as service from "./library.service";
import { createApp } from "../../app";
import { NotFoundError } from "../../utils/errors";

const mock = service as jest.Mocked<typeof service>;
const app = createApp();
beforeEach(() => jest.clearAllMocks());

describe("library routes", () => {
  test("GET /api/library -> 200 with decks", async () => {
    mock.list.mockResolvedValue([
      {
        id: "d1",
        title: "AI Terms",
        author: "Chris",
        cardCount: 50,
        publishedAt: "2026-06-05T00:00:00.000Z",
      },
    ]);
    const res = await request(app).get("/api/library?q=ai");
    expect(res.status).toBe(200);
    expect(res.body.decks[0].title).toBe("AI Terms");
    expect(mock.list).toHaveBeenCalledWith("ai");
  });

  test("GET /api/library/:id -> 200 with cards", async () => {
    mock.get.mockResolvedValue({
      id: "d1",
      title: "AI Terms",
      author: "Chris",
      cardCount: 1,
      publishedAt: null,
      cards: [{ front: "AI", back: "Artificial Intelligence", category: null }],
    } as never);
    const res = await request(app).get("/api/library/d1");
    expect(res.status).toBe(200);
    expect(res.body.cards).toHaveLength(1);
  });

  test("GET /api/library/:id missing -> 404", async () => {
    mock.get.mockRejectedValue(new NotFoundError("Deck not found"));
    const res = await request(app).get("/api/library/nope");
    expect(res.status).toBe(404);
  });

  test("POST /api/library/:id/clone -> 201", async () => {
    mock.clone.mockResolvedValue({
      id: "new1",
      title: "AI Terms",
      card_count: 50,
    });
    const res = await request(app).post("/api/library/d1/clone");
    expect(res.status).toBe(201);
    expect(res.body.id).toBe("new1");
    expect(mock.clone).toHaveBeenCalledWith("u1", "d1");
  });
});
