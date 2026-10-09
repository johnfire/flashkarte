import request from "supertest";

jest.mock("./schools.service");
jest.mock("../decks/deck-shares.service");
jest.mock("../auth/auth.service");
jest.mock("../keys/keys.service", () => ({ resolveKey: jest.fn() }));
jest.mock("../../db/client", () => ({
  getPool: jest.fn(),
  query: jest.fn(),
  queryOne: jest.fn(),
  closePool: jest.fn(),
}));

import * as service from "./schools.service";
import * as shares from "../decks/deck-shares.service";
import * as authService from "../auth/auth.service";
import * as keysService from "../keys/keys.service";
import { createApp } from "../../app";

const mock = service as jest.Mocked<typeof service>;
const sharesMock = shares as jest.Mocked<typeof shares>;
const authMock = authService as jest.Mocked<typeof authService>;
const keysMock = keysService as jest.Mocked<typeof keysService>;
const app = createApp();

const VERIFIED = "2026-01-01T00:00:00.000Z";
const ADMIN = { id: "admin1", accountType: "admin", emailVerifiedAt: VERIFIED };
const TEACHER = { id: "t1", accountType: "free", emailVerifiedAt: VERIFIED };
const AUTH = "Bearer access-token";
const DECK = "20000000-0000-4000-8000-0000000000d1";

beforeEach(() => {
  jest.clearAllMocks();
  authMock.verifyAccessToken.mockReturnValue({ sub: "admin1" } as never);
});

describe("admin school routes", () => {
  test("an admin can read one school's roster", async () => {
    authMock.getCurrentUser.mockResolvedValue(ADMIN as never);
    const detail = {
      school: { id: "s1", name: "Gymnasium" },
      administrators: [],
      teachers: [],
      students: [],
      classes: [],
    } as never;
    mock.getSchool.mockResolvedValue(detail);

    const res = await request(app)
      .get("/api/admin/schools/s1")
      .set("Authorization", AUTH);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ school: detail });
    expect(mock.getSchool).toHaveBeenCalledWith("s1");
  });

  test("a non-admin cannot create a school", async () => {
    authMock.getCurrentUser.mockResolvedValue(TEACHER as never);
    const res = await request(app)
      .post("/api/admin/schools")
      .set("Authorization", AUTH)
      .send({ name: "Gymnasium" });
    expect(res.status).toBe(403);
    expect(mock.createSchool).not.toHaveBeenCalled();
  });

  test("the admin verifies a teacher, recorded as the verifier", async () => {
    authMock.getCurrentUser.mockResolvedValue(ADMIN as never);
    mock.verifyTeacher.mockResolvedValue(undefined);
    const res = await request(app)
      .post("/api/admin/users/t1/verify-teacher")
      .set("Authorization", AUTH)
      .send({ method: "interview", note: "Interviewed 7 Oct" });
    expect(res.status).toBe(204);
    expect(mock.verifyTeacher).toHaveBeenCalledWith("admin1", "t1", {
      method: "interview",
      note: "Interviewed 7 Oct",
    });
  });

  test("the admin replaces a class's students", async () => {
    authMock.getCurrentUser.mockResolvedValue(ADMIN as never);
    mock.setClassMembers.mockResolvedValue(undefined);
    const res = await request(app)
      .put("/api/admin/classes/c1/members")
      .set("Authorization", AUTH)
      .send({ studentIds: ["s1", "s2"] });
    expect(res.status).toBe(204);
    expect(mock.setClassMembers).toHaveBeenCalledWith("c1", ["s1", "s2"]);
  });
});

describe("deck share routes", () => {
  test("the owner reads and replaces a deck's audiences", async () => {
    authMock.verifyAccessToken.mockReturnValue({ sub: "t1" } as never);
    authMock.getCurrentUser.mockResolvedValue(TEACHER as never);
    const result = { shares: [], options: {} } as never;
    sharesMock.setShares.mockResolvedValue(result);
    const res = await request(app)
      .put(`/api/decks/${DECK}/shares`)
      .set("Authorization", AUTH)
      .send({ shares: [{ scope: "teacher_students" }] });
    expect(res.status).toBe(200);
    expect(sharesMock.setShares).toHaveBeenCalledWith("t1", DECK, {
      shares: [{ scope: "teacher_students" }],
    });
  });

  test("a deck-scoped (MCP) key cannot change who a deck reaches", async () => {
    keysMock.resolveKey.mockResolvedValue({
      userId: "t1",
      scope: "deck",
      keyPrefix: "fk_abc",
    } as never);
    authMock.getCurrentUser.mockResolvedValue(TEACHER as never);
    const res = await request(app)
      .put(`/api/decks/${DECK}/shares`)
      .set("Authorization", "Bearer fk_deckkey")
      .send({ shares: [{ scope: "teacher_students" }] });
    expect(res.status).toBe(403);
    expect(sharesMock.setShares).not.toHaveBeenCalled();
  });

  test("decks shared with me are listed, not mistaken for a deck id", async () => {
    authMock.verifyAccessToken.mockReturnValue({ sub: "s1" } as never);
    authMock.getCurrentUser.mockResolvedValue(TEACHER as never);
    sharesMock.listSharedWithMe.mockResolvedValue([]);
    const res = await request(app)
      .get("/api/decks/shared")
      .set("Authorization", AUTH);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ decks: [] });
    expect(sharesMock.listSharedWithMe).toHaveBeenCalledWith("s1");
  });
});
