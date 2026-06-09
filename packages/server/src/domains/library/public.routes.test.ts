import request from "supertest";

jest.mock("./library.service");
jest.mock("../../db/client", () => ({
  getPool: jest.fn(),
  query: jest.fn(),
  queryOne: jest.fn(),
  closePool: jest.fn(),
}));

import * as service from "./library.service";
import { createApp } from "../../app";

const mock = service as jest.Mocked<typeof service>;
const app = createApp();

describe("public library API", () => {
  it("GET /api/public/library lists decks (no auth)", async () => {
    mock.list.mockResolvedValue([
      { id: "d1", title: "T", author: "A", cardCount: 2, publishedAt: null },
    ]);
    const res = await request(app).get("/api/public/library");
    expect(res.status).toBe(200);
    expect(res.body.decks[0].title).toBe("T");
  });

  it("GET /api/public/library/:id/preview returns fronts only — never backs", async () => {
    mock.getPreview.mockResolvedValue({
      id: "d1",
      title: "T",
      author: "A",
      cardCount: 1,
      publishedAt: null,
      cards: [{ front: "Q1", category: null }],
    });
    const res = await request(app).get("/api/public/library/d1/preview");
    expect(res.status).toBe(200);
    expect(res.body.cards[0].front).toBe("Q1");
    expect(JSON.stringify(res.body)).not.toContain("back");
  });

  it("GET preview 404s for a missing/non-public deck", async () => {
    mock.getPreview.mockResolvedValue(null);
    const res = await request(app).get("/api/public/library/nope/preview");
    expect(res.status).toBe(404);
  });
});
