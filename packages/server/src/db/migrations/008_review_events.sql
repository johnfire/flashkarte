-- 008_review_events.sql
-- Idempotency ledger + audit log for offline review sync.
CREATE TABLE IF NOT EXISTS review_events (
  event_id    uuid PRIMARY KEY,
  user_id     uuid NOT NULL,
  card_id     uuid NOT NULL,
  rating      int  NOT NULL,
  reviewed_at timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS review_events_user_card_idx
  ON review_events (user_id, card_id);
