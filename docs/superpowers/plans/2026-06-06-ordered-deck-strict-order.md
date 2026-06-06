# Ordered Decks — Strict Global Order (#3 slice 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a deck marked "Study in order" return its study batch in strict global `position` order, closing slice 1's known limitation.

**Architecture:** A single change to `getDueAndNewCards` in the server's study repository: join `decks` and, when `d.is_ordered`, make `c.position` the primary sort key via a `CASE`. Unordered decks are provably unaffected (the `CASE` yields `NULL` for every row, leaving the existing sort keys in control). No service, controller, DTO, client, or other-port changes.

**Tech Stack:** Express + TypeScript + Postgres. Verification via a self-contained scratch-DB `psql` script (the server has no DB-backed Jest harness, and CI runs `npm test` with the DB mocked — see Out of Scope).

**Spec:** docs/superpowers/specs/2026-06-06-ordered-deck-strict-order-design.md

---

### Task 1: Strict-order study batch for ordered decks

**Files:**

- Create: `packages/server/scripts/verify-ordered-study-order.sql`
- Modify: `packages/server/src/domains/study/study.repository.ts` (the `getDueAndNewCards` function, currently lines 9–27)

- [ ] **Step 1: Write the regression script (encodes the desired order)**

Create `packages/server/scripts/verify-ordered-study-order.sql`. It builds minimal stand-in tables (only the columns the query touches), seeds a deterministic fixture, runs the **new** ordering query against both an ordered and an unordered deck, and raises an exception (non-zero exit) if the returned order is wrong. The fixture: cards at positions 0,1,2,3; the position-0 card reviewed and **due** (included), the position-1 card reviewed but **not due** (filtered out), positions 2 and 3 new.

```sql
-- verify-ordered-study-order.sql
-- Self-contained regression check for ordered-deck strict global order (#3 slice 2).
-- Run against a throwaway DB:  psql -d <db> -v ON_ERROR_STOP=1 -f this_file.sql
-- Exits non-zero (RAISE EXCEPTION) if ordering is wrong.

BEGIN;

CREATE TEMP TABLE decks (id text PRIMARY KEY, is_ordered boolean NOT NULL DEFAULT false);
CREATE TEMP TABLE cards (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  deck_id text NOT NULL,
  content jsonb NOT NULL,
  category text,
  position int NOT NULL DEFAULT 0
);
CREATE TEMP TABLE card_progress (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  card_id text NOT NULL,
  due_at timestamptz
);

INSERT INTO decks (id, is_ordered) VALUES ('ord', true), ('unord', false);

-- Seed both decks identically: positions 0..3.
INSERT INTO cards (id, user_id, deck_id, content, position) VALUES
  ('o0','u1','ord',   '{"front":"a","back":"a"}', 0),
  ('o1','u1','ord',   '{"front":"b","back":"b"}', 1),
  ('o2','u1','ord',   '{"front":"c","back":"c"}', 2),
  ('o3','u1','ord',   '{"front":"d","back":"d"}', 3),
  ('u0','u1','unord', '{"front":"a","back":"a"}', 0),
  ('u1c','u1','unord','{"front":"b","back":"b"}', 1),
  ('u2','u1','unord', '{"front":"c","back":"c"}', 2),
  ('u3','u1','unord', '{"front":"d","back":"d"}', 3);

-- position-0 cards: reviewed and DUE (included). position-1 cards: reviewed, NOT due (filtered out).
INSERT INTO card_progress (id, user_id, card_id, due_at) VALUES
  ('p_o0','u1','o0',  now() - interval '1 day'),
  ('p_o1','u1','o1',  now() + interval '1 day'),
  ('p_u0','u1','u0',  now() - interval '1 day'),
  ('p_u1','u1','u1c', now() + interval '1 day');

-- The exact ORDER BY shipped in study.repository.ts getDueAndNewCards.
-- Ordered deck must come back in strict position order: o0, o2, o3.
DO $$
DECLARE
  got text;
BEGIN
  SELECT string_agg(id, ',') INTO got FROM (
    SELECT c.id
    FROM cards c
    JOIN decks d ON d.id = c.deck_id
    LEFT JOIN card_progress p ON p.card_id = c.id AND p.user_id = 'u1'
    WHERE c.deck_id = 'ord' AND c.user_id = 'u1'
      AND (p.id IS NULL OR p.due_at <= now())
    ORDER BY
      CASE WHEN d.is_ordered THEN c.position END ASC NULLS LAST,
      (p.id IS NULL) ASC, p.due_at ASC NULLS LAST, c.position ASC
  ) s;
  IF got IS DISTINCT FROM 'o0,o2,o3' THEN
    RAISE EXCEPTION 'ordered deck order wrong: got %, want o0,o2,o3', got;
  END IF;

  -- Unordered deck: existing behavior — reviewed/due first, then new by position: u0, u2, u3.
  SELECT string_agg(id, ',') INTO got FROM (
    SELECT c.id
    FROM cards c
    JOIN decks d ON d.id = c.deck_id
    LEFT JOIN card_progress p ON p.card_id = c.id AND p.user_id = 'u1'
    WHERE c.deck_id = 'unord' AND c.user_id = 'u1'
      AND (p.id IS NULL OR p.due_at <= now())
    ORDER BY
      CASE WHEN d.is_ordered THEN c.position END ASC NULLS LAST,
      (p.id IS NULL) ASC, p.due_at ASC NULLS LAST, c.position ASC
  ) s;
  IF got IS DISTINCT FROM 'u0,u2,u3' THEN
    RAISE EXCEPTION 'unordered deck order wrong: got %, want u0,u2,u3', got;
  END IF;

  RAISE NOTICE 'PASS: ordered=o0,o2,o3  unordered=u0,u2,u3';
END $$;

ROLLBACK;
```

