import request from "supertest";

jest.mock("./subjects.service");
jest.mock("./concepts.service");
jest.mock("./subjects-import.service");
jest.mock("../audit/audit.service", () => ({
  auditFromRequest: jest.fn().mockResolvedValue(undefined),
  actorFromRequest: jest.fn(),
  userActor: jest.fn(),
}));
jest.mock("../../db/client", () => ({
  getPool: jest.fn(),
  query: jest.fn(),
  queryOne: jest.fn(),
  closePool: jest.fn(),
}));
jest.mock("../../middleware/auth", () => {
  const pass = (
    _req: import("express").Request,
    _res: import("express").Response,
    next: import("express").NextFunction,
  ) => next();
  return {
    requireFullScope: pass,
    requireVerified: pass,
    requireAdmin: pass,
    requireAuth: (
      req: import("express").Request,
      _res: import("express").Response,
      next: import("express").NextFunction,
    ) => {
      req.userId = "u1";
      next();
    },
  };
});

import { createApp } from "../../app";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { auditFromRequest } from "../audit/audit.service";
import * as concepts from "./concepts.service";
import * as subjects from "./subjects.service";
import { importSubject } from "./subjects-import.service";

const subjectsMock = subjects as jest.Mocked<typeof subjects>;
const conceptsMock = concepts as jest.Mocked<typeof concepts>;
const importMock = importSubject as jest.MockedFunction<typeof importSubject>;
const auditMock = auditFromRequest as jest.MockedFunction<
  typeof auditFromRequest
>;
const app = createApp();
beforeEach(() => jest.clearAllMocks());

const subject = {
  id: "s1",
  user_id: "u1",
  title: "Transformers",
  description: null,
  is_public: false,
  version: 1,
  created_at: "x",
  updated_at: "x",
};

const auditedAction = () => auditMock.mock.calls[0][1];

describe("subjects routes", () => {
  test("POST /api/subjects -> 201 and audited", async () => {
    subjectsMock.createSubject.mockResolvedValue(subject as never);
    const res = await request(app)
      .post("/api/subjects")
      .send({ title: "Transformers" });
    expect(res.status).toBe(201);
    expect(auditedAction()).toBe("subject.created");
  });

  test("POST /api/subjects with a blank title -> 422 and not audited", async () => {
    subjectsMock.createSubject.mockRejectedValue(
      new ValidationError("Title is required"),
    );
    const res = await request(app).post("/api/subjects").send({ title: "" });
    expect(res.status).toBe(422);
    expect(auditMock).not.toHaveBeenCalled();
  });

  test("POST /api/subjects/import is routed to import, not read as an id", async () => {
    importMock.mockResolvedValue({
      subject,
      concept_count: 2,
      edge_count: 1,
      advisories: [],
    } as never);
    const res = await request(app)
      .post("/api/subjects/import")
      .send({ title: "T", concepts: [], edges: [] });
    expect(res.status).toBe(201);
    expect(importMock).toHaveBeenCalledWith("u1", {
      title: "T",
      concepts: [],
      edges: [],
    });
    expect(auditedAction()).toBe("subject.imported");
  });

  test("an invalid import -> 422", async () => {
    importMock.mockRejectedValue(new ValidationError("cycle"));
    const res = await request(app).post("/api/subjects/import").send({});
    expect(res.status).toBe(422);
  });

  test("GET /api/subjects -> 200", async () => {
    subjectsMock.listSubjects.mockResolvedValue([
      { ...subject, concept_count: 3 },
    ] as never);
    const res = await request(app).get("/api/subjects");
    expect(res.status).toBe(200);
    expect(res.body[0].concept_count).toBe(3);
  });

  test("GET /api/subjects/:id -> 404 for someone else's subject", async () => {
    subjectsMock.getSubject.mockRejectedValue(
      new NotFoundError("Subject not found"),
    );
    const res = await request(app).get("/api/subjects/s1");
    expect(res.status).toBe(404);
  });

  test("GET /api/subjects/:id/progress and /lint -> 200", async () => {
    subjectsMock.getSubjectProgress.mockResolvedValue({
      frontier: [],
    } as never);
    subjectsMock.lintSubject.mockResolvedValue([]);
    expect((await request(app).get("/api/subjects/s1/progress")).status).toBe(
      200,
    );
    const lint = await request(app).get("/api/subjects/s1/lint");
    expect(lint.body).toEqual({ issues: [] });
  });

  test("PATCH and DELETE /api/subjects/:id are audited", async () => {
    subjectsMock.updateSubject.mockResolvedValue({
      ...subject,
      is_public: true,
    } as never);
    subjectsMock.deleteSubject.mockResolvedValue(undefined);
    const patched = await request(app)
      .patch("/api/subjects/s1")
      .send({ isPublic: true });
    expect(patched.status).toBe(200);
    expect(subjectsMock.updateSubject).toHaveBeenCalledWith("u1", "s1", {
      title: undefined,
      description: undefined,
      isPublic: true,
    });
    const deleted = await request(app).delete("/api/subjects/s1");
    expect(deleted.status).toBe(204);
    expect(auditMock.mock.calls.map((call) => call[1])).toEqual([
      "subject.updated",
      "subject.deleted",
    ]);
  });
});

