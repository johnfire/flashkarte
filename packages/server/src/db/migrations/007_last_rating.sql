-- Per-deck learning stats (#12): remember each card's most recent rating so we
-- can show Again/Hard/Good/Easy breakdowns. Rating scale matches the study UI
-- (1=Again, 3=Hard, 4=Good, 5=Easy).
ALTER TABLE card_progress ADD COLUMN IF NOT EXISTS last_rating int;
