import request from "supertest";

jest.mock("./lessons.service");
jest.mock("./screens.service");
jest.mock("./questions.service");
jest.mock("./outline.service");
jest.mock("./lesson-import.service");
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

let keyScope: string | undefined;
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
      if (keyScope) req.keyScope = keyScope as never;
      next();
    },
  };
});

import { createApp } from "../../app";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { auditFromRequest } from "../audit/audit.service";
import { importLesson } from "./lesson-import.service";
import * as lessons from "./lessons.service";
import { getOutline } from "./outline.service";
import * as questions from "./questions.service";
import * as screens from "./screens.service";

const lessonsMock = lessons as jest.Mocked<typeof lessons>;
const screensMock = screens as jest.Mocked<typeof screens>;
const questionsMock = questions as jest.Mocked<typeof questions>;
const importMock = importLesson as jest.MockedFunction<typeof importLesson>;
const outlineMock = getOutline as jest.MockedFunction<typeof getOutline>;
const auditMock = auditFromRequest as jest.MockedFunction<
  typeof auditFromRequest
>;
const app = createApp();
const S = "/api/subjects/s1";

beforeEach(() => {
  jest.clearAllMocks();
  keyScope = undefined;
});
const action = () => auditMock.mock.calls[0][1];

describe("modules and lessons", () => {
  test("POST modules -> 201, audited", async () => {
    lessonsMock.createModule.mockResolvedValue({
      id: "m1",
      title: "Input side",
    } as never);
    const res = await request(app)
      .post(`${S}/modules`)
      .send({ title: "Input side" });
    expect(res.status).toBe(201);
    expect(action()).toBe("lesson.module_created");
  });

  test("POST lesson -> 201; a bad slug -> 422 and not audited", async () => {
    lessonsMock.createLesson.mockResolvedValueOnce({
      lesson: { slug: "tokens" },
      issues: [],
    } as never);
    expect(
      (
        await request(app)
          .post(`${S}/lessons`)
          .send({ slug: "tokens", title: "T" })
      ).status,
    ).toBe(201);
    expect(action()).toBe("lesson.created");
    auditMock.mockClear();
    lessonsMock.createLesson.mockRejectedValueOnce(
      new ValidationError("slug must be lowercase"),
    );
    expect(
      (await request(app).post(`${S}/lessons`).send({ slug: "Bad" })).status,
    ).toBe(422);
    expect(auditMock).not.toHaveBeenCalled();
  });

  test("POST lessons/import is routed to import, not read as a slug, and passes a person's author kind", async () => {
    importMock.mockResolvedValue({
      lesson: { slug: "tokens" },
      screens: [1, 2],
      question_ids: ["q"],
      issues: [],
    } as never);
    const res = await request(app)
      .post(`${S}/lessons/import`)
      .send({ lesson: { slug: "tokens" } });
    expect(res.status).toBe(201);
    expect(importMock).toHaveBeenCalledWith(
      "u1",
      "s1",
      { lesson: { slug: "tokens" } },
      "human",
    );
    expect(action()).toBe("lesson.imported");
  });

  test("a write made with an AI (deck-scoped) key is recorded as AI-authored", async () => {
    keyScope = "deck";
    importMock.mockResolvedValue({
      lesson: { slug: "t" },
      screens: [],
      question_ids: [],
      issues: [],
    } as never);
    await request(app).post(`${S}/lessons/import`).send({});
    expect(importMock).toHaveBeenCalledWith("u1", "s1", {}, "ai");
    screensMock.addScreen.mockResolvedValue({
      screen: { number: "1" },
      issues: [],
    } as never);
    await request(app).post(`${S}/lessons/tokens/screens`).send({ blocks: [] });
    expect(screensMock.addScreen).toHaveBeenCalledWith(
      "u1",
      "s1",
      "tokens",
      { blocks: [] },
      "ai",
    );
  });

  test("GET lesson, GET lint, finish, and the lesson's 404", async () => {
    lessonsMock.getLesson.mockResolvedValueOnce({
      lesson: { slug: "tokens" },
    } as never);
    expect((await request(app).get(`${S}/lessons/tokens`)).status).toBe(200);
    lessonsMock.lintLessonForOwner.mockResolvedValueOnce([]);
    expect((await request(app).get(`${S}/lessons/tokens/lint`)).body).toEqual({
      issues: [],
    });
    lessonsMock.finishLesson.mockResolvedValueOnce({
      slug: "tokens",
      stage: "finished",
      issues: [],
    } as never);
    expect((await request(app).post(`${S}/lessons/tokens/finish`)).status).toBe(
      200,
    );
    lessonsMock.getLesson.mockRejectedValueOnce(
      new NotFoundError("Lesson not found"),
    );
    expect((await request(app).get(`${S}/lessons/ghost`)).status).toBe(404);
  });

  test("finishing an incomplete lesson -> 422 carrying the issues, not audited", async () => {
    lessonsMock.finishLesson.mockRejectedValueOnce(
      new ValidationError("not complete enough", {
        issues: [{ code: "LESSON_NO_QUESTIONS" }],
      }),
    );
    const res = await request(app).post(`${S}/lessons/tokens/finish`);
    expect(res.status).toBe(422);
    expect(res.body.error.context.issues[0].code).toBe("LESSON_NO_QUESTIONS");
    expect(auditMock).not.toHaveBeenCalled();
  });

  test("PUT prerequisite and DELETE it by the prerequisite's slug", async () => {
    lessonsMock.setPrerequisite.mockResolvedValue({
      from: "a",
      to: "b",
      reason: "r",
    });
    await request(app)
      .put(`${S}/lessons/b/prerequisites`)
      .send({ from: "a", reason: "r" });
    expect(lessonsMock.setPrerequisite).toHaveBeenCalledWith("u1", "s1", "b", {
      from: "a",
      reason: "r",
    });
    lessonsMock.removePrerequisite.mockResolvedValue(undefined);
    expect(
      (await request(app).delete(`${S}/lessons/b/prerequisites/a`)).status,
    ).toBe(204);
    expect(lessonsMock.removePrerequisite).toHaveBeenCalledWith(
      "u1",
      "s1",
      "b",
      "a",
    );
  });

  test("GET outline", async () => {
    outlineMock.mockResolvedValue({ subject_id: "s1", modules: [] });
    expect((await request(app).get(`${S}/outline`)).body).toEqual({
      subject_id: "s1",
      modules: [],
    });
  });
});

