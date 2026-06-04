# flashkarte — Phase 1 (Core Platform MVP) Design

**Date:** 2026-06-04
**Status:** Draft for review
**Scope:** Phase 1 only. Later phases are listed but not specified here.

## 1. Context

`flashkarte` is a Markdown-based flashcard app using SM-2 spaced repetition. Two
local-only apps exist today and are kept in this monorepo as reference / future
work:

- `python/` — a tkinter **desktop** app (no network, local SQLite). Reference only.
- `android/` — a Kotlin/Compose app (no network, local Room DB). Connected to the
  backend in **Phase 3**.

Both already share one Markdown deck format and the SM-2 algorithm, but neither
talks to a backend. This project turns flashkarte into a real **public SaaS**:
users sign up, and their decks + study progress live server-side, reachable from
the web app (Phase 1), their own AI via an MCP server (Phase 2), and the Android
app (Phase 3).

### Phasing (whole product)

| Phase            | Deliverable                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| **1 (this doc)** | Core platform MVP: accounts, decks/cards, import, study (SM-2), stats, web FE + BE, Docker deploy |
| 2                | MCP server + per-user API keys — users' own AI generates and pushes decks                         |
| 3                | Android app connected to the API (add networking + auth, reuse UI + SM-2)                         |
| 4                | Public deck library — publish/share/browse/copy                                                   |

