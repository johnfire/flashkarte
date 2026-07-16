# flashkarte Phase 1B — Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Build the `packages/server` Express + TypeScript + Postgres API: accounts (signup/login/refresh/logout), decks, cards, Markdown import, SM-2 study/review, per-deck stats, client-error logging — reusing the notes-world conventions and the `@flashkarte/shared` parser + SM-2.

**Architecture:** route → controller → service → repository layering. JWT access (15 min) + hashed refresh token in an httpOnly cookie. Postgres via `pg` with append-only SQL migrations run at startup. Every row scoped by `user_id`. Authoritative SM-2 scheduling on the server using `@flashkarte/shared`.

**Tech Stack:** Express 4, TypeScript, pg, bcrypt, jsonwebtoken, cookie-parser, helmet, cors, express-rate-limit, multer (file upload), Jest + ts-jest + supertest.

> **Spec:** `docs/superpowers/specs/2026-06-04-flashkarte-phase1-mvp-design.md` (§4 data model, §6 SM-2, §7 API). **Series:** 1A ✅ → 1B (this) → 1C frontend → 1D deploy.

---

### Task 1: Server package skeleton + deps

**Files:** Create `packages/server/{package.json,tsconfig.json,jest.config.js}`, `packages/server/src/index.ts` (temp).

- [ ] **Step 1:** Create `packages/server/package.json`:

```json
{
  "name": "@flashkarte/server",
  "version": "0.1.0",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "start": "node dist/server.js",
    "dev": "ts-node-dev --respawn src/server.ts",
    "test": "jest",
    "migrate": "ts-node src/db/migrate.ts"
  },
  "dependencies": {
    "@flashkarte/shared": "0.1.0",
    "bcrypt": "^5.1.1",
    "cookie-parser": "^1.4.6",
    "cors": "^2.8.5",
    "express": "^4.19.2",
    "express-rate-limit": "^7.2.0",
    "helmet": "^7.1.0",
    "jsonwebtoken": "^9.0.2",
    "morgan": "^1.10.0",
    "multer": "^1.4.5-lts.1",
    "pg": "^8.11.5"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.2",
    "@types/cookie-parser": "^1.4.7",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.12",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/morgan": "^1.9.9",
    "@types/multer": "^1.4.11",
    "@types/node": "^20.12.0",
    "@types/pg": "^8.11.5",
    "@types/supertest": "^6.0.2",
    "jest": "^29.7.0",
    "supertest": "^7.0.0",
    "ts-jest": "^29.1.2",
    "ts-node": "^10.9.2",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2:** Create `packages/server/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["src/**/*.test.ts"]
}
```

- [ ] **Step 3:** Create `packages/server/jest.config.js`:

```js
/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.test.ts"],
};
```

- [ ] **Step 4:** Create temp `packages/server/src/index.ts` with `export {};`

- [ ] **Step 5:** From repo root run `npm install`. Expected: deps resolve, `@flashkarte/shared` linked.

- [ ] **Step 6:** Commit: `chore(server): skeleton + deps`.

---

### Task 2: Config, errors, wrapAsync, logger

**Files:** Create `src/config/env.ts`, `src/utils/errors.ts`, `src/utils/wrapAsync.ts`, `src/utils/logger.ts`, `src/types/express.d.ts`.

- [ ] **Step 1:** `src/utils/errors.ts`:

```ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public httpStatus: number,
    public context?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: unknown) {
    super(message, "VALIDATION_ERROR", 422, context);
  }
}

export class AuthError extends AppError {
  constructor(message = "Authentication required") {
    super(message, "UNAUTHENTICATED", 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, "FORBIDDEN", 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(message, "NOT_FOUND", 404);
  }
}
```

- [ ] **Step 2:** `src/utils/wrapAsync.ts`:

```ts
import { Request, Response, NextFunction, RequestHandler } from "express";

export function wrapAsync(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => fn(req, res, next).catch(next);
}
```

- [ ] **Step 3:** `src/utils/logger.ts` (ported from notes-world — JSON lines to console + optional file):

```ts
import fs from "fs";
import path from "path";

const LOG_DIR = process.env.LOG_DIR;
let fileStream: fs.WriteStream | null = null;
if (LOG_DIR) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    fileStream = fs.createWriteStream(path.join(LOG_DIR, "flashkarte.log"), {
      flags: "a",
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("logger: failed to open log file", err);
  }
}

type Level = "info" | "warn" | "error";
function write(level: Level, msg: string, meta?: Record<string, unknown>) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    msg,
    ...(meta ?? {}),
  });
  (level === "error" ? console.error : console.log)(line);
  fileStream?.write(line + "\n");
}

