-- Sharing for deck-courses and structured courses
-- (docs/plans/2026-10-07-accounts-schools-teachers-design.md, stage 1).
-- Same audiences as deck_shares (046). Additive, apart from redefining
-- deck_shared_with on top of the shared audience rule below (same result).

-- The single definition of "this audience reaches this user". Every
-- *_shared_with function calls it, so decks, deck-courses and structured
-- courses cannot drift apart. `p_owner` is the content's owner (the teacher
-- whose classes 'teacher_students' means).
--   school           -> every member of p_school (school login, teachers, students)
--   class            -> every member of p_class, plus that class's teacher
--   teacher_students -> every student in any class p_owner teaches
CREATE OR REPLACE FUNCTION share_reaches(
  p_scope text, p_school uuid, p_class uuid, p_owner uuid, p_user uuid
)
RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT CASE p_scope
    WHEN 'school' THEN EXISTS (
      SELECT 1 FROM users u WHERE u.id = p_user AND u.school_id = p_school
    )
    WHEN 'class' THEN EXISTS (
      SELECT 1 FROM class_members m
      WHERE m.class_id = p_class AND m.student_id = p_user
    ) OR EXISTS (
      SELECT 1 FROM classes c WHERE c.id = p_class AND c.teacher_id = p_user
    )
    WHEN 'teacher_students' THEN EXISTS (
      SELECT 1 FROM classes c
      JOIN class_members m ON m.class_id = c.id
      WHERE c.teacher_id = p_owner AND m.student_id = p_user
    )
    ELSE false
  END
$$;

CREATE OR REPLACE FUNCTION deck_shared_with(p_deck_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM deck_shares s JOIN decks d ON d.id = s.deck_id
    WHERE s.deck_id = p_deck_id
      AND share_reaches(s.scope, s.school_id, s.class_id, d.user_id, p_user_id)
  )
$$;

-- Deck-courses (the `courses` table: an owner's ordered, gated decks).
CREATE TABLE IF NOT EXISTS course_shares (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id  uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
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
CREATE UNIQUE INDEX IF NOT EXISTS uq_course_shares_audience
  ON course_shares (course_id, scope, COALESCE(school_id, class_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE OR REPLACE FUNCTION course_shared_with(p_course_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM course_shares s JOIN courses c ON c.id = s.course_id
    WHERE s.course_id = p_course_id
      AND share_reaches(s.scope, s.school_id, s.class_id, c.user_id, p_user_id)
  )
$$;

-- A learner's "added" shared deck-courses. Adding the course makes its decks
-- studiable through it without adding each deck to "My Decks".
CREATE TABLE IF NOT EXISTS course_subscriptions (
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id  uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, course_id)
);
CREATE INDEX IF NOT EXISTS idx_course_subscriptions_course ON course_subscriptions(course_id);

-- True when the user added a deck-course that is (still) shared with them
-- and the deck is in it. Checked live, like every share.
CREATE OR REPLACE FUNCTION deck_in_added_shared_course(p_deck_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM course_subscriptions cs
    JOIN course_decks cd ON cd.course_id = cs.course_id
    WHERE cd.deck_id = p_deck_id AND cs.user_id = p_user_id
      AND course_shared_with(cs.course_id, p_user_id)
  )
$$;

-- Structured courses (`subjects`). Learners already join through
-- subject_enrollments; a share lets them enrol without the course being public.
CREATE TABLE IF NOT EXISTS subject_shares (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
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
CREATE UNIQUE INDEX IF NOT EXISTS uq_subject_shares_audience
  ON subject_shares (subject_id, scope, COALESCE(school_id, class_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE OR REPLACE FUNCTION subject_shared_with(p_subject_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM subject_shares s JOIN subjects sj ON sj.id = s.subject_id
    WHERE s.subject_id = p_subject_id
      AND share_reaches(s.scope, s.school_id, s.class_id, sj.user_id, p_user_id)
  )
$$;
