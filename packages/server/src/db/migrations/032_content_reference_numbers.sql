-- A stable, human-readable identifier for every deck and course. One shared
-- sequence makes the number unique across all three content models, while the
-- UUID primary keys remain the internal identifiers used by relationships.
CREATE SEQUENCE content_reference_number_seq AS integer START WITH 1;

ALTER TABLE decks ADD COLUMN reference_number integer;
ALTER TABLE courses ADD COLUMN reference_number integer;
ALTER TABLE subjects ADD COLUMN reference_number integer;

UPDATE decks
SET reference_number = nextval('content_reference_number_seq')
WHERE reference_number IS NULL;

UPDATE courses
SET reference_number = nextval('content_reference_number_seq')
WHERE reference_number IS NULL;

UPDATE subjects
SET reference_number = nextval('content_reference_number_seq')
WHERE reference_number IS NULL;

ALTER TABLE decks
  ALTER COLUMN reference_number SET DEFAULT nextval('content_reference_number_seq'),
  ALTER COLUMN reference_number SET NOT NULL,
  ADD CONSTRAINT decks_reference_number_unique UNIQUE (reference_number),
  ADD CONSTRAINT decks_reference_number_positive CHECK (reference_number > 0);

ALTER TABLE courses
  ALTER COLUMN reference_number SET DEFAULT nextval('content_reference_number_seq'),
  ALTER COLUMN reference_number SET NOT NULL,
  ADD CONSTRAINT courses_reference_number_unique UNIQUE (reference_number),
  ADD CONSTRAINT courses_reference_number_positive CHECK (reference_number > 0);

ALTER TABLE subjects
  ALTER COLUMN reference_number SET DEFAULT nextval('content_reference_number_seq'),
  ALTER COLUMN reference_number SET NOT NULL,
  ADD CONSTRAINT subjects_reference_number_unique UNIQUE (reference_number),
  ADD CONSTRAINT subjects_reference_number_positive CHECK (reference_number > 0);
