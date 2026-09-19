import request from "supertest";

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
      req.userId = "10000000-0000-4000-8000-0000000000f1";
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

const USER = "10000000-0000-4000-8000-0000000000f1";
const app = createApp();
const para = (text: string) => [{ type: "paragraph", spans: [{ text }] }];
const option = (correct: boolean) => ({
  correct,
  blocks: para("An answer"),
  reason: para("Because."),
});

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
  const pool = getPool();
  await pool.query("TRUNCATE TABLE users CASCADE");
  await pool.query("TRUNCATE TABLE audit_log");
  await pool.query(
    `INSERT INTO users (id, email, password_hash) VALUES ($1, 'lessons-http@example.com', 'x')`,
    [USER],
  );
});
afterAll(async () => {
  await closePool();
});

async function makeSubjectWithConcept(): Promise<string> {
  const subject = await request(app)
    .post("/api/subjects")
    .send({ title: "Transformers" });
  await request(app)
    .post(`/api/subjects/${subject.body.id}/concepts`)
    .send({ slug: "token", name: "Token", kind: "term" });
  return subject.body.id;
}

const lessonImport = {
  module: "Input side",
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
    {
      prompt: para("Q1"),
      options: [option(true), option(false)],
      teaches: ["s1"],
      covers: ["token"],
    },
    {
      prompt: para("Q2"),
      options: [option(true), option(false)],
      teaches: ["s2"],
      covers: ["token"],
    },
    {
      prompt: para("Q3"),
      options: [option(true), option(false)],
      teaches: ["s3", "s4"],
      covers: ["token"],
    },
  ],
};

test("author a lesson over real HTTP: import, insert a clarifying screen, finish, and the stage rules", async () => {
  const id = await makeSubjectWithConcept();
  const imported = await request(app)
    .post(`/api/subjects/${id}/lessons/import`)
    .send(lessonImport);
  expect(imported.status).toBe(201);
  expect(
    imported.body.screens.map((s: { number: string }) => s.number),
  ).toEqual(["1", "2", "3", "4"]);

  // A screen number with a decimal point works in a URL, and inserting between neighbours numbers correctly.
  const inserted = await request(app)
    .post(`/api/subjects/${id}/lessons/tokens/screens`)
    .send({ blocks: para("Clarifies 2"), place: { after: "2" } });
  expect(inserted.body.screen.number).toBe("2.010");
  const edited = await request(app)
    .patch(`/api/subjects/${id}/screens/2.010`)
    .send({ blocks: para("Clarifies 2, better") });
  expect(edited.status).toBe(200);

  expect(
    (await request(app).post(`/api/subjects/${id}/lessons/tokens/finish`))
      .status,
  ).toBe(200);
  const blocked = await request(app).delete(
    `/api/subjects/${id}/screens/2.010`,
  );
  expect(blocked.status).toBe(422);
  expect(blocked.body.error.message).toMatch(/is finished/);
  // Still additive: another insert is fine.
  expect(
    (
      await request(app)
        .post(`/api/subjects/${id}/lessons/tokens/screens`)
        .send({ blocks: para("More"), place: { after: "2.010" } })
    ).body.screen.number,
  ).toBe("2.020");

  const outline = await request(app).get(`/api/subjects/${id}/outline`);
  expect(outline.body.modules[0]).toMatchObject({ title: "Input side" });
  expect(outline.body.modules[0].lessons[0]).toMatchObject({
    slug: "tokens",
    stage: "finished",
    covers: ["Token"],
  });
});

test("a structural error is a 422 with every problem and leaves nothing behind", async () => {
  const id = await makeSubjectWithConcept();
  const bad = {
    ...lessonImport,
    screens: [{ blocks: [{ type: "image", src: "https://x.org/a.svg" }] }],
  };
  const res = await request(app)
    .post(`/api/subjects/${id}/lessons/import`)
    .send(bad);
  expect(res.status).toBe(422);
  expect(res.body.error.context.issues[0].path).toMatch(/blocks\[0\]\.alt/);
  expect((await getPool().query("SELECT 1 FROM lessons")).rowCount).toBe(0);
});

test("a write made with an AI key is attributed to the AI in both the audit log and the screen", async () => {
  const id = await makeSubjectWithConcept();
  keyScope = "deck";
  const res = await request(app)
    .post(`/api/subjects/${id}/lessons/import`)
    .send(lessonImport);
  expect(res.status).toBe(201);
  const audit = await getPool().query(
    `SELECT actor_type, action FROM audit_log WHERE action = 'lesson.imported'`,
  );
  expect(audit.rows).toEqual([
    { actor_type: "ai-agent", action: "lesson.imported" },
  ]);
  const authors = await getPool().query(
    "SELECT DISTINCT author_kind FROM screens",
  );
  expect(authors.rows).toEqual([{ author_kind: "ai" }]);
});

test("another user gets 404 for everything about the subject's lessons", async () => {
  const id = await makeSubjectWithConcept();
  await request(app)
    .post(`/api/subjects/${id}/lessons/import`)
    .send(lessonImport);
  await getPool().query(
    `INSERT INTO users (id, email, password_hash) VALUES ('10000000-0000-4000-8000-0000000000f2', 'x@example.com', 'x')`,
  );
  await getPool().query(
    "UPDATE subjects SET user_id = '10000000-0000-4000-8000-0000000000f2'",
  );
  expect(
    (await request(app).get(`/api/subjects/${id}/lessons/tokens`)).status,
  ).toBe(404);
  expect((await request(app).get(`/api/subjects/${id}/outline`)).status).toBe(
    404,
  );
});
