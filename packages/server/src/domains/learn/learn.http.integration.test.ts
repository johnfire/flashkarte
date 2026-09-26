import request from "supertest";

let keyScope: string | undefined;
let currentUser = "10000000-0000-4000-8000-0000000000f1";
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
      req.userId = currentUser;
      if (keyScope) {
        req.keyScope = keyScope as never;
        req.keyPrefix = "fk_test";
      }
      next();
    },
  };
});

import { createApp } from "../../app";
import { closePool, getPool } from "../../db/client";
import { runMigrations } from "../../db/migrate";
import { positionOf } from "./test-support/learning-course";

const USER = "10000000-0000-4000-8000-0000000000f1";
const STRANGER = "10000000-0000-4000-8000-0000000000f2";
const app = createApp();
const para = (text: string) => [{ type: "paragraph", spans: [{ text }] }];
const option = (correct: boolean) => ({
  correct,
  blocks: para(correct ? "RIGHT" : "WRONG"),
  reason: para(correct ? "Because it is." : "Because it is not."),
});
const question = (n: number, teaches: string[]) => ({
  prompt: para(`Q${n}`),
  options: [option(true), option(false)],
  teaches,
  covers: ["token"],
});
const lessonImport = {
  lesson: {
    slug: "tokens",
    title: "Tokens",
    summary: "What a token is.",
    covers: ["token"],
  },
  screens: [1, 2, 3, 4].map((n) => ({
    ref: `s${n}`,
    blocks: para(`Screen ${n}`),
  })),
  questions: [
    question(1, ["s1"]),
    question(2, ["s2"]),
    question(3, ["s3", "s4"]),
  ],
};

beforeAll(async () => {
  if (!(process.env.POSTGRES_DB ?? "").endsWith("_test")) {
    throw new Error(
      "HTTP integration tests require POSTGRES_DB ending in _test",
    );
  }
  await runMigrations();
});
beforeEach(async () => {
  keyScope = undefined;
  currentUser = USER;
  const pool = getPool();
  await pool.query("TRUNCATE TABLE users CASCADE");
  await pool.query("TRUNCATE TABLE audit_log");
  await pool.query(
    `INSERT INTO users (id, email, password_hash) VALUES
       ($1, 'learn-http@example.com', 'x'), ($2, 'learn-http-2@example.com', 'x')`,
    [USER, STRANGER],
  );
});
afterAll(async () => {
  await closePool();
});

async function makeSubject(): Promise<string> {
  const subject = await request(app)
    .post("/api/subjects")
    .send({ title: "Transformers" });
  const id = subject.body.id;
  await request(app)
    .post(`/api/subjects/${id}/concepts`)
    .send({ slug: "token", name: "Token", kind: "term" });
  await request(app)
    .post(`/api/subjects/${id}/lessons/import`)
    .send(lessonImport);
  return id;
}

const auditActions = async () =>
  (
    await getPool().query("SELECT action FROM audit_log ORDER BY created_at")
  ).rows.map((row) => row.action as string);

