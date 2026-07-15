import type { Request, Response, NextFunction } from "express";
import { requestId } from "./requestId";

describe("requestId middleware", () => {
  function setup(header?: string) {
    const req = {
      headers: header ? { "x-request-id": header } : {},
    } as unknown as Request;
    const res = {
      setHeader: jest.fn(),
    } as unknown as Response;
    const next = jest.fn() as NextFunction;
    return { req, res, next };
  }

  it("honors an upstream x-request-id header", () => {
    const { req, res, next } = setup("upstream-id-123");
    requestId(req, res, next);
    expect(req.correlationId).toBe("upstream-id-123");
    expect(res.setHeader).toHaveBeenCalledWith(
      "x-request-id",
      "upstream-id-123",
    );
    expect(next).toHaveBeenCalled();
  });

  it("generates a UUID when no header is present", () => {
    const { req, res, next } = setup();
    requestId(req, res, next);
    expect(req.correlationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      "x-request-id",
      req.correlationId,
    );
    expect(next).toHaveBeenCalled();
  });

  it("ignores non-string header values and generates a fresh id", () => {
    const { req, res, next } = setup();
    (req.headers["x-request-id"] as unknown) = ["not-a-string"];
    requestId(req, res, next);
    expect(req.correlationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });
});
