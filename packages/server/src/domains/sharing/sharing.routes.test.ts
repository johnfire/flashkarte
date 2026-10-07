import request from "supertest";

jest.mock("../courses/courses.service");
jest.mock("../subjects/subjects.service");
jest.mock("../auth/auth.service");
jest.mock("../keys/keys.service", () => ({ resolveKey: jest.fn() }));
jest.mock("../../db/client", () => ({
  getPool: jest.fn(),
  query: jest.fn(),
  queryOne: jest.fn(),
  closePool: jest.fn(),
}));

import * as courses from "../courses/courses.service";
import * as subjects from "../subjects/subjects.service";
import * as authService from "../auth/auth.service";
import * as keysService from "../keys/keys.service";
import { createApp } from "../../app";

const coursesMock = courses as jest.Mocked<typeof courses>;
const subjectsMock = subjects as jest.Mocked<typeof subjects>;
const authMock = authService as jest.Mocked<typeof authService>;
const keysMock = keysService as jest.Mocked<typeof keysService>;
const app = createApp();

const TEACHER = {
  id: "t1",
  accountType: "free",
  emailVerifiedAt: "2026-01-01T00:00:00.000Z",
};
const AUTH = "Bearer access-token";
const ID = "40000000-0000-4000-8000-0000000000f1";

beforeEach(() => {
  jest.clearAllMocks();
  authMock.verifyAccessToken.mockReturnValue({ sub: "t1" } as never);
  authMock.getCurrentUser.mockResolvedValue(TEACHER as never);
});

describe("deck-course sharing routes", () => {
  test("courses shared with me are listed, not mistaken for a course id", async () => {
    coursesMock.listSharedWithMe.mockResolvedValue([]);
    const res = await request(app)
      .get("/api/courses/shared")
      .set("Authorization", AUTH);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ courses: [] });
    expect(coursesMock.getCourse).not.toHaveBeenCalled();
  });

  test("adding and removing a shared course", async () => {
    coursesMock.subscribeShared.mockResolvedValue(undefined);
    coursesMock.unsubscribeShared.mockResolvedValue(undefined);
    const add = await request(app)
      .post(`/api/courses/${ID}/subscribe`)
      .set("Authorization", AUTH);
    expect(add.status).toBe(204);
    expect(coursesMock.subscribeShared).toHaveBeenCalledWith("t1", ID);
    const remove = await request(app)
      .delete(`/api/courses/${ID}/subscribe`)
      .set("Authorization", AUTH);
    expect(remove.status).toBe(204);
    expect(coursesMock.unsubscribeShared).toHaveBeenCalledWith("t1", ID);
  });

  test("the owner replaces a course's audiences", async () => {
    coursesMock.setShares.mockResolvedValue({
      shares: [],
      options: {},
    } as never);
    const res = await request(app)
      .put(`/api/courses/${ID}/shares`)
      .set("Authorization", AUTH)
      .send({ shares: [{ scope: "teacher_students" }] });
    expect(res.status).toBe(200);
    expect(coursesMock.setShares).toHaveBeenCalledWith("t1", ID, {
      shares: [{ scope: "teacher_students" }],
    });
  });

  test("a deck-scoped (MCP) key cannot change who a course reaches", async () => {
    keysMock.resolveKey.mockResolvedValue({
      userId: "t1",
      scope: "deck",
      keyPrefix: "fk_abc",
    } as never);
    const res = await request(app)
      .put(`/api/courses/${ID}/shares`)
      .set("Authorization", "Bearer fk_deckkey")
      .send({ shares: [] });
    expect(res.status).toBe(403);
    expect(coursesMock.setShares).not.toHaveBeenCalled();
  });
});

describe("structured-course sharing routes", () => {
  test("structured courses shared with me are listed, not mistaken for an id", async () => {
    subjectsMock.listSharedWithMe.mockResolvedValue([]);
    const res = await request(app)
      .get("/api/subjects/shared")
      .set("Authorization", AUTH);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ courses: [] });
    expect(subjectsMock.getSubject).not.toHaveBeenCalled();
  });

  test("the owner reads a structured course's audiences", async () => {
    subjectsMock.getShares.mockResolvedValue({
      shares: [],
      options: {},
    } as never);
    const res = await request(app)
      .get(`/api/subjects/${ID}/shares`)
      .set("Authorization", AUTH);
    expect(res.status).toBe(200);
    expect(subjectsMock.getShares).toHaveBeenCalledWith("t1", ID);
  });

  test("a deck-scoped (MCP) key cannot change who a structured course reaches", async () => {
    keysMock.resolveKey.mockResolvedValue({
      userId: "t1",
      scope: "deck",
      keyPrefix: "fk_abc",
    } as never);
    const res = await request(app)
      .put(`/api/subjects/${ID}/shares`)
      .set("Authorization", "Bearer fk_deckkey")
      .send({ shares: [] });
    expect(res.status).toBe(403);
    expect(subjectsMock.setShares).not.toHaveBeenCalled();
  });
});
