-- School members receive shared content automatically
-- (docs/plans/2026-10-07-accounts-schools-teachers-design.md, round 5).
-- Anyone who belongs to a school (school admin, course leader or
-- participant) has no free-plan limit, so content shared with them appears
-- in their lists without an "Add" step. That is what lets the Android app,
-- which has no "Shared with you" screen, show it unchanged. Free
-- participants of independent course leaders still add content themselves,
-- because it counts toward their 10.

-- The single definition of "this user gets shares without adding them".
-- Checked live: leaving the school ends it at once.
CREATE OR REPLACE FUNCTION receives_shares_automatically(p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM users WHERE id = p_user_id AND school_id IS NOT NULL
  )
$$;

-- Decks in a shared deck-course: reached once the course is added, or
-- automatically for school members.
CREATE OR REPLACE FUNCTION deck_in_added_shared_course(p_deck_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM course_decks cd
    WHERE cd.deck_id = p_deck_id
      AND course_shared_with(cd.course_id, p_user_id)
      AND (
        receives_shares_automatically(p_user_id)
        OR EXISTS (
          SELECT 1 FROM course_subscriptions cs
          WHERE cs.course_id = cd.course_id AND cs.user_id = p_user_id
        )
      )
  )
$$;
