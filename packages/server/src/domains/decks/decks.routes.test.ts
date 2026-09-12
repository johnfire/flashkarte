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

  test("POST /api/decks (file upload) -> 201 reads the uploaded buffer", async () => {
    mock.importDeck.mockResolvedValue({
      id: "d2",
      title: "Uploaded Deck",
      source_filename: "deck.md",
      created_at: "x",
      updated_at: "x",
      card_count: 1,
    } as never);

    const markdown = "# Uploaded Deck\n\n**1. Q**\nA\n";
    const res = await request(app)
      .post("/api/decks")
      .attach("file", Buffer.from(markdown, "utf8"), "deck.md");

    expect(res.status).toBe(201);
    // The multipart body reached the controller intact and kept its filename.
    expect(mock.importDeck).toHaveBeenCalledWith("u1", markdown, "deck.md");
  });

  test("POST /api/decks rejects an upload over the 5MB limit", async () => {
    const tooBig = Buffer.alloc(6 * 1024 * 1024, "x");
    const res = await request(app)
      .post("/api/decks")
      .attach("file", tooBig, "huge.md");

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(mock.importDeck).not.toHaveBeenCalled();
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

  test("PATCH /api/decks/:id forwards the speech overrides", async () => {
    mock.update.mockResolvedValue({
      id: "d1",
      title: "Deck",
      source_filename: null,
      created_at: "x",
      updated_at: "x",
      is_public: false,
      is_ordered: false,
      speech_enabled: true,
      speech_front_lang: "de-DE",
      speech_back_lang: "en-GB",
      speech_autoplay: "both",
      speech_rate: 0.8,
    } as never);
    const res = await request(app).patch("/api/decks/d1").send({
      speechEnabled: true,
      speechFrontLang: "de-DE",
      speechBackLang: "en-GB",
      speechAutoplay: "both",
      speechRate: 0.8,
    });
    expect(res.status).toBe(200);
    expect(res.body.speech_front_lang).toBe("de-DE");
    expect(res.body.speech_back_lang).toBe("en-GB");
    expect(mock.update).toHaveBeenCalledWith(
      "u1",
      "d1",
      expect.objectContaining({
        speechEnabled: true,
        speechFrontLang: "de-DE",
        speechBackLang: "en-GB",
        speechAutoplay: "both",
        speechRate: 0.8,
      }),
    );
  });

  // Old-client contract: Android APKs in the field send the pre-Spec-09 shape
  // and must be unaffected by the new columns.
  test("PATCH /api/decks/:id with no speech fields sends them as undefined", async () => {
    mock.update.mockResolvedValue({
      id: "d1",
      title: "Renamed",
      source_filename: null,
      created_at: "x",
      updated_at: "x",
      is_public: false,
      is_ordered: false,
    } as never);
    const res = await request(app)
      .patch("/api/decks/d1")
      .send({ title: "Renamed" });
    expect(res.status).toBe(200);
    const patch = mock.update.mock.calls[0][2] as Record<string, unknown>;
    expect(patch.speechEnabled).toBeUndefined();
    expect(patch.speechFrontLang).toBeUndefined();
    expect(patch.speechRate).toBeUndefined();
  });

  test("GET /api/decks/official -> 200 list", async () => {
    mock.listStandaloneOfficial.mockResolvedValue([
      {
        id: "od1",
        title: "Official Deck",
        created_at: "x",
        card_count: 500,
        subscribed: false,
      },
    ] as never);
    const res = await request(app).get("/api/decks/official?q=foo");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(mock.listStandaloneOfficial).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({ q: "foo" }),
    );
  });

  test("GET /api/decks/official/collections -> 200 list", async () => {
    mock.listCollections.mockResolvedValue([
      {
        id: "c1",
        title: "German for Arabic Speakers",
        description: null,
        deck_count: 6,
      },
    ] as never);
    const res = await request(app).get("/api/decks/official/collections");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(mock.listCollections).toHaveBeenCalled();
  });

  test("GET /api/decks/official/collections/:id -> 200 with decks", async () => {
    mock.getCollectionDecks.mockResolvedValue({
      id: "c1",
      title: "German for Arabic Speakers",
      description: null,
      decks: [],
    } as never);
    const res = await request(app).get("/api/decks/official/collections/c1");
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("German for Arabic Speakers");
    expect(mock.getCollectionDecks).toHaveBeenCalledWith(
      "u1",
      "c1",
      expect.anything(),
    );
  });

  test("GET /api/decks/official/collections/:id missing -> 404", async () => {
    mock.getCollectionDecks.mockRejectedValue(
      new NotFoundError("Collection not found"),
    );
    const res = await request(app).get("/api/decks/official/collections/nope");
    expect(res.status).toBe(404);
  });

  test("POST /api/decks/official/collections/:id/subscribe-all -> 200", async () => {
    mock.subscribeAll.mockResolvedValue(6);
    const res = await request(app).post(
      "/api/decks/official/collections/c1/subscribe-all",
    );
    expect(res.status).toBe(200);
    expect(res.body.subscribed).toBe(6);
    expect(mock.subscribeAll).toHaveBeenCalledWith("u1", "c1");
  });

  test("POST /api/decks/:id/subscribe -> 204", async () => {
    mock.subscribe.mockResolvedValue(undefined);
    const res = await request(app).post("/api/decks/od1/subscribe");
    expect(res.status).toBe(204);
    expect(mock.subscribe).toHaveBeenCalledWith("u1", "od1");
  });

  test("POST /api/decks/:id/subscribe on a non-official deck -> 404", async () => {
    mock.subscribe.mockRejectedValue(
      new NotFoundError("Official deck not found"),
    );
    const res = await request(app).post("/api/decks/d1/subscribe");
    expect(res.status).toBe(404);
  });

  test("DELETE /api/decks/:id/subscribe -> 204", async () => {
    mock.unsubscribe.mockResolvedValue(undefined);
    const res = await request(app).delete("/api/decks/od1/subscribe");
    expect(res.status).toBe(204);
    expect(mock.unsubscribe).toHaveBeenCalledWith("u1", "od1");
  });
});
