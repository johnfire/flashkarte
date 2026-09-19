import request from "supertest";

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
      req.userId = "10000000-0000-4000-8000-0000000000b1";
      next();
    },
  };
});

import { createApp } from "../../app";
import { closePool, getPool } from "../../db/client";
import { runMigrations } from "../../db/migrate";

const USER_ID = "10000000-0000-4000-8000-0000000000b1";
const DECK_ID = "20000000-0000-4000-8000-0000000000b1";
const CARD_ID = "30000000-0000-4000-8000-0000000000b1";
const app = createApp();

beforeAll(async () => {
  if (!(process.env.POSTGRES_DB ?? "").endsWith("_test")) {
    throw new Error(
      "HTTP integration tests require POSTGRES_DB ending in _test",
    );
  }
  await runMigrations();
});
beforeEach(async () => {
  const pool = getPool();
  await pool.query("TRUNCATE TABLE users CASCADE");
  await pool.query("TRUNCATE TABLE audit_log");
  await pool.query(
    `INSERT INTO users (id, email, password_hash) VALUES ($1, 'http-subjects@example.com', 'x')`,
    [USER_ID],
  );
  await pool.query(
    `INSERT INTO decks (id, user_id, title) VALUES ($1, $2, 'D')`,
    [DECK_ID, USER_ID],
  );
  await pool.query(
    `INSERT INTO cards (id, user_id, deck_id, type, content, position)
     VALUES ($1, $2, $3, 'basic', '{"front":"Q","back":"A"}'::jsonb, 0)`,
    [CARD_ID, USER_ID, DECK_ID],
  );
});
afterAll(async () => {
  await closePool();
});

const edge = {
  from: "token",
  to: "embedding",
  strength: "requires",
  reason: "an embedding is what a token id becomes",
};

test("import, progress, cycle rejection and audit trail over real HTTP", async () => {
  const imported = await request(app)
    .post("/api/subjects/import")
    .send({
      title: "Mini transformers",
      concepts: [
        { slug: "token", name: "Token", kind: "term", cards: [CARD_ID] },
        { slug: "embedding", name: "Embedding", kind: "idea" },
      ],
      edges: [edge],
    });
  expect(imported.status).toBe(201);
  const subjectId: string = imported.body.subject.id;

  const progress = await request(app).get(
    `/api/subjects/${subjectId}/progress`,
  );
  expect(progress.status).toBe(200);
  expect(progress.body.frontier).toEqual(["token"]);
  expect(progress.body.summary.total).toBe(2);

  const cycle = await request(app)
    .put(`/api/subjects/${subjectId}/edges`)
    .send({
      from: "embedding",
      to: "token",
      strength: "requires",
      reason: "wrong way round",
    });
  expect(cycle.status).toBe(422);
  expect(cycle.body.error.message).toMatch(/cycle/);

  const lint = await request(app).get(`/api/subjects/${subjectId}/lint`);
  expect(lint.body).toEqual({ issues: [] });

  const audit = await getPool().query(
    `SELECT action, actor_type, actor_id, target_type, target_id, outcome
     FROM audit_log WHERE actor_id = $1 ORDER BY created_at`,
    [USER_ID],
  );
  expect(audit.rows).toEqual([
    {
      action: "subject.imported",
      actor_type: "user",
      actor_id: USER_ID,
      target_type: "subject",
      target_id: subjectId,
      outcome: "success",
    },
  ]);
});

test("a subject id that is not a UUID is a 404, not a 500", async () => {
  const res = await request(app).get("/api/subjects/not-a-uuid");
  expect(res.status).toBe(404);
});
