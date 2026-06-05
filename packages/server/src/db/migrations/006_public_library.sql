-- Public deck library (#21): share decks publicly and clone them.

-- Display name shown as the author of public decks (nullable; UI falls back).
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name text;

-- Deck publication state.
ALTER TABLE decks ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;
ALTER TABLE decks ADD COLUMN IF NOT EXISTS published_at timestamptz;

-- Fast lookups of the (relatively small) set of public decks.
CREATE INDEX IF NOT EXISTS idx_decks_is_public ON decks (is_public) WHERE is_public;