**Parked (tracked as issues):** offline-first sync (#1), multiple-choice mode (#2),
card series / branching follow-ups (#3), more complex AI help, billing/paid tiers.

## 2. Phase 1 scope

**In scope**

- Email/password signup + login (JWT access + httpOnly refresh cookie).
- Create a deck by **pasting** Markdown or **uploading** a `.md` / `.txt` file.
- Parse the canonical Markdown deck format into a deck + cards.
- Study a deck: flip card, self-grade (the SM-2 1–5 rating scale), progress saved
  per-user per-card on the server.
- Basic per-deck stats (total / due / new / learned counts).
- Web frontend (React + Vite + Tailwind).
- Dockerized deploy to `flashkarte.christopherrehm.de` with CI/CD, mirroring
  notes-world.
- Error logging + graceful handling reusing the notes-world patterns.

**Out of scope for Phase 1** (later phases / issues): MCP server, Android
networking, public library, multiple-choice, card series/branching, offline sync,
billing, social/profile features beyond the account itself.

## 3. Architecture

### Monorepo layout

Mirrors the notes-world npm-workspaces structure the user already operates.

```
flashkarte/
  packages/
    server/    Express + TypeScript + Postgres API (port 3001)
    web/       React 18 + Vite + Tailwind SPA
    shared/    Shared TS: types + ported Markdown parser + SM-2 (single source of truth)
    mcp/       (Phase 2 — placeholder, not built in Phase 1)
  android/     (existing app; Phase 3 connects it)
  python/      (legacy desktop reference)
  docker-compose.yml
  nginx/       (static web + reverse proxy, like notes-world)
```

`shared/` holds the **ported Markdown parser and SM-2 algorithm as pure
functions**, so the server (authoritative) and the web app (client-side deck
preview) use identical logic, and the Phase 2 MCP server can reuse them.

### Stack & conventions (reused from notes-world)

- **Backend:** Express 4 + TypeScript, Postgres via `pg`, route → controller →
  service → repository layering, `wrapAsync`, `AppError`/`ValidationError`,
  central `errorHandler`, append-only SQL migrations, helmet, CORS (validated
  origin in prod), `express-rate-limit`, parameterized SQL, `user_id` ownership
  on every row.
- **Auth:** bcrypt passwords; JWT access token (15 min); refresh token stored
  hashed, delivered as httpOnly + secure + sameSite=strict cookie.
- **Logging:** the dependency-free JSON logger pattern (console + optional
  `LOG_DIR` file) plus a public `POST /api/client-errors` endpoint, ported from
  notes-world.
- **Frontend:** React + Vite + Tailwind, ErrorBoundary + window error handlers
  reporting to `/api/client-errors`.
- **Deploy:** `docker-compose` (app + postgres + nginx + db-backup), push-to-main
  CI/CD, domain `flashkarte.christopherrehm.de`.

## 4. Data model

All tables carry `user_id` and standard `created_at` / `updated_at`. Postgres.

### `users`

`id` (uuid pk), `email` (unique, citext), `password_hash`, `role`
(`user`|`admin`, default `user`), `created_at`, `updated_at`.

### `refresh_tokens`

`id`, `user_id` (fk), `token_hash`, `expires_at`, `created_at`.

### `decks`

`id` (uuid pk), `user_id` (fk), `title`, `source_filename` (nullable),
`created_at`, `updated_at`.

### `cards` — extensible by design (decision A)

- `id` (uuid pk)
- `user_id` (fk, denormalized for ownership checks)
- `deck_id` (fk)
- `type` (text, default `'basic'`) — discriminator for future card types
  (`multiple_choice`, `series`, …)
- `content` (jsonb) — typed by `type`. For `basic`: `{ "front": "...", "back": "..." }`.
  Future types add their own shape (MC options, follow-up links) without a schema
  change.
- `category` (text, nullable) — from the Markdown `## H2`
- `position` (int) — order within the deck
- `created_at`, `updated_at`

> **Why jsonb, not front/back columns:** issues #2 and #3 require richer card
> structures. A `type` + `content` jsonb keeps v1 trivial (`{front, back}`) while
> making MC and branching additive. Card-to-card linking for series (#3) will add
> a `card_links` table later; not built now.

### `card_progress` — per-user SM-2 state, one row per (user, card)

- `id` (uuid pk)
- `user_id` (fk)
- `card_id` (fk)
- `repetitions` (int, default 0)
- `ease_factor` (real, default 2.5)
- `interval_days` (int, default 0)
- `due_at` (timestamptz) — when the card is next due
- `last_reviewed_at` (timestamptz, nullable)
- `created_at`, `updated_at`
- unique (`user_id`, `card_id`)

A card is **new** if it has no `card_progress` row; **due** if `due_at <= now()`.

## 5. Canonical Markdown deck format

Ported verbatim from the existing `MdParser` (identical in python/ and android/).
This is the single format for paste, file upload, and (Phase 2) MCP.

```markdown
# Deck Title

## Optional Category

**1. Front of the card (the question)**
Back of the card (the answer). Can span
multiple lines; blank lines become paragraph breaks.

**2. Next question**
Its answer.

---
```

Rules:

- First `# H1` → deck title (fallback: source filename).
- `## H2` → category applied to following cards.
- `**N. text**` (numbered bold) → card front; lines until the next marker → back
  (leading/trailing blank lines trimmed; runs of blank lines collapse to
  paragraph breaks joined by `\n\n`).
- `---` horizontal rules are separators and ignored.
- A deck that parses to **zero cards** is rejected with a validation error.

The parser is reimplemented in TypeScript in `shared/` and unit-tested against the
same cases as the existing python/Kotlin parsers (parity tests).

## 6. SM-2 algorithm

Ported from the existing implementation into `shared/` as a pure function:

```
review(state, rating) -> newState
  rating: 1..5 (user self-grade; UI maps buttons → rating). Out of range → error.
  if rating < 3: repetitions = 0; interval = 1
  else:
    if repetitions == 0: interval = 1
    elif repetitions == 1: interval = 6
    else: interval = round(prev_interval * old_ease)   # uses ease BEFORE update
    repetitions += 1
  ease = max(1.3, old_ease + (0.1 - (5-rating)*(0.08 + (5-rating)*0.02)))
  due_at = now + interval days
```

(Constants and edge cases are copied verbatim from the current apps —
`python/flashmd/sm2/algorithm.py`, identical in Kotlin — and locked by parity unit
tests. Note interval is computed from the **old** ease before ease is updated. The
existing field is named `easiness`; persisted as `ease_factor`.) Scheduling is
**authoritative on the server** — the client sends a review (card_id + rating), the
server computes and persists the new state and returns the next due card.

## 7. API (Phase 1)

REST under `/api`, JSON, JWT in `Authorization: Bearer` (refresh via cookie).
`401` on missing/invalid token, `403` on cross-user access, `422` validation,
standard `{ error: { code, message } }` envelope.

**Auth**

- `POST /api/auth/signup` — { email, password } → user + access token, sets refresh cookie
- `POST /api/auth/login` — { email, password } → access token + refresh cookie
- `POST /api/auth/refresh` — refresh cookie → new access token
- `POST /api/auth/logout` — clears refresh token

**Decks**

- `GET /api/decks` — list my decks (with card counts + due counts)
- `POST /api/decks` — create from parsed Markdown: { title?, markdown } or multipart file upload
- `GET /api/decks/:id` — deck + cards
- `PATCH /api/decks/:id` — rename
- `DELETE /api/decks/:id` — delete deck + its cards + progress

**Study**

- `GET /api/decks/:id/study` — next batch of due + new cards for this deck
- `POST /api/study/review` — { card_id, rating } → updated progress + next card
- `GET /api/decks/:id/stats` — { total, new, due, learned }

**Client errors** (public, ported)

- `POST /api/client-errors` — rate-limited, input-clamped, logs only

Every deck/card/progress query is scoped by `user_id`.

## 8. Frontend (Phase 1)

React + Vite + Tailwind SPA. Screens:

- **Landing / Signup / Login** — minimal.
- **Deck list** — my decks, due counts, "New deck" button.
- **Create deck** — paste Markdown or drop a `.md`/`.txt` file; live client-side
  preview using the `shared/` parser; format help inline; save → POST.
- **Study** — show front → reveal back → self-grade buttons (mapped to the SM-2
  1–5 rating); progress bar; session summary at the end.
- **Deck stats** — counts + due-over-time at a basic level.
- Global ErrorBoundary + window handlers → `/api/client-errors`.

## 9. Error handling, logging, security

- Reuse notes-world's logger + `/api/client-errors` + ErrorBoundary patterns.
- Process-level `uncaughtException` / `unhandledRejection` handlers.
- helmet, validated CORS, layered rate limits (global + tighter on `/api/auth`).
- bcrypt, short JWT, hashed refresh tokens, secure cookies, parameterized SQL,
  per-row `user_id` ownership — same posture verified clean in notes-world.

## 10. Testing strategy

- **Parser parity tests** (`shared/`): TS parser produces the same decks/cards as
  the python/Kotlin parsers on a shared fixture set, including the zero-card
  rejection case.
- **SM-2 parity tests** (`shared/`): TS `review()` matches the existing algorithm
  across a table of (state, rating) → newState cases.
- **Server contract tests** (supertest, mocked service/db/auth, like notes-world):
  auth flow, deck CRUD ownership (403 cross-user), import (happy + zero-card 422),
  study/review state transitions, client-errors.
- **Web component tests** (vitest): create-deck preview, study flow grading,
  error boundary reports.
- All run in CI before deploy.

## 11. Deployment

- `docker-compose.yml`: `app` (Express, serves built web), `db` (postgres:16),
  `nginx` (TLS termination / static), `db-backup` — mirroring notes-world.
- Domain: `flashkarte.christopherrehm.de` (Apache/nginx → container).
- `LOG_DIR` volume for the master log (set `FLASHKARTE_LOG_PATH` on the VPS under
  `~/logs/`).
- Push-to-main CI/CD: build + test + deploy.

## 12. Decisions & deferrals

- **Email verification on signup** — deferred from v1, tracked as #4. Users can
  sign up and use the app immediately; verification lands before any marketing push.
- **Password reset** — deferred from v1, tracked as #5 (needs email infra, shared
  with #4).
- **Rate-limit store** — in-memory (single container) is fine for v1; revisit if we
  scale horizontally (same lesson as notes-world).