test("learn a lesson over real HTTP: read, miss and be sent back, pass, and see it on the outline", async () => {
  const id = await makeSubject();
  const L = `/api/subjects/${id}/learn`;

  const start = await request(app).post(`${L}/lessons/tokens/start`);
  expect(start.status).toBe(200);
  expect(start.body.step).toMatchObject({ kind: "screen", number: "1" });

  let step = start.body.step;
  while (step.kind === "screen") {
    step = (await request(app).post(`${L}/lessons/tokens/next`)).body.step;
  }
  expect(step.kind).toBe("question");
  expect(JSON.stringify(step)).not.toMatch(/correct|Because/i);

  const miss = await request(app)
    .post(`${L}/lessons/tokens/answer`)
    .send({ choice: positionOf(step, false) });
  expect(miss.body.answer.correct).toBe(false);
  expect(miss.body.step.kind).toBe("remediation");
  step = (await request(app).post(`${L}/lessons/tokens/continue`)).body.step;

  let passed = false;
  for (let guard = 0; guard < 30 && !passed; guard++) {
    if (step.kind === "remediation") {
      step = (await request(app).post(`${L}/lessons/tokens/continue`)).body
        .step;
      continue;
    }
    const reply = await request(app)
      .post(`${L}/lessons/tokens/answer`)
      .send({ choice: positionOf(step, true) });
    step = reply.body.step;
    passed = reply.body.passed;
  }
  expect(step).toMatchObject({ kind: "passed", total: 3 });

  const outline = (await request(app).get(`${L}/outline`)).body;
  expect(outline.modules[0].lessons[0]).toMatchObject({
    slug: "tokens",
    access: "passed",
  });
  expect(outline.reviews_due).toBe(0);

  const actions = await auditActions();
  expect(actions).toEqual(
    expect.arrayContaining([
      "lesson.started",
      "question.answered",
      "lesson.passed",
    ]),
  );
  expect(actions.filter((a) => a === "lesson.started")).toHaveLength(1);
});

test("rejects a bad answer body with 422 and records nothing", async () => {
  const id = await makeSubject();
  const L = `/api/subjects/${id}/learn/lessons/tokens`;
  await request(app).post(`${L}/start`);
  for (const body of [{}, { choice: "a" }, { choice: -1 }, { choice: 1.5 }]) {
    const reply = await request(app).post(`${L}/answer`).send(body);
    expect(reply.status).toBe(422);
  }
  expect(
    (await getPool().query("SELECT 1 FROM question_attempts")).rowCount,
  ).toBe(0);
});

test("answering before the questions is a 422, and a stranger sees 404", async () => {
  const id = await makeSubject();
  const L = `/api/subjects/${id}/learn/lessons/tokens`;
  await request(app).post(`${L}/start`);
  expect(
    (await request(app).post(`${L}/answer`).send({ choice: 0 })).status,
  ).toBe(422);
  currentUser = STRANGER;
  expect((await request(app).post(`${L}/start`)).status).toBe(404);
  expect(
    (await request(app).get(`/api/subjects/${id}/learn/outline`)).status,
  ).toBe(404);
});

test("an enrolled learner of a public course is told feedback is owner-only, and it stays owner-only", async () => {
  const id = await makeSubject();
  const S = `/api/subjects/${id}`;
  const owner = await request(app).post(`${S}/learn/lessons/tokens/start`);
  expect(owner.body.lesson.is_owner).toBe(true);
  expect((await request(app).get(`${S}/learn/reviews`)).body.is_owner).toBe(
    true,
  );

  await getPool().query("UPDATE subjects SET is_public = true WHERE id = $1", [
    id,
  ]);
  await getPool().query(
    "INSERT INTO subject_enrollments (user_id, subject_id) VALUES ($1, $2)",
    [STRANGER, id],
  );
  currentUser = STRANGER;
  const learner = await request(app).post(`${S}/learn/lessons/tokens/start`);
  expect(learner.status).toBe(200);
  expect(learner.body.lesson.is_owner).toBe(false);
  const reviews = await request(app).get(`${S}/learn/reviews`);
  expect(reviews.status).toBe(200);
  expect(reviews.body.is_owner).toBe(false);

  // The UI hides the controls; the server still refuses non-owners.
  expect(
    (
      await request(app)
        .post(`${S}/learn/screens/2/comments`)
        .send({ body: "Why?" })
    ).status,
  ).toBe(404);
  expect(
    (await request(app).post(`${S}/learn/screens/2/help`).send({})).status,
  ).toBe(404);
});

test("an AI (deck-scoped) key cannot learn, but can read where questions fail", async () => {
  const id = await makeSubject();
  keyScope = "deck";
  const L = `/api/subjects/${id}`;
  expect(
    (await request(app).post(`${L}/learn/lessons/tokens/start`)).status,
  ).toBe(403);
  expect((await request(app).get(`${L}/learn/outline`)).status).toBe(403);
  const insights = await request(app).get(`${L}/lessons/tokens/insights`);
  expect(insights.status).toBe(200);
  expect(insights.body.questions).toHaveLength(3);
});