describe("concept and edge routes", () => {
  test("POST concept -> 201 with the body forwarded", async () => {
    conceptsMock.addConcept.mockResolvedValue({
      slug: "kv-cache",
      kind: "idea",
    } as never);
    const body = { slug: "kv-cache", name: "KV cache", kind: "idea" };
    const res = await request(app).post("/api/subjects/s1/concepts").send(body);
    expect(res.status).toBe(201);
    expect(conceptsMock.addConcept).toHaveBeenCalledWith("u1", "s1", body);
    expect(auditedAction()).toBe("subject.concept_added");
  });

  test("PATCH and DELETE concept address it by slug", async () => {
    conceptsMock.updateConcept.mockResolvedValue({ slug: "kv-cache" } as never);
    conceptsMock.deleteConcept.mockResolvedValue(undefined);
    await request(app)
      .patch("/api/subjects/s1/concepts/kv-cache")
      .send({ name: "KV" });
    expect(conceptsMock.updateConcept).toHaveBeenCalledWith(
      "u1",
      "s1",
      "kv-cache",
      { name: "KV" },
    );
    const res = await request(app).delete("/api/subjects/s1/concepts/kv-cache");
    expect(res.status).toBe(204);
    expect(conceptsMock.deleteConcept).toHaveBeenCalledWith(
      "u1",
      "s1",
      "kv-cache",
    );
  });

  test("PUT concept cards forwards card_ids", async () => {
    conceptsMock.linkCards.mockResolvedValue({
      concept: "kv-cache",
      card_ids: ["c1"],
    });
    const res = await request(app)
      .put("/api/subjects/s1/concepts/kv-cache/cards")
      .send({ card_ids: ["c1"] });
    expect(res.status).toBe(200);
    expect(conceptsMock.linkCards).toHaveBeenCalledWith(
      "u1",
      "s1",
      "kv-cache",
      ["c1"],
    );
    expect(auditedAction()).toBe("subject.cards_linked");
  });

  test("PUT edge -> 200; a cycle -> 422 and not audited", async () => {
    const edge = { from: "a", to: "b", strength: "requires", reason: "r" };
    conceptsMock.setEdge.mockResolvedValueOnce(edge as never);
    const ok = await request(app).put("/api/subjects/s1/edges").send(edge);
    expect(ok.status).toBe(200);
    expect(auditedAction()).toBe("subject.edge_set");

    auditMock.mockClear();
    conceptsMock.setEdge.mockRejectedValueOnce(
      new ValidationError("that would create a cycle"),
    );
    const cyclic = await request(app).put("/api/subjects/s1/edges").send(edge);
    expect(cyclic.status).toBe(422);
    expect(auditMock).not.toHaveBeenCalled();
  });

  test("DELETE edge addresses both ends by slug", async () => {
    conceptsMock.removeEdge.mockResolvedValue(undefined);
    const res = await request(app).delete("/api/subjects/s1/edges/a/b");
    expect(res.status).toBe(204);
    expect(conceptsMock.removeEdge).toHaveBeenCalledWith("u1", "s1", "a", "b");
    expect(auditedAction()).toBe("subject.edge_removed");
  });
});
