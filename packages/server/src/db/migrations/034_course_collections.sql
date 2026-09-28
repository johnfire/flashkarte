-- Course Collections organize structured learning courses in the Library and
-- My Courses. They are deliberately separate from deck_collections: those
-- group flashcard decks, whereas these group Learn subjects.
CREATE TABLE IF NOT EXISTS course_collections (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       citext UNIQUE NOT NULL,
  description text,
  is_official boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- A structured course has one optional parent collection. Keeping this a
-- one-to-many relationship makes Collections a true navigation level rather
-- than an overlapping tag system. NULL keeps a course discoverable as
-- ungrouped content.
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS course_collection_id uuid
  REFERENCES course_collections(id) ON DELETE SET NULL;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS course_collection_position int;
ALTER TABLE subjects ADD CONSTRAINT subjects_course_collection_position_check
  CHECK (course_collection_position IS NULL OR course_collection_position >= 0);

CREATE INDEX IF NOT EXISTS idx_subjects_course_collection
  ON subjects(course_collection_id, course_collection_position, title)
  WHERE course_collection_id IS NOT NULL;