- [ ] **Step 2: Demonstrate the bug (red) with the OLD ordering**

Confirm the current query does NOT guarantee strict order. Copy the script to `/tmp/old_order.sql` and hand-edit that copy to use the **old** ordering: in both `DO`-block queries delete the line `JOIN decks d ON d.id = c.deck_id` and the line `CASE WHEN d.is_ordered THEN c.position END ASC NULLS LAST,`. That leaves the original `ORDER BY (p.id IS NULL) ASC, p.due_at ASC NULLS LAST, c.position ASC`. With it, the ordered deck returns `o2,o3,o0` (new cards before the reviewed-but-due o0), so the `o0,o2,o3` assertion RAISEs.

Run:

```bash
cd packages/server && cp scripts/verify-ordered-study-order.sql /tmp/old_order.sql
# (now hand-edit /tmp/old_order.sql as described above)
DB=fk_ord_$$ && createdb "$DB" \
  ; psql -d "$DB" -v ON_ERROR_STOP=1 -f /tmp/old_order.sql ; echo "exit=$?" ; dropdb "$DB"
```

Expected: the OLD-ordering copy FAILS with `ordered deck order wrong: got o2,o3,o0` and a non-zero `exit=`.

- [ ] **Step 3: Apply the fix in `study.repository.ts`**

Replace the `getDueAndNewCards` function body. Add `JOIN decks d ON d.id = c.deck_id` and the leading `CASE` sort key. Keep the signature, params, and `CardForStudy` type unchanged.

```ts
export function getDueAndNewCards(
  userId: string,
  deckId: string,
  limit: number,
) {
  return query<CardForStudy>(
    // Ordered decks (decks.is_ordered) study in strict global position order;
    // unordered decks keep reviewed/due-first grouping (the CASE is NULL for
    // every row, so the remaining keys stay in control). Regression fixture:
    // scripts/verify-ordered-study-order.sql — update both together.
    `SELECT c.id, c.content, c.category
     FROM cards c
     JOIN decks d ON d.id = c.deck_id
     LEFT JOIN card_progress p ON p.card_id = c.id AND p.user_id = $1
     WHERE c.deck_id = $2 AND c.user_id = $1
       AND (p.id IS NULL OR p.due_at <= now())
     ORDER BY
       CASE WHEN d.is_ordered THEN c.position END ASC NULLS LAST,
       (p.id IS NULL) ASC, p.due_at ASC NULLS LAST, c.position ASC
     LIMIT $3`,
    [userId, deckId, limit],
  );
}
```

- [ ] **Step 4: Run the regression script (green)**

Run:

```bash
cd packages/server && DB=fk_ord_$$ && createdb "$DB" \
  && psql -d "$DB" -v ON_ERROR_STOP=1 -f scripts/verify-ordered-study-order.sql ; echo "exit=$?" ; dropdb "$DB"
```

Expected: `NOTICE: PASS: ordered=o0,o2,o3  unordered=u0,u2,u3` and `exit=0`.

- [ ] **Step 5: Confirm no regression in the mocked suite**

Run: `cd packages/server && npm test`
Expected: green (the study/decks tests mock `db/client`, so they are unaffected; this confirms the edited function still compiles and existing expectations hold).

- [ ] **Step 6: Typecheck/build the server**

Run: `cd packages/server && npm run build`
Expected: BUILD succeeds (no TS errors from the edit).

- [ ] **Step 7: Commit**

```bash
git add packages/server/src/domains/study/study.repository.ts packages/server/scripts/verify-ordered-study-order.sql
git commit -m "feat(server): ordered decks study in strict global position order (#3)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Verify end-to-end

- [ ] **Step 1: Full server suite + build (final gate)**

Run: `cd packages/server && npm test && npm run build`
Expected: tests green; build succeeds.

- [ ] **Step 2: Ship** — push to `main` after user green-light. No migration (query-only change); the server redeploys via CI. Then comment on #3 noting slice 2 is merged and what remains (branching, card type/JSON authoring, relations/prerequisite unlock, sequence-aware SM-2, web).

---

## Out of Scope (deliberate)

- **DB-backed CI test harness.** CI runs `npm test` with Postgres mocked, and the
  server has no DB-backed Jest tests. Adding a Postgres service + migration runner
  to CI is a separate infrastructure decision, disproportionate to this one-query
  change. The scratch-DB script is the regression artifact; wiring an automated
  DB test into CI is a future task that would cover this and the rest of the repo
  layer at once.
- The script embeds a copy of the `ORDER BY`, so it guards the SQL logic, not that
  the repo string matches byte-for-byte. The paired code comments (in both files)
  flag that they must change together.
- Everything in the later #3 passes: branching, card `type`/JSON-content authoring,
  card relations / prerequisite unlock, sequence-aware SM-2, web support.
