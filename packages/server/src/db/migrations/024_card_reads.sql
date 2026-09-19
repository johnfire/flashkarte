-- Reading cards (type = 'read') are lessons: read and acknowledged, never rated.
-- Reading is exposure, not evidence, so it must not touch card_progress (SR state)
-- or review_events (a rating ledger). This is its own small per-learner record.
-- Idempotent by primary key: the first read is the one that counts, so a replayed
-- offline sync can never move it.
CREATE TABLE IF NOT EXISTS card_reads (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, card_id)
);
