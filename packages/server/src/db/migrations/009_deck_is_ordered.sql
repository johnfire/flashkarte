-- 009_deck_is_ordered.sql
-- Ordered/series decks: the current card must be passed before the next unlocks.
ALTER TABLE decks ADD COLUMN IF NOT EXISTS is_ordered boolean NOT NULL DEFAULT false;
