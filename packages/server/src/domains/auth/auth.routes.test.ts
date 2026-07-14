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
  test("POST /api/auth/signup -> 201 with user + token, sets persistent refresh cookie", async () => {
    mock.signup.mockResolvedValue({
      user: { id: "u1", email: "a@b.com", role: "user" },
      accessToken: "tok",
      rawRefresh: "raw",
      persistent: true,
    } as never);

    const res = await request(app)
      .post("/api/auth/signup")
      .send({ email: "a@b.com", password: "password123" });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe("a@b.com");
    expect(res.body.accessToken).toBe("tok");
    expect(res.headers["set-cookie"][0]).toMatch(/fk_refresh=/);
  });

  test("POST /api/auth/login -> 200, passes rememberMe to service", async () => {
    mock.login.mockResolvedValue({
      user: { id: "u1", email: "a@b.com", role: "user" },
      accessToken: "tok",
      rawRefresh: "raw",
      persistent: true,
    } as never);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "a@b.com", password: "password123", rememberMe: true });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBe("tok");
    expect(mock.login).toHaveBeenCalledWith("a@b.com", "password123", true);
  });

  test("POST /api/auth/login without rememberMe -> session cookie (no Max-Age)", async () => {
    mock.login.mockResolvedValue({
      user: { id: "u1", email: "a@b.com", role: "user" },
      accessToken: "tok",
      rawRefresh: "raw",
      persistent: false,
    } as never);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "a@b.com", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.headers["set-cookie"][0]).toMatch(/fk_refresh=/);
    expect(res.headers["set-cookie"][0]).not.toMatch(/Max-Age=/i);
  });

  test("POST /api/auth/login with rememberMe -> persistent cookie Max-Age matches REFRESH_TOKEN_TTL_DAYS", async () => {
    mock.login.mockResolvedValue({
      user: { id: "u1", email: "a@b.com", role: "user" },
      accessToken: "tok",
      rawRefresh: "raw",
      persistent: true,
    } as never);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "a@b.com", password: "password123", rememberMe: true });

    // Guards against the cookie's Max-Age drifting out of sync with the
    // server-side refresh token TTL (a stale hardcoded constant would let
    // the cookie die client-side before the token it carries expires).
    const expectedSeconds = service.REFRESH_TOKEN_TTL_DAYS * 86400;
    expect(res.headers["set-cookie"][0]).toMatch(
      new RegExp(`Max-Age=${expectedSeconds}\\b`),
    );
  });

  test("POST /api/auth/refresh -> 200 rotates refresh cookie, inherits persistence", async () => {
    mock.refresh.mockResolvedValue({
      accessToken: "new-tok",
      rawRefresh: "new-raw",
      persistent: true,
    } as never);

    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", "fk_refresh=old-raw");

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBe("new-tok");
    expect(res.headers["set-cookie"][0]).toMatch(/fk_refresh=new-raw/);
    expect(mock.refresh).toHaveBeenCalledWith("old-raw");
  });

  test("POST /api/auth/logout -> 204 clears cookie", async () => {
    mock.logout.mockResolvedValue(undefined as never);
    const res = await request(app).post("/api/auth/logout");
    expect(res.status).toBe(204);
  });

  test("GET /api/auth/me without auth -> 401", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  test("GET /api/auth/me -> 200 with current user", async () => {
    mock.verifyAccessToken.mockReturnValue({
      sub: "u1",
      email: "a@b.com",
    } as never);
    mock.getCurrentUser.mockResolvedValue({
      id: "u1",
      email: "a@b.com",
      role: "user",
      accountType: "free",
      emailVerifiedAt: null,
    } as never);
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer access-token");
    expect(res.status).toBe(200);
    expect(res.body.user.accountType).toBe("free");
    expect(mock.getCurrentUser).toHaveBeenCalledWith("u1");
  });

  test("PATCH /api/auth/me with language -> 200, passes language to service", async () => {
    mock.verifyAccessToken.mockReturnValue({
      sub: "u1",
      email: "a@b.com",
    } as never);
    mock.updateProfile.mockResolvedValue({
      id: "u1",
      email: "a@b.com",
      role: "user",
      accountType: "free",
      emailVerifiedAt: null,
      displayName: null,
      language: "de",
    } as never);
    const res = await request(app)
      .patch("/api/auth/me")
      .set("Authorization", "Bearer access-token")
      .send({ language: "de" });
    expect(res.status).toBe(200);
    expect(res.body.user.language).toBe("de");
    expect(mock.updateProfile).toHaveBeenCalledWith("u1", undefined, "de");
  });

  test("PATCH /api/auth/me with unsupported language -> 422", async () => {
    mock.verifyAccessToken.mockReturnValue({
      sub: "u1",
      email: "a@b.com",
    } as never);
    mock.updateProfile.mockRejectedValue(
      new ValidationError("Unsupported language"),
    );
    const res = await request(app)
      .patch("/api/auth/me")
      .set("Authorization", "Bearer access-token")
      .send({ language: "xx" });
    expect(res.status).toBe(422);
  });

  test("POST /api/auth/change-password without auth -> 401", async () => {
    const res = await request(app)
      .post("/api/auth/change-password")
      .send({ currentPassword: "old", newPassword: "BrandNewPassw0rd" });
    expect(res.status).toBe(401);
    expect(mock.changePassword).not.toHaveBeenCalled();
  });

  test("POST /api/auth/change-password -> 200, re-issues session cookie", async () => {
    mock.verifyAccessToken.mockReturnValue({
      sub: "u1",
      email: "a@b.com",
    } as never);
    mock.changePassword.mockResolvedValue({
      user: { id: "u1", email: "a@b.com", role: "user" },
      accessToken: "newtok",
      rawRefresh: "newraw",
      persistent: true,
    } as never);
    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", "Bearer access-token")
      .send({
        currentPassword: "OldPassw0rd",
        newPassword: "BrandNewPassw0rd",
      });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBe("newtok");
    expect(res.headers["set-cookie"][0]).toMatch(/fk_refresh=/);
    expect(mock.changePassword).toHaveBeenCalledWith(
      "u1",
      "OldPassw0rd",
      "BrandNewPassw0rd",
    );
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

  test("POST /api/auth/forgot-password -> 200 (uniform response)", async () => {
    mock.forgotPassword.mockResolvedValue(undefined as never);
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "a@b.com" });
    expect(res.status).toBe(200);
    expect(mock.forgotPassword).toHaveBeenCalledWith("a@b.com");
  });

  test("POST /api/auth/reset-password -> 200 reset", async () => {
    mock.resetPassword.mockResolvedValue(undefined as never);
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: "raw", password: "newpassword123" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("reset");
    expect(mock.resetPassword).toHaveBeenCalledWith("raw", "newpassword123");
  });

  test("POST /api/auth/reset-password -> 422 on bad token", async () => {
    mock.resetPassword.mockRejectedValue(
      new ValidationError("This reset link is invalid or expired"),
    );
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: "nope", password: "newpassword123" });
    expect(res.status).toBe(422);
  });
});
