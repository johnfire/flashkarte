-- Lesson engine content model (docs/plans/2026-09-19-lesson-engine-design.md, slice 1).
-- Additive only: nothing existing is touched. A subject (023) gains modules, lessons, numbered
-- screens and questions. Learner progress is a later slice; this is authoring and the outline.
--
-- The stage (testing / finished), the two levels of checks and the additive-only rules for a
-- finished lesson are enforced in the service, because they depend on the whole lesson. What the
-- database can guarantee on its own it does, below.

CREATE TABLE IF NOT EXISTS lesson_modules (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  title      text NOT NULL,
  position   int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lesson_modules_subject ON lesson_modules(subject_id);

CREATE TABLE IF NOT EXISTS lessons (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  -- A lesson belongs to at most one module; deleting the module leaves the lesson, unsorted.
  module_id  uuid REFERENCES lesson_modules(id) ON DELETE SET NULL,
  slug       text NOT NULL,
  title      text NOT NULL,
  summary    text NOT NULL DEFAULT '',
  -- Per lesson: testing is free to change; finished is additive-only (numbers frozen).
  stage      text NOT NULL DEFAULT 'testing' CHECK (stage IN ('testing', 'finished')),
  -- Authoring order: the tie-break that keeps the outline deterministic.
  position   int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lessons_slug_unique UNIQUE (subject_id, slug),
  -- Lets child tables prove they belong to the same subject as their lesson.
  CONSTRAINT lessons_id_subject_unique UNIQUE (id, subject_id)
);
CREATE INDEX IF NOT EXISTS idx_lessons_module ON lessons(module_id);

-- The lesson's coverage checklist: which concepts it teaches. Every concept must be tested.
CREATE TABLE IF NOT EXISTS lesson_concepts (
  lesson_id  uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  concept_id uuid NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  PRIMARY KEY (lesson_id, concept_id)
);

-- from_lesson is the prerequisite, to_lesson the dependent; the reason is required, as for concepts.
CREATE TABLE IF NOT EXISTS lesson_prerequisites (
  from_lesson uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  to_lesson   uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  reason      text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (from_lesson, to_lesson),
  CONSTRAINT lesson_prereq_no_self CHECK (from_lesson <> to_lesson),
  CONSTRAINT lesson_prereq_reason CHECK (length(btrim(reason)) > 0)
);
CREATE INDEX IF NOT EXISTS idx_lesson_prereq_to ON lesson_prerequisites(to_lesson);

-- A screen's number is a permanent exact decimal and also its sort key (213, 213.010, 213.025).
-- Unique across the whole subject. NB: order by the qualified column (ORDER BY screens.number),
-- never by an output alias called "number" cast to text, which would sort alphabetically.
CREATE TABLE IF NOT EXISTS screens (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id  uuid NOT NULL,
  lesson_id   uuid NOT NULL,
  number      numeric NOT NULL CHECK (number > 0),
  blocks      jsonb NOT NULL,
  author_kind text NOT NULL DEFAULT 'human' CHECK (author_kind IN ('human', 'ai')),
  sources     jsonb,
  -- Retired, never deleted, once a lesson is finished: hidden from new learners, kept for progress.
  retired_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT screens_number_unique UNIQUE (subject_id, number),
  CONSTRAINT screens_lesson_subject_fk FOREIGN KEY (lesson_id, subject_id)
    REFERENCES lessons(id, subject_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_screens_lesson_number ON screens(lesson_id, number);

-- Every change to a screen's content keeps the previous blocks, so an edit to a finished screen is visible.
CREATE TABLE IF NOT EXISTS screen_revisions (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  screen_id  uuid NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
  blocks     jsonb NOT NULL,
  change     text NOT NULL CHECK (change IN ('edited', 'retired')),
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_screen_revisions_screen ON screen_revisions(screen_id, changed_at);

-- A question, or (parent_id set) a variant of one: an equivalent question worded differently.
-- A variant holds only its own prompt and options; the screens that teach it and the concepts it
-- tests are its parent's, so they cannot disagree.
CREATE TABLE IF NOT EXISTS lesson_questions (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id  uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  parent_id  uuid REFERENCES lesson_questions(id) ON DELETE CASCADE,
  position   int NOT NULL DEFAULT 0,
  -- prompt: a list of blocks. options: [{correct, blocks, reason}] with blocks and reason as block lists.
  prompt     jsonb NOT NULL,
  options    jsonb NOT NULL,
  retired_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lesson_questions_not_own_parent CHECK (parent_id IS NULL OR parent_id <> id)
);
CREATE INDEX IF NOT EXISTS idx_lesson_questions_lesson ON lesson_questions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_questions_parent ON lesson_questions(parent_id);

-- RESTRICT: a screen a question teaches cannot be deleted from under it.
CREATE TABLE IF NOT EXISTS question_screens (
  question_id uuid NOT NULL REFERENCES lesson_questions(id) ON DELETE CASCADE,
  screen_id   uuid NOT NULL REFERENCES screens(id) ON DELETE RESTRICT,
  PRIMARY KEY (question_id, screen_id)
);
CREATE INDEX IF NOT EXISTS idx_question_screens_screen ON question_screens(screen_id);

CREATE TABLE IF NOT EXISTS question_concepts (
  question_id uuid NOT NULL REFERENCES lesson_questions(id) ON DELETE CASCADE,
  concept_id  uuid NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  PRIMARY KEY (question_id, concept_id)
);
