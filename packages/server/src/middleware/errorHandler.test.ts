import { Request, Response } from "express";
jest.mock("../domains/audit/audit.service", () => ({
  auditFromRequest: jest.fn(),
}));

import { errorHandler } from "./errorHandler";
import { NotFoundError } from "../utils/errors";
import { auditFromRequest } from "../domains/audit/audit.service";

function run(err: Error) {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const res = { status } as unknown as Response;
  errorHandler(
    err,
    { method: "GET", originalUrl: "/x" } as Request,
    res,
    jest.fn(),
  );
  return { status, json };
}

describe("errorHandler", () => {
  test("maps AppError to its http status + code", () => {
    const { status, json } = run(new NotFoundError("Deck not found"));
    expect(status).toHaveBeenCalledWith(404);
    expect(json.mock.calls[0][0].error.message).toBe("Deck not found");
  });

  test("maps Postgres 22P02 (malformed id) to 404, not 500", () => {
    const pgErr = Object.assign(
      new Error("invalid input syntax for type uuid"),
      {
        code: "22P02",
      },
    );
    const { status, json } = run(pgErr);
    expect(status).toHaveBeenCalledWith(404);
    expect(json.mock.calls[0][0].error.code).toBe("NOT_FOUND");
  });

  test("falls back to 500 for unexpected errors", () => {
    const { status, json } = run(new Error("boom"));
    expect(status).toHaveBeenCalledWith(500);
    expect(json.mock.calls[0][0].error.code).toBe("INTERNAL_ERROR");
  });

  test("records a failed AI deck mutation", async () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    errorHandler(
      new NotFoundError("Deck not found"),
      {
        method: "DELETE",
        path: "/api/decks/invalid-id",
        keyScope: "deck",
        keyPrefix: "fk_test",
        userId: "u1",
      } as unknown as Request,
      { status } as unknown as Response,
      jest.fn(),
    );
    await Promise.resolve();
    expect(auditFromRequest).toHaveBeenCalledWith(
      expect.anything(),
      "deck.deleted",
      "deck",
      undefined,
      "failure",
    );
  });
});
