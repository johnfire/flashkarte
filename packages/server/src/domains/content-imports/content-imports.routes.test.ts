import request from "supertest";

jest.mock("./content-imports.service");
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

import { createApp } from "../../app";
import * as service from "./content-imports.service";

const mockedService = service as jest.Mocked<typeof service>;
const app = createApp();

beforeEach(() => jest.clearAllMocks());

describe("content import routes", () => {
  test("imports a deck from a CSV upload", async () => {
    mockedService.importDeckCsv.mockResolvedValue({
      id: "d1",
      title: "French basics",
      card_count: 2,
    } as never);

    const response = await request(app)
      .post("/api/imports/deck-csv")
      .field("contentLanguage", "en")
      .attach(
        "file",
        Buffer.from("front,answer\nBonjour,Hello\n"),
        "french.csv",
      );

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ id: "d1", card_count: 2 });
    expect(mockedService.importDeckCsv).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({ originalname: "french.csv" }),
      undefined,
      "en",
    );
  });

  test("rejects a non-CSV deck upload before it reaches the service", async () => {
    const response = await request(app)
      .post("/api/imports/deck-csv")
      .attach("file", Buffer.from("not a CSV"), "deck.txt");

    expect(response.status).toBe(422);
    expect(mockedService.importDeckCsv).not.toHaveBeenCalled();
  });

  test("imports a course workbook", async () => {
    mockedService.importFlashcardCourse.mockResolvedValue({
      course: { id: "c1", title: "French A1" },
      decks_imported: 2,
    } as never);

    const response = await request(app)
      .post("/api/imports/flashcard-course")
      .attach("file", Buffer.from("workbook contents"), "french.xlsx");

    expect(response.status).toBe(201);
    expect(response.body.decks_imported).toBe(2);
    expect(mockedService.importFlashcardCourse).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({ originalname: "french.xlsx" }),
      undefined,
    );
  });
});
