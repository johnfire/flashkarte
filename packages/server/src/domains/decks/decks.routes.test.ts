import request from "supertest";

jest.mock("./decks.service");
jest.mock("../study/study.service");
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

import * as service from "./decks.service";
import { createApp } from "../../app";
import { ValidationError, NotFoundError } from "../../utils/errors";

const mock = service as jest.Mocked<typeof service>;
const app = createApp();
beforeEach(() => jest.clearAllMocks());

describe("decks routes", () => {
  test("POST /api/decks (paste markdown) -> 201", async () => {
    mock.importDeck.mockResolvedValue({
      id: "d1",
      title: "Test Deck",
      source_filename: null,
      created_at: "x",
      updated_at: "x",
      card_count: 3,
    } as never);

    const res = await request(app)
      .post("/api/decks")
      .send({ markdown: "# Test Deck\n\n**1. Q**\nA\n" });

    expect(res.status).toBe(201);
    expect(res.body.card_count).toBe(3);
    expect(mock.importDeck).toHaveBeenCalledWith(
      "u1",
      "# Test Deck\n\n**1. Q**\nA\n",
      null,
    );
  });

  test("POST /api/decks with zero cards -> 422", async () => {
    mock.importDeck.mockRejectedValue(
      new ValidationError("Deck has no cards — check the Markdown format"),
    );
    const res = await request(app)
      .post("/api/decks")
      .send({ markdown: "# Empty\nno cards" });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  test("GET /api/decks -> 200 list", async () => {
    mock.list.mockResolvedValue([] as never);
    const res = await request(app).get("/api/decks");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("GET /api/decks/:id missing -> 404", async () => {
    mock.get.mockRejectedValue(new NotFoundError("Deck not found"));
    const res = await request(app).get("/api/decks/nope");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  test("POST /api/decks/:id/cards appends -> 201", async () => {
    mock.appendCards.mockResolvedValue({ deck_id: "d1", added: 2 } as never);
    const res = await request(app)
      .post("/api/decks/d1/cards")
      .send({ markdown: "**1. Q**\nA\n\n**2. Q2**\nA2" });
    expect(res.status).toBe(201);
    expect(res.body.added).toBe(2);
    expect(mock.appendCards).toHaveBeenCalledWith(
      "u1",
      "d1",
      "**1. Q**\nA\n\n**2. Q2**\nA2",
    );
  });

  test("POST /api/decks/:id/cards on missing deck -> 404", async () => {
    mock.appendCards.mockRejectedValue(new NotFoundError("Deck not found"));
    const res = await request(app)
      .post("/api/decks/nope/cards")
      .send({ markdown: "**1. Q**\nA" });
    expect(res.status).toBe(404);
  });

  test("PATCH /api/decks/:id toggles isPublic -> 200", async () => {
    mock.update.mockResolvedValue({
      id: "d1",
      title: "Deck",
      source_filename: null,
      created_at: "x",
      updated_at: "x",
      is_public: true,
    } as never);
    const res = await request(app)
      .patch("/api/decks/d1")
      .send({ isPublic: true });
    expect(res.status).toBe(200);
    expect(res.body.is_public).toBe(true);
    expect(mock.update).toHaveBeenCalledWith("u1", "d1", {
      title: undefined,
      isPublic: true,
    });
  });

  test("PATCH /api/decks/:id forwards isOrdered", async () => {
    mock.update.mockResolvedValue({
      id: "d1",
      title: "Deck",
      source_filename: null,
      created_at: "x",
      updated_at: "x",
      is_public: false,
      is_ordered: true,
    } as never);
    const res = await request(app)
      .patch("/api/decks/d1")
      .send({ isOrdered: true });
    expect(res.status).toBe(200);
    expect(res.body.is_ordered).toBe(true);
    expect(mock.update).toHaveBeenCalledWith(
      "u1",
      "d1",
      expect.objectContaining({ isOrdered: true }),
    );
  });
});
