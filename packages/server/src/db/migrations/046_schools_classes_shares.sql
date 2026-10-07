-- Schools, teachers, students (docs/plans/2026-10-07-accounts-schools-teachers-design.md,
-- stage 1). Additive only: every existing account becomes an 'individual' and
-- keeps exactly the access it had.

-- One kind per login. Distinct from `role` (auth) and `account_type`
-- (entitlement): a teacher can still be gifted, a student can still be free.
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_kind text NOT NULL DEFAULT 'individual';
DO $$ BEGIN
  ALTER TABLE users ADD CONSTRAINT users_account_kind_chk
    CHECK (account_kind IN ('individual', 'school', 'teacher', 'student'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS schools (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 200),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RESTRICT: deleting a school that still has members must be a deliberate,
-- separate step, never a side effect.
ALTER TABLE users ADD COLUMN IF NOT EXISTS school_id uuid
  REFERENCES schools(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_users_school ON users(school_id) WHERE school_id IS NOT NULL;

-- A school login always belongs to its school; an individual never belongs
-- to one. Teachers and students may be independent or in a school.
DO $$ BEGIN
  ALTER TABLE users ADD CONSTRAINT users_school_membership_chk
    CHECK (
      (account_kind = 'school' AND school_id IS NOT NULL)
      OR (account_kind = 'individual' AND school_id IS NULL)
      OR account_kind IN ('teacher', 'student')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- How a teacher proved they are one: listed by their school, or interviewed
-- by the admin. No documents are stored.
CREATE TABLE IF NOT EXISTS teacher_verifications (
  user_id     uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  method      text NOT NULL CHECK (method IN ('school_roster', 'interview')),
  verified_by uuid REFERENCES users(id) ON DELETE SET NULL,
  verified_at timestamptz NOT NULL DEFAULT now(),
  note        text CHECK (note IS NULL OR length(note) <= 1000)
);

-- A teacher's group of students. Terms (end dates) arrive in stage 2.
CREATE TABLE IF NOT EXISTS classes (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id  uuid REFERENCES schools(id) ON DELETE CASCADE,
  name       text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 200),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(teacher_id);

CREATE TABLE IF NOT EXISTS class_members (
  class_id   uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (class_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_class_members_student ON class_members(student_id);

-- Audiences narrower than "everyone" (`decks.is_public` keeps meaning
-- everyone). Foreign keys clean shares up automatically when a deck, class or
-- school goes away.
--   school           -> every member of school_id (school login, teachers, students)
--   class            -> every member of class_id, plus that class's teacher
--   teacher_students -> every student in any class taught by the deck's owner
CREATE TABLE IF NOT EXISTS deck_shares (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  deck_id    uuid NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  scope      text NOT NULL CHECK (scope IN ('school', 'class', 'teacher_students')),
  school_id  uuid REFERENCES schools(id) ON DELETE CASCADE,
  class_id   uuid REFERENCES classes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (scope = 'school' AND school_id IS NOT NULL AND class_id IS NULL)
    OR (scope = 'class' AND class_id IS NOT NULL AND school_id IS NULL)
    OR (scope = 'teacher_students' AND school_id IS NULL AND class_id IS NULL)
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_deck_shares_audience
  ON deck_shares (deck_id, scope, COALESCE(school_id, class_id, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX IF NOT EXISTS idx_deck_shares_class ON deck_shares(class_id) WHERE class_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deck_shares_school ON deck_shares(school_id) WHERE school_id IS NOT NULL;

-- The single definition of "this deck is shared with this user". Every read
-- path (deck list, deck, cards, study, billing units) calls it, so the rule
-- cannot drift between them. Membership is checked live: leaving a class or
-- school ends access with no clean-up step.
CREATE OR REPLACE FUNCTION deck_shared_with(p_deck_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1
    FROM deck_shares s
    JOIN decks d ON d.id = s.deck_id
    WHERE s.deck_id = p_deck_id
      AND (
        (s.scope = 'school' AND EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = p_user_id AND u.school_id = s.school_id
        ))
        OR (s.scope = 'class' AND (
          EXISTS (
            SELECT 1 FROM class_members m
            WHERE m.class_id = s.class_id AND m.student_id = p_user_id
          )
          OR EXISTS (
            SELECT 1 FROM classes c
            WHERE c.id = s.class_id AND c.teacher_id = p_user_id
          )
        ))
        OR (s.scope = 'teacher_students' AND EXISTS (
          SELECT 1 FROM classes c
          JOIN class_members m ON m.class_id = c.id
          WHERE c.teacher_id = d.user_id AND m.student_id = p_user_id
        ))
      )
  )
$$;