export const logger = {
  info: (m: string, meta?: Record<string, unknown>) => write("info", m, meta),
  warn: (m: string, meta?: Record<string, unknown>) => write("warn", m, meta),
  error: (m: string, meta?: Record<string, unknown>) => write("error", m, meta),
};
```

- [ ] **Step 4:** `src/config/env.ts`:

```ts
function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} must be set`);
  return v;
}

export function validateEnv() {
  const NODE_ENV = process.env.NODE_ENV ?? "development";
  if (NODE_ENV === "production") {
    required("JWT_SECRET");
    required("CORS_ORIGIN");
    required("POSTGRES_PASSWORD");
  }
  return {
    NODE_ENV,
    PORT: parseInt(process.env.PORT ?? "3001", 10),
  };
}

export function getJwtSecret(): string {
  return process.env.JWT_SECRET ?? "dev-insecure-secret-change-me";
}
```

- [ ] **Step 5:** `src/types/express.d.ts` (augment Request with userId):

```ts
import "express";
declare module "express-serve-static-core" {
  interface Request {
    userId?: string;
  }
}
```

- [ ] **Step 6:** Commit: `feat(server): config, errors, wrapAsync, logger`.

---

### Task 3: DB client + migrations runner

**Files:** Create `src/db/client.ts`, `src/db/migrate.ts`, `src/db/migrations/001_init.sql`.

- [ ] **Step 1:** `src/db/client.ts`:

```ts
import { Pool, QueryResultRow } from "pg";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.POSTGRES_HOST ?? "localhost",
      port: parseInt(process.env.POSTGRES_PORT ?? "5432", 10),
      database: process.env.POSTGRES_DB ?? "flashkarte",
      user: process.env.POSTGRES_USER ?? "flashkarte",
      password: process.env.POSTGRES_PASSWORD ?? "flashkarte",
    });
  }
  return pool;
}

export async function query<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const res = await getPool().query<T>(text, params);
  return res.rows;
}

export async function queryOne<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
```

- [ ] **Step 2:** `src/db/migrations/001_init.sql` (idempotent):

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         citext UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role          text NOT NULL DEFAULT 'user',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);

