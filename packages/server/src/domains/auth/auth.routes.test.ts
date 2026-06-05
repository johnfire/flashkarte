import request from "supertest";

jest.mock("./auth.service");
jest.mock("../../db/client", () => ({
  getPool: jest.fn(),
  query: jest.fn(),
  queryOne: jest.fn(),
  closePool: jest.fn(),
}));

import * as service from "./auth.service";
import { createApp } from "../../app";
import { ValidationError } from "../../utils/errors";

const mock = service as jest.Mocked<typeof service>;
const app = createApp();
beforeEach(() => jest.clearAllMocks());

describe("auth routes", () => {
  test("POST /api/auth/signup -> 201 with user + token, sets refresh cookie", async () => {
    mock.signup.mockResolvedValue({
      user: { id: "u1", email: "a@b.com", role: "user" },
      accessToken: "tok",
      rawRefresh: "raw",
    } as never);

    const res = await request(app)
      .post("/api/auth/signup")
      .send({ email: "a@b.com", password: "password123" });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe("a@b.com");
    expect(res.body.accessToken).toBe("tok");
    expect(res.headers["set-cookie"][0]).toMatch(/fk_refresh=/);
  });

  test("POST /api/auth/login -> 200", async () => {
    mock.login.mockResolvedValue({
      user: { id: "u1", email: "a@b.com", role: "user" },
      accessToken: "tok",
      rawRefresh: "raw",
    } as never);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "a@b.com", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBe("tok");
  });

  test("POST /api/auth/logout -> 204 clears cookie", async () => {
    mock.logout.mockResolvedValue(undefined as never);
    const res = await request(app).post("/api/auth/logout");
    expect(res.status).toBe(204);
  });

  test("POST /api/auth/verify-email -> 200 verified", async () => {
    mock.verifyEmail.mockResolvedValue(undefined as never);
    const res = await request(app)
      .post("/api/auth/verify-email")
      .send({ token: "raw-token" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("verified");
    expect(mock.verifyEmail).toHaveBeenCalledWith("raw-token");
  });

  test("POST /api/auth/verify-email -> 422 on bad token", async () => {
    mock.verifyEmail.mockRejectedValue(
      new ValidationError("This verification link is invalid or expired"),
    );
    const res = await request(app)
      .post("/api/auth/verify-email")
      .send({ token: "nope" });
    expect(res.status).toBe(422);
  });

  test("POST /api/auth/resend-verification without auth -> 401", async () => {
    const res = await request(app).post("/api/auth/resend-verification");
    expect(res.status).toBe(401);
    expect(mock.resendVerification).not.toHaveBeenCalled();
  });
});
