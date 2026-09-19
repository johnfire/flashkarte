import type {
  AnswerOutcome,
  LessonSession,
  SessionContent,
  Step,
} from "@flashkarte/shared";
import type { Queryable } from "../../db/queryable";
import { normalizeScreenNumber } from "@flashkarte/shared";
import type { LessonRow } from "../lessons/lessons.repository";
import * as helpRepo from "./help-requests.repository";
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
/** What a client needs to draw a screen besides its blocks. */
export interface LoadedScreen {
  blocks: unknown;
  sources: unknown;
  /** Set for a screen added in answer to a "need more" request: who wrote the answer. */
  addedInAnswer: "ai" | "human" | null;
}
/** A learner's request for more, and whether it has been answered. */
export interface HelpStatus {
  id: string;
  status: "open" | "answered";
  /** The screens added in answer, in order. */
  answers: string[];
  questionId: string | null;
}
export interface LoadedLesson {
  lesson: LessonRow;
  screens: Map<string, LoadedScreen>;
  /** This learner's requests on the lesson, by the number of the screen they asked about. */
  help: Map<string, HelpStatus[]>;
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
  userId?: string,
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
    screens: new Map(
      active.map((screen) => [
        screen.number,
        {
          blocks: screen.blocks,
          sources: screen.sources,
          addedInAnswer: screen.answers_request ? screen.author_kind : null,
        },
      ]),
    ),
    help: userId ? await loadHelp(db, userId, lesson.id) : new Map(),
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

/**
 * A lesson as a review sees it: the same screens (to teach again after a miss) but only the one
 * question being reviewed. Without this the session would fill up with the lesson's other questions.
 */
export function narrowToQuestion(
  loaded: LoadedLesson,
  questionId: string,
): LoadedLesson {
  return {
    ...loaded,
    questions: loaded.questions.filter((q) => q.id === questionId),
    content: {
      ...loaded.content,
      questions: loaded.content.questions.filter((q) => q.id === questionId),
    },
  };
}

async function loadHelp(
  db: Queryable,
  userId: string,
  lessonId: string,
): Promise<Map<string, HelpStatus[]>> {
  const byScreen = new Map<string, HelpStatus[]>();
  for (const row of await helpRepo.listHelpStatus(db, userId, lessonId)) {
    const list = byScreen.get(row.number) ?? [];
    list.push({
      id: row.id,
      status: row.resolved_at ? "answered" : "open",
      answers: row.answer_numbers.map((n) => normalizeScreenNumber(n)),
      questionId: row.question_id,
    });
    byScreen.set(row.number, list);
  }
  return byScreen;
}

/** The public shape of a screen's extras: where it came from, its sources, and this learner's requests on it. */
function screenExtras(loaded: LoadedLesson, number: string) {
  const screen = loaded.screens.get(number);
  return {
    blocks: screen?.blocks,
    sources: screen?.sources ?? null,
    added_in_answer: screen?.addedInAnswer ?? null,
    help: (loaded.help.get(number) ?? []).map((h) => ({
      id: h.id,
      status: h.status,
      answers: h.answers,
    })),
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

export interface HelpPublic {
  id: string;
  status: "open" | "answered";
  answers: string[];
}

export type RenderedStep =
  | {
      kind: "screen";
      number: string;
      index: number;
      total: number;
      can_go_back: boolean;
      blocks: unknown;
      sources: unknown;
      added_in_answer: "ai" | "human" | null;
      help: HelpPublic[];
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
      /** This learner's requests for more on this question. */
      help: HelpPublic[];
    }
  | {
      kind: "remediation";
      number: string;
      position: number;
      of: number;
      help_offered: boolean;
      blocks: unknown;
      sources: unknown;
      added_in_answer: "ai" | "human" | null;
      help: HelpPublic[];
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
        ...screenExtras(loaded, step.number),
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
        help: [...loaded.help.values()]
          .flat()
          .filter((h) => h.questionId === step.questionId)
          .map(({ id, status, answers }) => ({ id, status, answers })),
      };
    }
    case "remediation":
      return {
        kind: "remediation",
        number: step.number,
        position: step.position,
        of: step.of,
        help_offered: step.helpOffered,
        ...screenExtras(loaded, step.number),
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
