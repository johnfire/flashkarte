-- A structured course can be private, community-published, or app-maintained.
-- Adding a public course creates a per-learner membership; lesson progress stays
-- keyed to the learner and is never shared with the author or other learners.
ALTER TABLE subjects
  ADD COLUMN IF NOT EXISTS is_official boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_subjects_catalog
  ON subjects(is_official, title)
  WHERE is_public;

CREATE TABLE IF NOT EXISTS subject_enrollments (
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_subject_enrollments_subject
  ON subject_enrollments(subject_id);
