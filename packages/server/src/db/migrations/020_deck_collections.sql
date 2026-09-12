-- Deck collections: groups official decks into browsable series (#33 follow-up)
-- so the App Decks page scales to hundreds/thousands of decks without a flat list.

CREATE TABLE IF NOT EXISTS deck_collections (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       citext UNIQUE NOT NULL,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- A deck belongs to at most one collection; null means standalone official
-- deck. collection_position orders members within it, assigned by
-- promote-official (append-at-end) — no manual reorder UI yet.
ALTER TABLE decks ADD COLUMN IF NOT EXISTS collection_id uuid
  REFERENCES deck_collections(id) ON DELETE SET NULL;
ALTER TABLE decks ADD COLUMN IF NOT EXISTS collection_position int;
CREATE INDEX IF NOT EXISTS idx_decks_collection ON decks (collection_id)
  WHERE collection_id IS NOT NULL;
