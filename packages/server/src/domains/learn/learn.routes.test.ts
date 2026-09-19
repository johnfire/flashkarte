import request from "supertest";

jest.mock("./learn-lessons.service");
jest.mock("./learn-reviews.service");
jest.mock("./learn-outline.service");
jest.mock("./learn-insights.service");
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
    requireFullScope: jest.requireActual("../../middleware/auth")
      .requireFullScope,
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
import { ValidationError } from "../../utils/errors";
import { auditFromRequest } from "../audit/audit.service";
import * as learn from "./learn-lessons.service";
import * as reviews from "./learn-reviews.service";

const learnMock = learn as jest.Mocked<typeof learn>;
const reviewsMock = reviews as jest.Mocked<typeof reviews>;
const auditMock = auditFromRequest as jest.MockedFunction<
  typeof auditFromRequest
>;
const app = createApp();
const L = "/api/subjects/s1/learn";

beforeEach(() => {
  jest.clearAllMocks();
  keyScope = undefined;
});

test("starting a lesson audits the first start but not a resume", async () => {
  learnMock.startLesson.mockResolvedValueOnce({ resumed: false } as never);
  await request(app).post(`${L}/lessons/tokens/start`);
  expect(auditMock.mock.calls[0][1]).toBe("lesson.started");
  auditMock.mockClear();
  learnMock.startLesson.mockResolvedValueOnce({ resumed: true } as never);
  await request(app).post(`${L}/lessons/tokens/start`);
  expect(auditMock).not.toHaveBeenCalled();
});

test("an answer needs a whole-number choice and never reaches the service without one", async () => {
  const res = await request(app).post(`${L}/lessons/tokens/answer`).send({});
  expect(res.status).toBe(422);
  expect(learnMock.answerLesson).not.toHaveBeenCalled();
  expect(auditMock).not.toHaveBeenCalled();
});

test("a passing answer is audited as an answer and as a pass; a failure is not audited", async () => {
  learnMock.answerLesson.mockResolvedValueOnce({
    answer: { correct: true },
    passed: true,
    unlocked: [{ slug: "embeddings" }],
  } as never);
  const res = await request(app)
    .post(`${L}/lessons/tokens/answer`)
    .send({ choice: 1 });
  expect(res.status).toBe(200);
  expect(auditMock.mock.calls.map((c) => c[1])).toEqual([
    "question.answered",
    "lesson.passed",
  ]);
  auditMock.mockClear();
  learnMock.answerLesson.mockRejectedValueOnce(
    new ValidationError("Not on a question"),
  );
  expect(
    (await request(app).post(`${L}/lessons/tokens/answer`).send({ choice: 0 }))
      .status,
  ).toBe(422);
  expect(auditMock).not.toHaveBeenCalled();
});

test("a review answer is audited with its phase", async () => {
  reviewsMock.answerReview.mockResolvedValueOnce({
    answer: { correct: false },
  } as never);
  await request(app).post(`${L}/reviews/q1/answer`).send({ choice: 0 });
  expect(auditMock.mock.calls[0][6]).toMatchObject({
    question: "q1",
    correct: false,
    phase: "review",
  });
});

test("a deck-scoped (AI) key is refused on every learner route", async () => {
  keyScope = "deck";
  for (const [method, path] of [
    ["get", "/outline"],
    ["post", "/lessons/tokens/start"],
    ["post", "/lessons/tokens/answer"],
    ["get", "/reviews"],
    ["post", "/reviews/q1/answer"],
  ] as const) {
    const res = await request(app)[method](`${L}${path}`).send({ choice: 0 });
    expect(res.status).toBe(403);
  }
  expect(learnMock.startLesson).not.toHaveBeenCalled();
});
