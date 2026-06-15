import request from "supertest";

jest.mock("./study.service");
jest.mock("../decks/decks.service");
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

import * as service from "./study.service";
import { createApp } from "../../app";
import { ValidationError, NotFoundError } from "../../utils/errors";

const mock = service as jest.Mocked<typeof service>;
const app = createApp();
beforeEach(() => jest.clearAllMocks());

describe("study routes", () => {
  test("POST /api/study/review -> 200 with new state", async () => {
    mock.review.mockResolvedValue({
      card_id: "c1",
      easiness: 2.5,
      interval: 1,
      repetitions: 1,
      due_at: "2026-06-05T00:00:00.000Z",
    } as never);

    const res = await request(app)
      .post("/api/study/review")
      .send({ card_id: "c1", rating: 4 });

    expect(res.status).toBe(200);
    expect(res.body.interval).toBe(1);
    expect(mock.review).toHaveBeenCalledWith("u1", "c1", 4);
  });

  test("POST /api/study/review with rating 6 -> 422", async () => {
    mock.review.mockRejectedValue(
      new ValidationError("rating must be an integer 1-5"),
    );
    const res = await request(app)
      .post("/api/study/review")
      .send({ card_id: "c1", rating: 6 });
    expect(res.status).toBe(422);
  });

  test("POST /api/study/review unknown card -> 404", async () => {
    mock.review.mockRejectedValue(new NotFoundError("Card not found"));
    const res = await request(app)
      .post("/api/study/review")
      .send({ card_id: "nope", rating: 3 });
    expect(res.status).toBe(404);
  });

  test("GET /api/decks/:id/stats -> 200 with counts", async () => {
    mock.stats.mockResolvedValue({
      total: 3,
      new: 1,
      due: 2,
      learned: 1,
    } as never);
    const res = await request(app).get("/api/decks/d1/stats");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ total: 3, new: 1, due: 2, learned: 1 });
  });

  test("POST /api/study/sync -> 200 with acked + progress", async () => {
    mock.sync.mockResolvedValue({
      acked_event_ids: ["e1"],
      progress: [
        {
          card_id: "c1",
          easiness: 2.5,
          interval: 1,
          repetitions: 1,
          due_at: "2026-06-06T00:00:00.000Z",
          last_rating: 4,
        },
      ],
    } as never);

    const res = await request(app)
      .post("/api/study/sync")
      .send({
        events: [
          {
            event_id: "e1",
            card_id: "c1",
            rating: 4,
            reviewed_at: "2026-06-05T09:00:00.000Z",
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.acked_event_ids).toEqual(["e1"]);
    expect(mock.sync).toHaveBeenCalledWith("u1", [
      {
        event_id: "e1",
        card_id: "c1",
        rating: 4,
        reviewed_at: "2026-06-05T09:00:00.000Z",
      },
    ]);
  });
});
