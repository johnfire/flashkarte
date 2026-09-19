-- "I need more on this" (slice 7). A help request is a learner's note on a screen (or a question)
-- asking the owner's AI to explain more: it uses the same queue as screen comments, with a kind, an
-- optional selected passage, and, for a question, the question it came from. The AI answers by adding
-- short sourced screens next to the one asked about; those screens remember which request they
-- answer, so the learner can be told and the screen can say where it came from. Additive only.
ALTER TABLE screen_comments
  ADD COLUMN IF NOT EXISTS kind        text NOT NULL DEFAULT 'comment',
  ADD COLUMN IF NOT EXISTS selection   text,
  ADD COLUMN IF NOT EXISTS question_id uuid REFERENCES lesson_questions(id) ON DELETE CASCADE;

DO $$ BEGIN
  ALTER TABLE screen_comments ADD CONSTRAINT screen_comments_kind CHECK (kind IN ('comment', 'help'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE screen_comments ADD CONSTRAINT screen_comments_selection
    CHECK (selection IS NULL OR length(selection) <= 500);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- A help request may have no note (the button alone); a comment still needs one.
ALTER TABLE screen_comments DROP CONSTRAINT IF EXISTS screen_comments_body;
ALTER TABLE screen_comments ADD CONSTRAINT screen_comments_body
  CHECK (length(body) <= 2000 AND (kind = 'help' OR length(btrim(body)) > 0));

CREATE INDEX IF NOT EXISTS idx_screen_comments_open_help
  ON screen_comments(user_id, created_at) WHERE kind = 'help' AND resolved_at IS NULL;

-- The request a screen was added to answer. If the request goes, the screen stays.
ALTER TABLE screens
  ADD COLUMN IF NOT EXISTS answers_request uuid REFERENCES screen_comments(id) ON DELETE SET NULL;
