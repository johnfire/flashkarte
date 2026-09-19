import type { Block } from "@flashkarte/shared";

/** A subject as the Learn page lists it. */
export interface LearnSubject {
  id: string;
  title: string;
  description: string | null;
  concept_count: number;
}

export type LessonAccess = "locked" | "available" | "in_progress" | "passed";

export interface OutlineUnlockInfo {
  lessonId: string;
  slug: string;
  title: string;
  reason: string;
  passed: boolean;
}
export interface LearnerLesson {
  id: string;
  slug: string;
  title: string;
  summary: string;
  stage: string | null;
  covers: string[];
  access: LessonAccess;
  paused: boolean;
  /** Questions already answered right in an unfinished lesson; null when not started or passed. */
  answered: number | null;
  result: { first_try_right: number; total: number } | null;
  unlocksAfter: OutlineUnlockInfo[];
}
export interface LearnerModule {
  id: string | null;
  title: string | null;
  lessons: LearnerLesson[];
}
export interface LearnerOutline {
  subject_id: string;
  subject_title: string;
  reviews_due: number;
  modules: LearnerModule[];
}

export interface QuestionOption {
  blocks: Block[];
}
export type LessonStep =
  | {
      kind: "screen";
      number: string;
      index: number;
      total: number;
      can_go_back: boolean;
      blocks: Block[];
    }
  | {
      kind: "question";
      question_id: string;
      presentation_id: string;
      prompt: Block[];
      options: QuestionOption[];
      answered: number;
      total: number;
      misses: number;
      help_offered: boolean;
    }
  | {
      kind: "remediation";
      number: string;
      position: number;
      of: number;
      help_offered: boolean;
      blocks: Block[];
    }
  | {
      kind: "passed";
      first_try_right: number;
      total: number;
      questions: { question_id: string; first_try: string; misses: number }[];
    }
  | { kind: "paused" };

export interface RevealedAnswer {
  correct: boolean;
  chosen_position: number;
  correct_position: number;
  reason: Block[];
  correct_reason: Block[];
  misses: number;
  help_offered: boolean;
}

export interface LessonSummary {
  slug: string;
  title: string;
  stage: string;
}
export interface LessonStepResponse {
  lesson: LessonSummary;
  resumed?: boolean;
  step: LessonStep;
}
export interface LessonAnswerResponse {
  lesson: LessonSummary;
  answer: RevealedAnswer;
  step: LessonStep;
  passed: boolean;
  unlocked: { slug: string; title: string }[];
}

export interface DueReviews {
  due: { question_id: string; lesson: string | null; due_at: string }[];
  upcoming: number;
  next_due_at: string | null;
}
export type ReviewStep =
  | Exclude<LessonStep, { kind: "passed" | "paused" }>
  | { kind: "paused" }
  | { kind: "review_done"; first_try: string | null };
export interface ReviewStepResponse {
  question_id: string;
  step: ReviewStep;
}
export interface ReviewAnswerResponse extends ReviewStepResponse {
  answer: RevealedAnswer;
  next_due_at: string | null;
}

export interface LessonScreens {
  lesson: LessonSummary;
  screens: { number: string; blocks: Block[] }[];
}
export interface ScreenComment {
  id: string;
  number: string;
  body: string;
}
