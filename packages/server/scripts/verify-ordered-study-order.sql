-- verify-ordered-study-order.sql
-- Self-contained regression check for ordered-deck strict global order (#3 slice 2).
-- Run against a throwaway DB:  psql -d <db> -v ON_ERROR_STOP=1 -f this_file.sql
-- Exits non-zero (RAISE EXCEPTION) if ordering is wrong.
--
-- Fixture is chosen so the OLD ordering (reviewed/due-first, then new by
-- position) DIVERGES from strict global position: a reviewed+due card sits at a
-- HIGHER position than a new card. Strict order keeps authored position;
-- the old grouping floats the reviewed+due card to the front.

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
--   pos 0: new
--   pos 1: reviewed + DUE      (included; higher position than the pos-0 new card)
--   pos 2: reviewed + NOT due  (filtered out)
--   pos 3: new
INSERT INTO cards (id, user_id, deck_id, content, position) VALUES
  ('o0','u1','ord',   '{"front":"a","back":"a"}', 0),
  ('o1','u1','ord',   '{"front":"b","back":"b"}', 1),
  ('o2','u1','ord',   '{"front":"c","back":"c"}', 2),
  ('o3','u1','ord',   '{"front":"d","back":"d"}', 3),
  ('u0','u1','unord', '{"front":"a","back":"a"}', 0),
  ('u1c','u1','unord','{"front":"b","back":"b"}', 1),
  ('u2','u1','unord', '{"front":"c","back":"c"}', 2),
  ('u3','u1','unord', '{"front":"d","back":"d"}', 3);

INSERT INTO card_progress (id, user_id, card_id, due_at) VALUES
  ('p_o1','u1','o1',  now() - interval '1 day'),  -- reviewed + due
  ('p_o2','u1','o2',  now() + interval '1 day'),  -- reviewed + not due (filtered)
  ('p_u1','u1','u1c', now() - interval '1 day'),  -- reviewed + due
  ('p_u2','u1','u2',  now() + interval '1 day');  -- reviewed + not due (filtered)

-- The exact ORDER BY shipped in study.repository.ts getDueAndNewCards.
DO $$
DECLARE
  got text;
BEGIN
  -- Ordered deck: strict global position order (o2 filtered out): o0, o1, o3.
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
  IF got IS DISTINCT FROM 'o0,o1,o3' THEN
    RAISE EXCEPTION 'ordered deck order wrong: got %, want o0,o1,o3', got;
  END IF;

  -- Unordered deck: existing behavior — reviewed/due first, then new by
  -- position (u2 filtered out): u1c, u0, u3.
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
  IF got IS DISTINCT FROM 'u1c,u0,u3' THEN
    RAISE EXCEPTION 'unordered deck order wrong: got %, want u1c,u0,u3', got;
  END IF;

  RAISE NOTICE 'PASS: ordered=o0,o1,o3  unordered=u1c,u0,u3';
END $$;

ROLLBACK;
