-- Courses: user-owned, ordered, cross-deck-gated groupings of decks (see
-- docs/plans/2026-09-15-courses-design.md). Distinct from deck_collections
-- (020_deck_collections.sql), which is official-content-only, flat, and has
-- no per-user rows or gating.
CREATE TABLE IF NOT EXISTS courses (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       text NOT NULL,
  description text,
  is_public   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_courses_user ON courses(user_id);

-- A deck stays a normal deck (still in "My Decks", still independently
-- studiable) while also being a course member -- this join is an additional
-- ordering layer, not an exclusive container. Gating itself is computed on
-- read from card_progress, not stored here (see courses.repository.ts).
-- position's uniqueness is DEFERRABLE: reordering rewrites every member's
-- position in one transaction, and a naive row-by-row UPDATE would collide
-- mid-transaction against a not-yet-updated sibling still holding the target
-- position. Deferring the check to COMMIT (courses.repository.ts sets this
-- per-transaction) lets the whole set land, then validates once at the end.
CREATE TABLE IF NOT EXISTS course_decks (
  course_id  uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  deck_id    uuid NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  position   int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (course_id, deck_id),
  CONSTRAINT course_decks_position_unique UNIQUE (course_id, position)
    DEFERRABLE INITIALLY IMMEDIATE
);
