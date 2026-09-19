-- Learner state for the lesson engine (docs/plans/2026-09-19-lesson-engine-design.md, slice 2).
-- Additive only. The rules live in packages/shared (lesson-session.ts); the server keeps each
-- learner's session and clients only render "the current step".

-- One row per learner per lesson. `session` is the whole LessonSession, so a learner can leave and
-- resume exactly where they were, and it stays after passing as the record of the first attempts.
CREATE TABLE IF NOT EXISTS lesson_progress (
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id  uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  status     text NOT NULL CHECK (status IN ('in_progress', 'passed')),
  session    jsonb NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  passed_at  timestamptz,
  PRIMARY KEY (user_id, lesson_id)
);

-- Every answer, append-only (like review_events): never updated or deleted, only removed with the
-- user or the question. Misses recorded here are how an owner sees which question or screen fails.
CREATE TABLE IF NOT EXISTS question_attempts (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- The top-level question, and the wording shown (the question itself or one of its variants).
  question_id     uuid NOT NULL REFERENCES lesson_questions(id) ON DELETE CASCADE,
  presentation_id uuid NOT NULL REFERENCES lesson_questions(id) ON DELETE CASCADE,
  chosen_option   int NOT NULL,
  correct         boolean NOT NULL,
  phase           text NOT NULL CHECK (phase IN ('lesson', 'review')),
  -- Misses on this question in this run after this answer.
  misses          int NOT NULL,
  attempted_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_question_attempts_question ON question_attempts(question_id, attempted_at);
CREATE INDEX IF NOT EXISTS idx_question_attempts_user ON question_attempts(user_id, attempted_at);

-- Spaced review of a passed lesson's questions, on the existing scheduler (fixed cadences).
-- `session` holds an active review loop (a miss shows the teaching screens and re-asks) between requests.
CREATE TABLE IF NOT EXISTS question_reviews (
  user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id      uuid NOT NULL REFERENCES lesson_questions(id) ON DELETE CASCADE,
  easiness         real NOT NULL DEFAULT 2.5,
  interval_days    int NOT NULL DEFAULT 0,
  repetitions      int NOT NULL DEFAULT 0,
  last_rating      int,
  due_at           timestamptz NOT NULL,
  last_reviewed_at timestamptz,
  session          jsonb,
  PRIMARY KEY (user_id, question_id)
);
CREATE INDEX IF NOT EXISTS idx_question_reviews_due ON question_reviews(user_id, due_at);