CREATE TABLE IF NOT EXISTS decks (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           text NOT NULL,
  source_filename text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_decks_user ON decks(user_id);

CREATE TABLE IF NOT EXISTS cards (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deck_id    uuid NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  type       text NOT NULL DEFAULT 'basic',
  content    jsonb NOT NULL,
  category   text,
  position   int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cards_deck ON cards(deck_id);

CREATE TABLE IF NOT EXISTS card_progress (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id          uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  repetitions      int NOT NULL DEFAULT 0,
  ease_factor      real NOT NULL DEFAULT 2.5,
  interval_days    int NOT NULL DEFAULT 0,
  due_at           timestamptz NOT NULL DEFAULT now(),
  last_reviewed_at timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, card_id)
);
CREATE INDEX IF NOT EXISTS idx_card_progress_due ON card_progress(user_id, due_at);
```

- [ ] **Step 3:** `src/db/migrate.ts` (runs every .sql in order; tracks applied):

```ts
import fs from "fs";
import path from "path";
import { Pool } from "pg";
import { getPool } from "./client";

export async function runMigrations(pool: Pool = getPool()): Promise<void> {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS _migrations (
       name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`,
  );
  const dir = path.join(__dirname, "migrations");
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const done = await pool.query("SELECT 1 FROM _migrations WHERE name = $1", [
      file,
    ]);
    if (done.rowCount) continue;
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    await pool.query(sql);
    await pool.query("INSERT INTO _migrations(name) VALUES ($1)", [file]);
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
```

- [ ] **Step 4:** Commit: `feat(server): pg client + migration runner + initial schema`.

---

### Task 4: Auth domain (TDD via contract tests)

**Files:** Create `src/domains/auth/{auth.service.ts,auth.repository.ts,auth.controller.ts,auth.routes.ts}`, `src/middleware/{auth.ts,errorHandler.ts}`, `src/app.ts`, and `src/domains/auth/auth.routes.test.ts`.

Mirror notes-world: bcrypt password, JWT access via `jsonwebtoken`, refresh token = random 32-byte hex stored sha256-hashed, httpOnly+secure+sameSite=strict cookie.

- [ ] **Step 1:** Write `src/middleware/errorHandler.ts`:

```ts
import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors";
import { logger } from "../utils/logger";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.httpStatus).json({
      error: { code: err.code, message: err.message, context: err.context },
    });
    return;
  }
  logger.error("Unhandled error", {
    method: req.method,
    path: req.originalUrl,
    userId: req.userId,
    message: err.message,
    stack: err.stack,
  });
  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
    },
  });
}
```

- [ ] **Step 2:** Write `src/middleware/auth.ts`:

```ts
import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../domains/auth/auth.service";
import { AuthError } from "../utils/errors";

export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer "))
    throw new AuthError("Authorization header required");
  const payload = verifyAccessToken(header.slice(7));
  req.userId = payload.sub;
  next();
}
```

- [ ] **Step 3:** Write `src/domains/auth/auth.repository.ts`:

```ts
import { query, queryOne } from "../../db/client";

export interface UserRow {
  id: string;
  email: string;
  role: string;
}
interface UserWithHash extends UserRow {
  password_hash: string;
}

export function findByEmailWithHash(email: string) {
  return queryOne<UserWithHash>(
    "SELECT id, email, role, password_hash FROM users WHERE email = $1",
    [email],
  );
}

export function createUser(email: string, passwordHash: string) {
  return queryOne<UserRow>(
    "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, role",
    [email, passwordHash],
  );
}

export function storeRefreshToken(
  userId: string,
  tokenHash: string,
  expiresAt: Date,
) {
  return query(
    "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
    [userId, tokenHash, expiresAt],
  );
}

export function findRefreshToken(tokenHash: string) {
  return queryOne<{ user_id: string; expires_at: Date }>(
    "SELECT user_id, expires_at FROM refresh_tokens WHERE token_hash = $1",
    [tokenHash],
  );
}

export function deleteRefreshToken(tokenHash: string) {
  return query("DELETE FROM refresh_tokens WHERE token_hash = $1", [tokenHash]);
}
```

- [ ] **Step 4:** Write `src/domains/auth/auth.service.ts`:

```ts
import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "../../config/env";
import { ValidationError, AuthError } from "../../utils/errors";
import * as repo from "./auth.repository";

const BCRYPT_ROUNDS = 12;
export const ACCESS_TOKEN_TTL_SEC = 15 * 60;
const REFRESH_TOKEN_TTL_DAYS = 30;

export interface JwtPayload {
  sub: string;
  email: string;
}

function signAccessToken(userId: string, email: string): string {
  return jwt.sign({ sub: userId, email } satisfies JwtPayload, getJwtSecret(), {
    expiresIn: ACCESS_TOKEN_TTL_SEC,
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, getJwtSecret()) as JwtPayload;
  } catch {
    throw new AuthError("Invalid or expired token");
  }
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function issueTokens(userId: string, email: string) {
  const accessToken = signAccessToken(userId, email);
  const rawRefresh = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 86400_000);
  await repo.storeRefreshToken(userId, hashToken(rawRefresh), expiresAt);
  return { accessToken, rawRefresh };
}

function validateCredentials(
  email: unknown,
  password: unknown,
): [string, string] {
  if (typeof email !== "string" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    throw new ValidationError("A valid email is required");
  if (typeof password !== "string" || password.length < 8)
    throw new ValidationError("Password must be at least 8 characters");
  return [email.toLowerCase(), password];
}

export async function signup(emailIn: unknown, passwordIn: unknown) {
  const [email, password] = validateCredentials(emailIn, passwordIn);
  const existing = await repo.findByEmailWithHash(email);
  if (existing)
    throw new ValidationError("An account with this email already exists");
  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await repo.createUser(email, hash);
  if (!user) throw new Error("Failed to create user");
  const { accessToken, rawRefresh } = await issueTokens(user.id, user.email);
  return { user, accessToken, rawRefresh };
}

export async function login(emailIn: unknown, passwordIn: unknown) {
  const [email, password] = validateCredentials(emailIn, passwordIn);
  const row = await repo.findByEmailWithHash(email);
  if (!row || !(await bcrypt.compare(password, row.password_hash)))
    throw new AuthError("Invalid email or password");
  const { accessToken, rawRefresh } = await issueTokens(row.id, row.email);
  return {
    user: { id: row.id, email: row.email, role: row.role },
    accessToken,
    rawRefresh,
  };
}

export async function refresh(rawRefresh: string | undefined) {
  if (!rawRefresh) throw new AuthError("No refresh token");
  const found = await repo.findRefreshToken(hashToken(rawRefresh));
  if (!found || found.expires_at < new Date())
    throw new AuthError("Invalid refresh token");
  // For v1 we re-sign access only (refresh rotation can come later).
  const access = jwt.sign({ sub: found.user_id, email: "" }, getJwtSecret(), {
    expiresIn: ACCESS_TOKEN_TTL_SEC,
  });
  return { accessToken: access };
}

export async function logout(rawRefresh: string | undefined) {
  if (rawRefresh) await repo.deleteRefreshToken(hashToken(rawRefresh));
}
```

- [ ] **Step 5:** Write `src/domains/auth/auth.controller.ts` (sets the refresh cookie):

```ts
import { Request, Response } from "express";
import { wrapAsync } from "../../utils/wrapAsync";
import * as service from "./auth.service";

const REFRESH_COOKIE = "fk_refresh";
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: 30 * 86400_000,
  path: "/api/auth",
};

export const signup = wrapAsync(async (req: Request, res: Response) => {
  const { user, accessToken, rawRefresh } = await service.signup(
    req.body.email,
    req.body.password,
  );
  res.cookie(REFRESH_COOKIE, rawRefresh, COOKIE_OPTS);
  res
    .status(201)
    .json({ user, accessToken, expiresIn: service.ACCESS_TOKEN_TTL_SEC });
});

export const login = wrapAsync(async (req: Request, res: Response) => {
  const { user, accessToken, rawRefresh } = await service.login(
    req.body.email,
    req.body.password,
  );
  res.cookie(REFRESH_COOKIE, rawRefresh, COOKIE_OPTS);
  res.json({ user, accessToken, expiresIn: service.ACCESS_TOKEN_TTL_SEC });
});

export const refresh = wrapAsync(async (req: Request, res: Response) => {
  const { accessToken } = await service.refresh(req.cookies?.[REFRESH_COOKIE]);
  res.json({ accessToken, expiresIn: service.ACCESS_TOKEN_TTL_SEC });
});

export const logout = wrapAsync(async (req: Request, res: Response) => {
  await service.logout(req.cookies?.[REFRESH_COOKIE]);
  res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
  res.status(204).end();
});
```

- [ ] **Step 6:** Write `src/domains/auth/auth.routes.ts`:

```ts
import { Router } from "express";
import * as ctrl from "./auth.controller";

export const authRouter = Router();
authRouter.post("/signup", ctrl.signup);
authRouter.post("/login", ctrl.login);
authRouter.post("/refresh", ctrl.refresh);
authRouter.post("/logout", ctrl.logout);
```

- [ ] **Step 7:** Write `src/app.ts` (createApp; mounts auth public, everything else behind requireAuth):

```ts
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { authRouter } from "./domains/auth/auth.routes";
import { requireAuth } from "./middleware/auth";
import { errorHandler } from "./middleware/errorHandler";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "5mb" }));
  app.use(cookieParser());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.use("/api/auth", authRouter);

  // (deck/study/client-error routers mounted in later tasks)
  app.use("/api", requireAuth);

  app.use(errorHandler);
  return app;
}
```

- [ ] **Step 8:** Write the failing contract test `src/domains/auth/auth.routes.test.ts`:

```ts
import request from "supertest";

jest.mock("./auth.service");
jest.mock("../../db/client", () => ({
  getPool: jest.fn(),
  query: jest.fn(),
  queryOne: jest.fn(),
  closePool: jest.fn(),
}));

import * as service from "./auth.service";
import { createApp } from "../../app";

const mock = service as jest.Mocked<typeof service>;
const app = createApp();
beforeEach(() => jest.clearAllMocks());

describe("auth routes", () => {
  test("POST /api/auth/signup -> 201 with user + token, sets refresh cookie", async () => {
    mock.signup.mockResolvedValue({
      user: { id: "u1", email: "a@b.com", role: "user" },
      accessToken: "tok",
      rawRefresh: "raw",
    } as never);
    (mock as unknown as { ACCESS_TOKEN_TTL_SEC: number }).ACCESS_TOKEN_TTL_SEC =
      900;

    const res = await request(app)
      .post("/api/auth/signup")
      .send({ email: "a@b.com", password: "password123" });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe("a@b.com");
    expect(res.body.accessToken).toBe("tok");
    expect(res.headers["set-cookie"][0]).toMatch(/fk_refresh=/);
  });

  test("POST /api/auth/login -> 200", async () => {
    mock.login.mockResolvedValue({
      user: { id: "u1", email: "a@b.com", role: "user" },
      accessToken: "tok",
      rawRefresh: "raw",
    } as never);
    (mock as unknown as { ACCESS_TOKEN_TTL_SEC: number }).ACCESS_TOKEN_TTL_SEC =
      900;
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "a@b.com", password: "password123" });
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 9:** Run `npm test --workspace=packages/server`. Iterate until green. (`ACCESS_TOKEN_TTL_SEC` is a real export; the test stubs it on the mocked module.)

- [ ] **Step 10:** Commit: `feat(server): auth domain (signup/login/refresh/logout) + app shell`.

---

### Task 5: Decks domain + Markdown import

**Files:** `src/domains/decks/{decks.repository.ts,decks.service.ts,decks.controller.ts,decks.routes.ts}`, test `decks.routes.test.ts`. Mount in `app.ts` behind `requireAuth`.

- [ ] **Step 1:** `decks.repository.ts` — `createDeck`, `insertCards` (bulk), `listDecksWithCounts(userId)`, `getDeck(userId,id)`, `getCards(userId,deckId)`, `renameDeck`, `deleteDeck`. All scoped by `user_id`. Card `content` stored as `jsonb` = `{ front, back }`.

```ts
import { query, queryOne } from "../../db/client";
import { ParsedCard } from "@flashkarte/shared";

export interface DeckRow {
  id: string;
  title: string;
  source_filename: string | null;
  created_at: string;
  updated_at: string;
}

export function createDeck(
  userId: string,
  title: string,
  sourceFilename: string | null,
) {
  return queryOne<DeckRow>(
    `INSERT INTO decks (user_id, title, source_filename)
     VALUES ($1, $2, $3) RETURNING id, title, source_filename, created_at, updated_at`,
    [userId, title, sourceFilename],
  );
}

export async function insertCards(
  userId: string,
  deckId: string,
  cards: ParsedCard[],
) {
  let i = 0;
  for (const c of cards) {
    await query(
      `INSERT INTO cards (user_id, deck_id, type, content, category, position)
       VALUES ($1, $2, 'basic', $3, $4, $5)`,
      [
        userId,
        deckId,
        JSON.stringify({ front: c.front, back: c.back }),
        c.category,
        i++,
      ],
    );
  }
}

export function listDecksWithCounts(userId: string) {
  return query<DeckRow & { card_count: string; due_count: string }>(
    `SELECT d.id, d.title, d.source_filename, d.created_at, d.updated_at,
       (SELECT count(*) FROM cards c WHERE c.deck_id = d.id) AS card_count,
       (SELECT count(*) FROM cards c
          LEFT JOIN card_progress p ON p.card_id = c.id AND p.user_id = $1
          WHERE c.deck_id = d.id AND (p.id IS NULL OR p.due_at <= now())) AS due_count
     FROM decks d WHERE d.user_id = $1 ORDER BY d.updated_at DESC`,
    [userId],
  );
}

export function getDeck(userId: string, id: string) {
  return queryOne<DeckRow>(
    `SELECT id, title, source_filename, created_at, updated_at
     FROM decks WHERE id = $1 AND user_id = $2`,
    [id, userId],
  );
}

export function getCards(userId: string, deckId: string) {
  return query<{
    id: string;
    type: string;
    content: { front: string; back: string };
    category: string | null;
    position: number;
  }>(
    `SELECT id, type, content, category, position FROM cards
     WHERE deck_id = $1 AND user_id = $2 ORDER BY position ASC`,
    [deckId, userId],
  );
}

export function renameDeck(userId: string, id: string, title: string) {
  return queryOne<DeckRow>(
    `UPDATE decks SET title = $1, updated_at = now()
     WHERE id = $2 AND user_id = $3 RETURNING id, title, source_filename, created_at, updated_at`,
    [title, id, userId],
  );
}

export function deleteDeck(userId: string, id: string) {
  return queryOne<{ id: string }>(
    "DELETE FROM decks WHERE id = $1 AND user_id = $2 RETURNING id",
    [id, userId],
  );
}
```

- [ ] **Step 2:** `decks.service.ts` — `importDeck(userId, markdown, filename?)` uses `parseDeck` from shared; throws `ValidationError("Deck has no cards...")` if zero cards; creates deck + cards in order. Plus `list`, `get` (404 via NotFoundError), `rename`, `remove`.

```ts
import { parseDeck } from "@flashkarte/shared";
import { ValidationError, NotFoundError } from "../../utils/errors";
import * as repo from "./decks.repository";

export async function importDeck(
  userId: string,
  markdown: unknown,
  filename: string | null = null,
) {
  if (typeof markdown !== "string" || !markdown.trim())
    throw new ValidationError("Markdown content is required");
  const parsed = parseDeck(markdown, filename ?? "");
  if (parsed.cards.length === 0)
    throw new ValidationError("Deck has no cards — check the Markdown format");
  const deck = await repo.createDeck(userId, parsed.title, filename);
  if (!deck) throw new Error("Failed to create deck");
  await repo.insertCards(userId, deck.id, parsed.cards);
  return { ...deck, card_count: parsed.cards.length };
}

export function list(userId: string) {
  return repo.listDecksWithCounts(userId);
}

export async function get(userId: string, id: string) {
  const deck = await repo.getDeck(userId, id);
  if (!deck) throw new NotFoundError("Deck not found");
  const cards = await repo.getCards(userId, id);
  return { ...deck, cards };
}

export async function rename(userId: string, id: string, title: unknown) {
  if (typeof title !== "string" || !title.trim())
    throw new ValidationError("Title is required");
  const deck = await repo.renameDeck(userId, id, title.trim());
  if (!deck) throw new NotFoundError("Deck not found");
  return deck;
}

export async function remove(userId: string, id: string) {
  const deleted = await repo.deleteDeck(userId, id);
  if (!deleted) throw new NotFoundError("Deck not found");
}
```

- [ ] **Step 3:** `decks.controller.ts` — `create` accepts JSON `{ title?, markdown }` OR a multipart file (`multer().single("file")`, read `req.file.buffer.toString("utf8")`, filename from `req.file.originalname`). `list`, `get`, `rename`, `remove`. All use `req.userId!`.

```ts
import { Request, Response } from "express";
import { wrapAsync } from "../../utils/wrapAsync";
import * as service from "./decks.service";

export const create = wrapAsync(async (req: Request, res: Response) => {
  const markdown = req.file
    ? req.file.buffer.toString("utf8")
    : req.body.markdown;
  const filename = req.file ? req.file.originalname : (req.body.title ?? null);
  const deck = await service.importDeck(req.userId!, markdown, filename);
  res.status(201).json(deck);
});

export const list = wrapAsync(async (req: Request, res: Response) => {
  res.json(await service.list(req.userId!));
});

export const get = wrapAsync(async (req: Request, res: Response) => {
  res.json(await service.get(req.userId!, req.params.id));
});

export const rename = wrapAsync(async (req: Request, res: Response) => {
  res.json(await service.rename(req.userId!, req.params.id, req.body.title));
});

export const remove = wrapAsync(async (req: Request, res: Response) => {
  await service.remove(req.userId!, req.params.id);
  res.status(204).end();
});
```

- [ ] **Step 4:** `decks.routes.ts`:

```ts
import { Router } from "express";
import multer from "multer";
import * as ctrl from "./decks.controller";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});
export const decksRouter = Router();
decksRouter.get("/", ctrl.list);
decksRouter.post("/", upload.single("file"), ctrl.create);
decksRouter.get("/:id", ctrl.get);
decksRouter.patch("/:id", ctrl.rename);
decksRouter.delete("/:id", ctrl.remove);
```

- [ ] **Step 5:** Mount in `app.ts` after `app.use("/api", requireAuth)`: `app.use("/api/decks", decksRouter);`

- [ ] **Step 6:** Contract test `decks.routes.test.ts` (mock service + db + `requireAuth` to set `req.userId`): import happy path → 201; import zero-card → service throws ValidationError → 422; get missing → 404; list → 200 with array. Run until green.

- [ ] **Step 7:** Commit: `feat(server): decks domain + Markdown import`.

---

### Task 6: Study domain (SM-2 review + stats)

**Files:** `src/domains/study/{study.repository.ts,study.service.ts,study.controller.ts,study.routes.ts}`, test `study.routes.test.ts`. Mount behind requireAuth.

- [ ] **Step 1:** `study.repository.ts`:
  - `getDueAndNewCards(userId, deckId, limit)` — cards in deck with no progress (new) or `due_at <= now()`, joined to progress, ordered new-after-due, limited.
  - `getProgress(userId, cardId)` — current `card_progress` row or null.
  - `upsertProgress(userId, cardId, { repetitions, easeFactor, intervalDays, dueAt })` — `INSERT ... ON CONFLICT (user_id, card_id) DO UPDATE`.
  - `getStats(userId, deckId)` — counts: total cards, new (no progress), due (`due_at <= now()`), learned (`repetitions >= 1`).
  - `cardBelongsToUser(userId, cardId)` — ownership guard.

```ts
import { query, queryOne } from "../../db/client";

export interface CardForStudy {
  id: string;
  content: { front: string; back: string };
  category: string | null;
}

export function getDueAndNewCards(
  userId: string,
  deckId: string,
  limit: number,
) {
  return query<CardForStudy>(
    `SELECT c.id, c.content, c.category
     FROM cards c
     LEFT JOIN card_progress p ON p.card_id = c.id AND p.user_id = $1
     WHERE c.deck_id = $2 AND c.user_id = $1
       AND (p.id IS NULL OR p.due_at <= now())
     ORDER BY (p.id IS NULL) ASC, p.due_at ASC NULLS LAST, c.position ASC
     LIMIT $3`,
    [userId, deckId, limit],
  );
}

export function getProgressRow(userId: string, cardId: string) {
  return queryOne<{
    repetitions: number;
    ease_factor: number;
    interval_days: number;
  }>(
    `SELECT repetitions, ease_factor, interval_days
     FROM card_progress WHERE user_id = $1 AND card_id = $2`,
    [userId, cardId],
  );
}

export function cardBelongsToUser(userId: string, cardId: string) {
  return queryOne<{ id: string }>(
    "SELECT id FROM cards WHERE id = $1 AND user_id = $2",
    [cardId, userId],
  );
}

export function upsertProgress(
  userId: string,
  cardId: string,
  s: {
    repetitions: number;
    easeFactor: number;
    intervalDays: number;
    dueAt: Date;
  },
) {
  return query(
    `INSERT INTO card_progress
       (user_id, card_id, repetitions, ease_factor, interval_days, due_at, last_reviewed_at)
     VALUES ($1, $2, $3, $4, $5, $6, now())
     ON CONFLICT (user_id, card_id) DO UPDATE
       SET repetitions = EXCLUDED.repetitions, ease_factor = EXCLUDED.ease_factor,
           interval_days = EXCLUDED.interval_days, due_at = EXCLUDED.due_at,
           last_reviewed_at = now(), updated_at = now()`,
    [userId, cardId, s.repetitions, s.easeFactor, s.intervalDays, s.dueAt],
  );
}

export function getStats(userId: string, deckId: string) {
  return queryOne<{ total: string; new: string; due: string; learned: string }>(
    `SELECT
       count(c.*) AS total,
       count(*) FILTER (WHERE p.id IS NULL) AS new,
       count(*) FILTER (WHERE p.id IS NULL OR p.due_at <= now()) AS due,
       count(*) FILTER (WHERE p.repetitions >= 1) AS learned
     FROM cards c
     LEFT JOIN card_progress p ON p.card_id = c.id AND p.user_id = $1
     WHERE c.deck_id = $2 AND c.user_id = $1`,
    [userId, deckId],
  );
}
```

- [ ] **Step 2:** `study.service.ts`:
  - `getStudyBatch(userId, deckId, limit=20)` → cards.
  - `review(userId, cardId, rating)` → guard ownership (NotFoundError), load progress (default `{easiness:2.5,interval:0,repetitions:0}`), call `calculate` from shared, compute `dueAt = now + interval days`, upsert, return new state.
  - `stats(userId, deckId)` → numbers (parse counts to int).

```ts
import { calculate } from "@flashkarte/shared";
import { ValidationError, NotFoundError } from "../../utils/errors";
import * as repo from "./study.repository";

export function getStudyBatch(userId: string, deckId: string, limit = 20) {
  return repo.getDueAndNewCards(userId, deckId, limit);
}

export async function review(userId: string, cardId: unknown, rating: unknown) {
  if (typeof cardId !== "string")
    throw new ValidationError("card_id is required");
  if (
    typeof rating !== "number" ||
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5
  )
    throw new ValidationError("rating must be an integer 1-5");
  const owns = await repo.cardBelongsToUser(userId, cardId);
  if (!owns) throw new NotFoundError("Card not found");

  const row = await repo.getProgressRow(userId, cardId);
  const prev = row
    ? {
        easiness: row.ease_factor,
        interval: row.interval_days,
        repetitions: row.repetitions,
      }
    : { easiness: 2.5, interval: 0, repetitions: 0 };
  const next = calculate(prev, rating);
  const dueAt = new Date(Date.now() + next.interval * 86400_000);
  await repo.upsertProgress(userId, cardId, {
    repetitions: next.repetitions,
    easeFactor: next.easiness,
    intervalDays: next.interval,
    dueAt,
  });
  return { card_id: cardId, ...next, due_at: dueAt.toISOString() };
}

export async function stats(userId: string, deckId: string) {
  const r = await repo.getStats(userId, deckId);
  return {
    total: parseInt(r?.total ?? "0", 10),
    new: parseInt(r?.new ?? "0", 10),
    due: parseInt(r?.due ?? "0", 10),
    learned: parseInt(r?.learned ?? "0", 10),
  };
}
```

- [ ] **Step 3:** `study.controller.ts` + `study.routes.ts`:
  - `GET /api/decks/:id/study` → `getStudyBatch`
  - `GET /api/decks/:id/stats` → `stats`
  - `POST /api/study/review` → `review(req.userId!, req.body.card_id, req.body.rating)`

  Mount the study/stats deck-scoped routes on the decks router or a study router; mount `POST /api/study/review` on a `studyRouter` under `/api/study`.

- [ ] **Step 4:** Contract test `study.routes.test.ts` (mock service/db/auth): review happy → 200 with new state; review rating 6 → 422; review unknown card → service throws NotFoundError → 404; stats → 200 with the four numbers. Run until green.

- [ ] **Step 5:** Commit: `feat(server): study domain (SM-2 review + stats)`.

---

### Task 7: Client-error logging (ported) + server entrypoint + rate limits

**Files:** `src/domains/client-errors/{client-errors.controller.ts,client-errors.routes.ts}`, `src/server.ts`; modify `src/app.ts`.

- [ ] **Step 1:** Port the notes-world `client-errors` domain (public `POST /api/client-errors`, rate-limited 30/10min, input-clamped, logs via `logger.error("client-error", {...})`, returns 202). Mount **before** `app.use("/api", requireAuth)`.

- [ ] **Step 2:** Add to `app.ts` (non-test): `morgan("dev")`, global rate limit 200/min on `/api`, tighter 20/15min on `/api/auth` — same as notes-world. Skip under `NODE_ENV === "test"`.

- [ ] **Step 3:** `src/server.ts`:

```ts
import "dotenv/config";
import { validateEnv } from "./config/env";
import { createApp } from "./app";
import { getPool } from "./db/client";
import { runMigrations } from "./db/migrate";
import { logger } from "./utils/logger";

const env = validateEnv();

process.on("uncaughtException", (err) => {
  logger.error("uncaughtException", { message: err.message, stack: err.stack });
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  const err = reason instanceof Error ? reason : undefined;
  logger.error("unhandledRejection", {
    message: err?.message ?? String(reason),
    stack: err?.stack,
  });
});

async function start() {
  const pool = getPool();
  await pool.query("SELECT 1");
  await runMigrations(pool);
  createApp().listen(env.PORT, () =>
    logger.info(`flashkarte server on ${env.PORT} (${env.NODE_ENV})`),
  );
}
start();
```

- [ ] **Step 4:** Run the FULL server suite `npm test --workspace=packages/server`. All green.

- [ ] **Step 5:** Build check: `npm run build --workspace=packages/server`. No type errors.

- [ ] **Step 6:** Commit: `feat(server): client-error logging + server entrypoint + rate limits`.

---

## Self-Review Notes

- **Spec coverage:** §4 (all five tables, cards as `type`+`jsonb content`), §6 (SM-2 via shared, server-authoritative), §7 (every endpoint: auth, deck CRUD, import paste+upload, study batch, review, stats, client-errors). Security posture (§9) reused from notes-world.
- **Naming consistency:** `calculate`/`parseDeck` from shared; `ACCESS_TOKEN_TTL_SEC`, `requireAuth`, `wrapAsync`, `AppError`/`ValidationError`/`NotFoundError`/`AuthError` used consistently across tasks; cookie `fk_refresh`.
- **Deferred correctly:** refresh-token rotation, email verification (#4), password reset (#5) not implemented; in-memory rate-limit store (single container) per spec.
- **Tests:** every domain has a supertest contract test mocking service+db+auth (notes-world pattern). DB integration is exercised at deploy smoke-test time (1D), not in unit CI.
