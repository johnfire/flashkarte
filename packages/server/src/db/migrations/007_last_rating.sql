-- Per-deck learning stats (#12): remember each card's most recent rating so we
-- can show the four rating breakdowns. Legacy numeric values remain stable:
-- (1-2=Hard, 3=Medium, 4=Good, 5=Perfect).
ALTER TABLE card_progress ADD COLUMN IF NOT EXISTS last_rating int;
