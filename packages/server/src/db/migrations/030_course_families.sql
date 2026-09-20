-- Multilingual course editions. A course family owns one canonical subject and
-- one or more locale-specific subject editions. Existing subjects stay outside
-- a family until an owner explicitly promotes one.
CREATE TABLE IF NOT EXISTS course_families (
  id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id              uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  canonical_subject_id uuid NOT NULL UNIQUE REFERENCES subjects(id) ON DELETE CASCADE,
  default_locale       text NOT NULL,
  created_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_course_families_user ON course_families(user_id);

ALTER TABLE subjects
  ADD COLUMN IF NOT EXISTS course_family_id uuid REFERENCES course_families(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS locale text;

CREATE UNIQUE INDEX IF NOT EXISTS subjects_course_family_locale_unique
  ON subjects(course_family_id, locale)
  WHERE course_family_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subjects_course_family ON subjects(course_family_id);

-- Locale is intentionally constrained in application code. PostgreSQL cannot
-- express full BCP-47 validation without making common variants brittle.
