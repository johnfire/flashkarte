import request from "supertest";

let keyScope: string | undefined;
let currentUser = "10000000-0000-4000-8000-0000000000b1";
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

const USER = "10000000-0000-4000-8000-0000000000b1";
const STRANGER = "10000000-0000-4000-8000-0000000000b2";
const app = createApp();
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50"><rect width="100" height="50"/></svg>`;

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
    `INSERT INTO users (id, email, password_hash) VALUES ($1, 'assets-http@example.com', 'x'), ($2, 'assets-http-2@example.com', 'x')`,
    [USER, STRANGER],
  );
});
afterAll(closePool);

async function subjectId(): Promise<string> {
  return (await request(app).post("/api/subjects").send({ title: "Circuits" }))
    .body.id;
}

test("an AI key stores a diagram, sees what was cleaned, and the audit log names the AI", async () => {
  const id = await subjectId();
  keyScope = "deck";
  const made = await request(app)
    .post(`/api/subjects/${id}/assets`)
    .send({
      svg: SVG.replace("</svg>", "<script>alert(1)</script></svg>"),
      description: "A box",
    });
  expect(made.status).toBe(201);
  expect(made.body).toMatchObject({
    kind: "diagram",
    author_kind: "ai",
    removed: ["<script>"],
  });
  expect(made.body.src).toBe(`asset:${made.body.id}`);

  const audit = await getPool().query(
    `SELECT actor_type FROM audit_log WHERE action = 'asset.created'`,
  );
  expect(audit.rows[0].actor_type).toBe("ai-agent");
});

test("the image is served as a plain, sandboxed picture that can be cached", async () => {
  const id = await subjectId();
  const made = await request(app)
    .post(`/api/subjects/${id}/assets`)
    .send({ svg: SVG });
  const served = await request(app).get(
    `/api/subjects/${id}/assets/${made.body.id}`,
  );
  expect(served.status).toBe(200);
  expect(served.headers["content-type"]).toMatch(/^image\/svg\+xml/);
  expect(served.headers["content-security-policy"]).toBe(
    "default-src 'none'; style-src 'unsafe-inline'; sandbox",
  );
  expect(served.headers["x-content-type-options"]).toBe("nosniff");
  expect(served.headers["cache-control"]).toContain("immutable");
  expect(Buffer.from(served.body).toString("utf8")).toContain("<rect");
});

test("a stranger, an unknown id and a bad id all find nothing", async () => {
  const id = await subjectId();
  const made = await request(app)
    .post(`/api/subjects/${id}/assets`)
    .send({ svg: SVG });
  currentUser = STRANGER;
  expect(
    (await request(app).get(`/api/subjects/${id}/assets/${made.body.id}`))
      .status,
  ).toBe(404);
  expect(
    (await request(app).post(`/api/subjects/${id}/assets`).send({ svg: SVG }))
      .status,
  ).toBe(404);
  currentUser = USER;
  expect(
    (
      await request(app).get(
        `/api/subjects/${id}/assets/0a1b2c3d-0000-4000-8000-000000000009`,
      )
    ).status,
  ).toBe(404);
  expect(
    (await request(app).get(`/api/subjects/${id}/assets/nope`)).status,
  ).toBe(404);
});

test("a bad SVG is a 422 with a reason, and a used image cannot be deleted", async () => {
  const id = await subjectId();
  const bad = await request(app)
    .post(`/api/subjects/${id}/assets`)
    .send({ svg: "<svg>" });
  expect(bad.status).toBe(422);
  expect(bad.body.error.message).toMatch(/cannot be used/);

  const made = await request(app)
    .post(`/api/subjects/${id}/assets`)
    .send({ svg: SVG });
  await request(app)
    .post(`/api/subjects/${id}/concepts`)
    .send({ slug: "rc", name: "RC", kind: "idea" });
  await request(app)
    .post(`/api/subjects/${id}/lessons`)
    .send({ slug: "rc-basics", title: "RC", covers: ["rc"] });
  await request(app)
    .post(`/api/subjects/${id}/lessons/rc-basics/screens`)
    .send({
      blocks: [
        { type: "image", src: made.body.src, alt: "A box", display: "inline" },
      ],
    });
  const blocked = await request(app).delete(
    `/api/subjects/${id}/assets/${made.body.id}`,
  );
  expect(blocked.status).toBe(422);
  expect(blocked.body.error.message).toMatch(/still uses this image/);

  const spare = await request(app)
    .post(`/api/subjects/${id}/assets`)
    .send({ svg: SVG });
  expect(
    (await request(app).delete(`/api/subjects/${id}/assets/${spare.body.id}`))
      .status,
  ).toBe(204);
  const actions = await getPool().query(
    `SELECT action FROM audit_log WHERE action LIKE 'asset.%' ORDER BY created_at`,
  );
  expect(actions.rows.map((r) => r.action)).toEqual([
    "asset.created",
    "asset.created",
    "asset.deleted",
  ]);
});
