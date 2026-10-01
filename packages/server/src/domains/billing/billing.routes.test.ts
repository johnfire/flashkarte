import request from "supertest";

jest.mock("./billing.service");
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
    req.keyScope =
      req.headers.authorization === "Bearer deck-key" ? "deck" : "full";
    next();
  },
  requireFullScope: (
    req: import("express").Request,
    res: import("express").Response,
    next: import("express").NextFunction,
  ) => {
    if (req.keyScope === "deck") {
      res.status(403).json({
        error: { code: "FORBIDDEN", message: "Full-scope credential required" },
      });
      return;
    }
    next();
  },
  requireVerified: (
    _req: import("express").Request,
    res: import("express").Response,
    _next: import("express").NextFunction,
  ) => {
    res.status(403).json({
      error: { code: "EMAIL_VERIFICATION_REQUIRED" },
    });
  },
  requireAdmin: (
    _req: import("express").Request,
    _res: import("express").Response,
    next: import("express").NextFunction,
  ) => next(),
}));

import * as service from "./billing.service";
import { createApp } from "../../app";

const mock = service as jest.Mocked<typeof service>;
const app = createApp();

beforeEach(() => jest.clearAllMocks());

describe("billing routes for new accounts", () => {
  test("allows a full-scope unverified account to start checkout", async () => {
    mock.createStripeCheckout.mockResolvedValue(
      "https://checkout.stripe.com/session",
    );

    const response = await request(app)
      .post("/api/billing/stripe/checkout")
      .send({ plan: "monthly" });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      url: "https://checkout.stripe.com/session",
    });
    expect(mock.createStripeCheckout).toHaveBeenCalledWith("u1", "monthly");
  });

  test("keeps other billing routes behind email verification", async () => {
    const response = await request(app).get("/api/billing/status");

    expect(response.status).toBe(403);
    expect(mock.getStatus).not.toHaveBeenCalled();
  });

  test("does not allow a deck-scoped key to start checkout", async () => {
    const response = await request(app)
      .post("/api/billing/stripe/checkout")
      .set("Authorization", "Bearer deck-key")
      .send({ plan: "monthly" });

    expect(response.status).toBe(403);
    expect(mock.createStripeCheckout).not.toHaveBeenCalled();
  });
});
