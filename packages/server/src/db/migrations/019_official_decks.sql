-- Official (app-owned) decks: shared, read-only, opt-in per user (#33).

-- The system account owns official decks and their cards. Fixed id so
-- promote/demote can target it without a lookup. `role = 'system'` is
-- rejected outright at login (auth.service.ts) — this row must never be a
-- real session, only an ownership anchor.
INSERT INTO users (id, email, password_hash, role)
VALUES (
  '00000000-0000-4000-8000-000000000000',
  'official@flashkarte.internal',
  -- Unreachable: not a valid bcrypt hash, and login also rejects role='system'.
  'system-account-has-no-password',
  'system'
)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE decks ADD COLUMN IF NOT EXISTS is_official boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_decks_is_official ON decks (is_official) WHERE is_official;

-- Per-user opt-in to an official deck. No card data is copied; this just
-- makes the deck appear in that user's own deck list.
CREATE TABLE IF NOT EXISTS deck_subscriptions (
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deck_id    uuid NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, deck_id)
);
CREATE INDEX IF NOT EXISTS idx_deck_subscriptions_deck ON deck_subscriptions(deck_id);