describe("screens and questions", () => {
  test("a screen number with a decimal point reaches the service intact", async () => {
    screensMock.updateScreen.mockResolvedValue({
      number: "213.010",
      issues: [],
    } as never);
    await request(app).patch(`${S}/screens/213.010`).send({ blocks: [] });
    expect(screensMock.updateScreen).toHaveBeenCalledWith(
      "u1",
      "s1",
      "213.010",
      { blocks: [] },
    );
    screensMock.retireScreen.mockResolvedValue({
      number: "213.010",
      issues: [],
    } as never);
    await request(app).post(`${S}/screens/213.010/retire`);
    expect(screensMock.retireScreen).toHaveBeenCalledWith(
      "u1",
      "s1",
      "213.010",
    );
    expect(auditMock.mock.calls.map((c) => c[1])).toEqual([
      "screen.updated",
      "screen.retired",
    ]);
  });

  test("deleting a screen in a finished lesson -> 422", async () => {
    screensMock.deleteScreen.mockRejectedValue(
      new ValidationError("Cannot delete a screen: lesson is finished"),
    );
    expect((await request(app).delete(`${S}/screens/4`)).status).toBe(422);
    expect(auditMock).not.toHaveBeenCalled();
  });

  test("screen revisions", async () => {
    screensMock.listScreenRevisions.mockResolvedValue([
      { change: "edited" },
    ] as never);
    expect((await request(app).get(`${S}/screens/1/revisions`)).body).toEqual([
      { change: "edited" },
    ]);
  });

  test("question add, variant add, update, retire, delete", async () => {
    questionsMock.addQuestion.mockResolvedValue({
      id: "q1",
      issues: [],
    } as never);
    expect(
      (await request(app).post(`${S}/lessons/tokens/questions`).send({}))
        .status,
    ).toBe(201);
    questionsMock.addVariant.mockResolvedValue({
      id: "v1",
      issues: [],
    } as never);
    expect(
      (
        await request(app)
          .post(`${S}/lessons/tokens/questions/q1/variants`)
          .send({})
      ).status,
    ).toBe(201);
    questionsMock.updateQuestion.mockResolvedValue({
      id: "q1",
      issues: [],
    } as never);
    expect(
      (
        await request(app)
          .patch(`${S}/lessons/tokens/questions/q1`)
          .send({ teaches: ["2"] })
      ).status,
    ).toBe(200);
    expect(questionsMock.updateQuestion).toHaveBeenCalledWith(
      "u1",
      "s1",
      "tokens",
      "q1",
      { teaches: ["2"] },
    );
    questionsMock.retireQuestion.mockResolvedValue({
      id: "q1",
      issues: [],
    } as never);
    expect(
      (await request(app).post(`${S}/lessons/tokens/questions/q1/retire`))
        .status,
    ).toBe(200);
    questionsMock.deleteQuestion.mockResolvedValue({ issues: [] });
    expect(
      (await request(app).delete(`${S}/lessons/tokens/questions/q1`)).status,
    ).toBe(204);
    expect(auditMock.mock.calls.map((c) => c[1])).toEqual([
      "question.added",
      "question.variant_added",
      "question.updated",
      "question.retired",
      "question.deleted",
    ]);
  });
});
