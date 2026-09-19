import type {
  AnswerOutcome,
  LessonSession,
  SessionContent,
  Step,
} from "@flashkarte/shared";
import type { Queryable } from "../../db/queryable";
import type { LessonRow } from "../lessons/lessons.repository";
import * as questionsRepo from "../lessons/questions.repository";
import * as screensRepo from "../lessons/screens.repository";

interface StoredOption {
  correct: boolean;
  blocks: unknown;
  reason: unknown;
}
export interface LoadedPresentation {
  id: string;
  prompt: unknown;
  options: StoredOption[];
}
export interface LoadedQuestion {
  id: string;
  screens: string[];
  presentations: LoadedPresentation[];
}
export interface LoadedLesson {
  lesson: LessonRow;
  screens: Map<string, unknown>;
  questions: LoadedQuestion[];
  content: SessionContent;
}

/**
 * A lesson in the two shapes the learner side needs: the engine's content (numbers and counts, no
 * text) and the text to render. Only active screens and questions are included: a retired one is
 * hidden from learners.
 */
export async function loadLesson(
  db: Queryable,
  lesson: LessonRow,
): Promise<LoadedLesson> {
  // One after the other: `db` is often a single transaction connection, which runs one query at a time.
  const screens = await screensRepo.listScreens(db, lesson.id);
  const rows = await questionsRepo.listQuestions(db, lesson.id);
  const links = await questionsRepo.loadQuestionLinks(db, lesson.id);
  const active = screens.filter((screen) => screen.retired_at === null);
  const screenNumbers = new Set(active.map((screen) => screen.number));
  const live = rows.filter((row) => row.retired_at === null);
  const questions: LoadedQuestion[] = live
    .filter((row) => row.parent_id === null)
    .map((row) => ({
      id: row.id,
      screens: (links.screens.get(row.id) ?? []).filter((number) =>
        screenNumbers.has(number),
      ),
      presentations: [
        row,
        ...live.filter((variant) => variant.parent_id === row.id),
      ].map((p) => ({
        id: p.id,
        prompt: p.prompt,
        options: p.options,
      })),
    }));
  return {
    lesson,
    screens: new Map(active.map((screen) => [screen.number, screen.blocks])),
    questions,
    content: {
      screens: active.map((screen) => screen.number),
      questions: questions.map((question) => ({
        id: question.id,
        screens: question.screens,
        presentations: question.presentations.map((p) => ({
          id: p.id,
          optionCount: p.options.length,
          correctIndex: p.options.findIndex((option) => option.correct),
        })),
      })),
    },
  };
}

function presentationOf(
  loaded: LoadedLesson,
  questionId: string,
  presentationId: string,
): LoadedPresentation {
  const question = loaded.questions.find((q) => q.id === questionId)!;
  return question.presentations.find((p) => p.id === presentationId)!;
}

export type RenderedStep =
  | {
      kind: "screen";
      number: string;
      index: number;
      total: number;
      can_go_back: boolean;
      blocks: unknown;
    }
  | {
      kind: "question";
      question_id: string;
      presentation_id: string;
      prompt: unknown;
      /** In the order shown. No correctness and no reasons: those are revealed after the answer. */
      options: { blocks: unknown }[];
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
      blocks: unknown;
    }
  | {
      kind: "passed";
      first_try_right: number;
      total: number;
      questions: { question_id: string; first_try: string; misses: number }[];
    }
  | { kind: "paused" };

/** The step as a client sees it. Contains no correct answers. */
export function renderStep(step: Step, loaded: LoadedLesson): RenderedStep {
  switch (step.kind) {
    case "screen":
      return {
        kind: "screen",
        number: step.number,
        index: step.index,
        total: step.total,
        can_go_back: step.canGoBack,
        blocks: loaded.screens.get(step.number),
      };
    case "question": {
      const presentation = presentationOf(
        loaded,
        step.questionId,
        step.presentationId,
      );
      return {
        kind: "question",
        question_id: step.questionId,
        presentation_id: step.presentationId,
        prompt: presentation.prompt,
        options: step.optionOrder.map((original) => ({
          blocks: presentation.options[original].blocks,
        })),
        answered: step.answered,
        total: step.total,
        misses: step.misses,
        help_offered: step.helpOffered,
      };
    }
    case "remediation":
      return {
        kind: "remediation",
        number: step.number,
        position: step.position,
        of: step.of,
        help_offered: step.helpOffered,
        blocks: loaded.screens.get(step.number),
      };
    case "passed":
      return {
        kind: "passed",
        first_try_right: step.result.firstTryRight,
        total: step.result.total,
        questions: step.result.byQuestion.map((q) => ({
          question_id: q.questionId,
          first_try: q.firstTry,
          misses: q.misses,
        })),
      };
    default:
      return { kind: "paused" };
  }
}

export interface RevealedAnswer {
  correct: boolean;
  chosen_position: number;
  correct_position: number;
  /** Why the chosen option is right or wrong. */
  reason: unknown;
  /** Why the right option is right; shown after a wrong pick. */
  correct_reason: unknown;
  misses: number;
  help_offered: boolean;
}

/** What is safe to reveal once the learner has answered. `before` is the session as it was when they answered. */
export function revealAnswer(
  outcome: AnswerOutcome,
  chosenPosition: number,
  before: LessonSession,
  loaded: LoadedLesson,
): RevealedAnswer {
  const presentation = presentationOf(
    loaded,
    outcome.questionId,
    outcome.presentationId,
  );
  const order = before.presented!.optionOrder;
  return {
    correct: outcome.correct,
    chosen_position: chosenPosition,
    correct_position: order.indexOf(outcome.correctOptionIndex),
    reason: presentation.options[outcome.chosenOptionIndex].reason,
    correct_reason: presentation.options[outcome.correctOptionIndex].reason,
    misses: outcome.misses,
    help_offered: outcome.helpOffered,
  };
}
