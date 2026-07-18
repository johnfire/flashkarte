import request from "supertest";

jest.mock("./admin.service");
jest.mock("../auth/auth.service");
jest.mock("../keys/keys.service", () => ({ resolveKey: jest.fn() }));
jest.mock("../../db/client", () => ({
  getPool: jest.fn(),
  query: jest.fn(),
  queryOne: jest.fn(),
  closePool: jest.fn(),
}));

import * as service from "./admin.service";
import * as authService from "../auth/auth.service";
import { createApp } from "../../app";
import { ValidationError } from "../../utils/errors";

const mock = service as jest.Mocked<typeof service>;
const authMock = authService as jest.Mocked<typeof authService>;
const app = createApp();

const ADMIN = {
  id: "admin1",
  email: "admin@b.com",
  role: "user",
  accountType: "admin",
  emailVerifiedAt: "2026-01-01T00:00:00.000Z",
};
const REGULAR = { ...ADMIN, id: "u2", accountType: "free" };

beforeEach(() => {
  jest.clearAllMocks();
  authMock.verifyAccessToken.mockReturnValue({
    sub: "admin1",
    email: "admin@b.com",
  } as never);
});

const AUTH = "Bearer access-token";

describe("admin routes", () => {
  test("GET /api/admin/users without auth -> 401", async () => {
    const res = await request(app).get("/api/admin/users");
    expect(res.status).toBe(401);
    expect(mock.listUsers).not.toHaveBeenCalled();
  });

  test("GET /api/admin/users as non-admin -> 403", async () => {
    authMock.getCurrentUser.mockResolvedValue(REGULAR as never);
    const res = await request(app)
      .get("/api/admin/users")
      .set("Authorization", AUTH);
    expect(res.status).toBe(403);
    expect(mock.listUsers).not.toHaveBeenCalled();
  });

  test("GET /api/admin/users as admin -> 200 with users", async () => {
    authMock.getCurrentUser.mockResolvedValue(ADMIN as never);
    mock.listUsers.mockResolvedValue([
      {
        id: "u2",
        email: "a@b.com",
        role: "user",
        accountType: "free",
        emailVerifiedAt: null,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
    const res = await request(app)
      .get("/api/admin/users")
      .set("Authorization", AUTH);
    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(1);
    expect(res.body.users[0].email).toBe("a@b.com");
  });

  test("POST /api/admin/users as admin -> 201", async () => {
    authMock.getCurrentUser.mockResolvedValue(ADMIN as never);
    mock.createUser.mockResolvedValue({
      id: "u3",
      email: "new@b.com",
      role: "user",
      accountType: "paid",
      emailVerifiedAt: "2026-01-01T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    const res = await request(app)
      .post("/api/admin/users")
      .set("Authorization", AUTH)
      .send({
        email: "new@b.com",
        password: "password123",
        accountType: "paid",
      });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe("new@b.com");
    expect(mock.createUser).toHaveBeenCalledWith(
      "new@b.com",
      "password123",
      "paid",
    );
  });

  test("POST /api/admin/users as non-admin -> 403", async () => {
    authMock.getCurrentUser.mockResolvedValue(REGULAR as never);
    const res = await request(app)
      .post("/api/admin/users")
      .set("Authorization", AUTH)
      .send({ email: "new@b.com", password: "password123" });
    expect(res.status).toBe(403);
    expect(mock.createUser).not.toHaveBeenCalled();
  });

  test("POST /api/admin/users with bad account type -> 422", async () => {
    authMock.getCurrentUser.mockResolvedValue(ADMIN as never);
    mock.createUser.mockRejectedValue(
      new ValidationError("Account type must be one of: free, paid"),
    );
    const res = await request(app)
      .post("/api/admin/users")
      .set("Authorization", AUTH)
      .send({ email: "new@b.com", password: "password123", accountType: "x" });
    expect(res.status).toBe(422);
  });

  test("PATCH /api/admin/users/:id as admin -> 200", async () => {
    authMock.getCurrentUser.mockResolvedValue(ADMIN as never);
    mock.setAccountType.mockResolvedValue({
      id: "u2",
      email: "a@b.com",
      role: "user",
      accountType: "admin-gifted",
      emailVerifiedAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    const res = await request(app)
      .patch("/api/admin/users/u2")
      .set("Authorization", AUTH)
      .send({ accountType: "admin-gifted" });
    expect(res.status).toBe(200);
    expect(res.body.user.accountType).toBe("admin-gifted");
    expect(mock.setAccountType).toHaveBeenCalledWith("u2", "admin-gifted");
  });

  test("POST /api/admin/decks/:id/unpublish as admin -> 204", async () => {
    authMock.getCurrentUser.mockResolvedValue(ADMIN as never);
    mock.unpublishDeck.mockResolvedValue(undefined);
    const res = await request(app)
      .post("/api/admin/decks/d1/unpublish")
      .set("Authorization", AUTH);
    expect(res.status).toBe(204);
    expect(mock.unpublishDeck).toHaveBeenCalledWith("d1");
  });

  test("POST /api/admin/decks/:id/unpublish as non-admin -> 403", async () => {
    authMock.getCurrentUser.mockResolvedValue(REGULAR as never);
    const res = await request(app)
      .post("/api/admin/decks/d1/unpublish")
      .set("Authorization", AUTH);
    expect(res.status).toBe(403);
    expect(mock.unpublishDeck).not.toHaveBeenCalled();
  });
});