test("the owner comments on a screen, their AI reads and resolves it, and the AI cannot comment", async () => {
  const id = await makeSubject();
  const S = `/api/subjects/${id}`;
  const made = await request(app)
    .post(`${S}/learn/screens/2/comments`)
    .send({ body: "Why 256 and not 255?" });
  expect(made.status).toBe(201);
  expect(
    (await request(app).post(`${S}/learn/screens/2/comments`).send({})).status,
  ).toBe(422);

  keyScope = "deck";
  expect(
    (
      await request(app)
        .post(`${S}/learn/screens/2/comments`)
        .send({ body: "x" })
    ).status,
  ).toBe(403);
  const listed = await request(app).get(`${S}/lessons/tokens/comments`);
  expect(listed.body.comments).toEqual([
    expect.objectContaining({ number: "2", body: "Why 256 and not 255?" }),
  ]);
  expect(
    (await request(app).post(`${S}/comments/${made.body.id}/resolve`)).status,
  ).toBe(200);
  expect(
    (await request(app).get(`${S}/lessons/tokens/comments`)).body.comments,
  ).toHaveLength(0);

  const actors = await getPool().query(
    `SELECT action, actor_type FROM audit_log WHERE action LIKE 'screen.%' ORDER BY created_at`,
  );
  expect(actors.rows.map((r) => r.action)).toEqual([
    "screen.commented",
    "screen.comment_resolved",
  ]);
  expect(actors.rows[1].actor_type).toBe("ai-agent");
});

test("the learner asks for more, their AI reads the queue and answers with sourced screens, and the AI cannot ask", async () => {
  const id = await makeSubject();
  const S = `/api/subjects/${id}`;
  const asked = await request(app)
    .post(`${S}/learn/screens/2/help`)
    .send({ selection: "a token", note: "why?" });
  expect(asked.status).toBe(201);
  expect(
    (
      await request(app)
        .post(`${S}/learn/screens/2/help`)
        .send({ note: "x".repeat(2000) })
    ).status,
  ).toBe(422);
  expect(
    (await request(app).post(`${S}/learn/screens/abc/help`).send({})).status,
  ).toBe(404);

  keyScope = "deck";
  expect(
    (await request(app).post(`${S}/learn/screens/2/help`).send({})).status,
  ).toBe(403);
  const queue = await request(app).get(`${S}/help?lesson=tokens`);
  expect(queue.body.requests).toEqual([
    expect.objectContaining({
      id: asked.body.id,
      note: "why?",
      selection: "a token",
      lesson: "tokens",
    }),
  ]);

  const noSource = await request(app)
    .post(`${S}/help/${asked.body.id}/answer`)
    .send({
      screens: [
        { blocks: [{ type: "paragraph", spans: [{ text: "More." }] }] },
      ],
    });
  expect(noSource.status).toBe(422);
  expect(noSource.body.error.message).toMatch(/at least one source/);

  const answered = await request(app)
    .post(`${S}/help/${asked.body.id}/answer`)
    .send({
      screens: [
        {
          blocks: [{ type: "paragraph", spans: [{ text: "More." }] }],
          sources: [{ title: "The deck, card 1" }],
        },
      ],
    });
  expect(answered.status).toBe(201);
  expect(answered.body.screens).toEqual(["2.010"]);
  expect((await request(app).get(`${S}/help`)).body.requests).toEqual([]);

  const audit = await getPool().query(
    `SELECT action, actor_type FROM audit_log WHERE action LIKE 'help.%' ORDER BY created_at`,
  );
  expect(audit.rows.map((r) => `${r.action}:${r.actor_type}`)).toEqual([
    "help.requested:user",
    "help.answered:ai-agent",
  ]);
});
