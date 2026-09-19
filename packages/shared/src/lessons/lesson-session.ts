import { compareScreenNumbers } from "./screen-number";

/**
 * The learner's path through one lesson, as a pure state machine (no I/O, no clock, and the only
 * randomness is an injected `random`), so every rule can be tested exhaustively and web and
 * Android cannot disagree about it. The server holds the session; a client only renders the
 * current step and sends the learner's next action.
 *
 * Read the screens, one at a time. Then answer the questions. A wrong answer shows the screens
 * that teach it, then asks again: with a different variant of the question when it has one,
 * otherwise from the back of the set with the options shuffled. Repeat until right. After two
 * misses on one question the learner is offered help or a break ("come back later"): progress is
 * kept and the lesson stays not passed. The lesson is passed when every question has been
 * answered correctly. The first attempt at each question is recorded, because it sets where that
 * question's spaced-review schedule starts.
 */

/** Misses on one question after which the learner is offered help or "come back later". */
export const HELP_AFTER_MISSES = 2;

export interface PresentationContent {
  /** The question's id for the original wording; a variant's id for a variant. */
  id: string;
  optionCount: number;
  correctIndex: number;
}
export interface QuestionContent {
  id: string;
  /** Numbers of the screens that teach it, in the order they are shown after a miss. */
  screens: string[];
  /** The question itself first, then its variants. */
  presentations: PresentationContent[];
}
export interface SessionContent {
  /** Active screen numbers, in order. */
  screens: string[];
  /** Active top-level questions, in authored order. */
  questions: QuestionContent[];
}

export type SessionPhase = "screens" | "questions" | "remediation" | "passed";
export type FirstTry = "right" | "wrong";

export interface QuestionRun {
  correct: boolean;
  misses: number;
  firstTry: FirstTry | null;
  seenPresentations: string[];
  lastPresentation: string | null;
}
export interface Presented {
  questionId: string;
  presentationId: string;
  /** optionOrder[i] is the original option index shown at position i. */
  optionOrder: number[];
}
export interface Remediation {
  questionId: string;
  screens: string[];
  position: number;
}
export interface LessonSession {
  phase: SessionPhase;
  currentScreen: string | null;
  readScreens: string[];
  /** Question ids still to be answered correctly, in the order they will be asked. */
  queue: string[];
  runs: Record<string, QuestionRun>;
  presented: Presented | null;
  remediation: Remediation | null;
  helpOffered: string | null;
  paused: boolean;
}

export interface AnswerOutcome {
  correct: boolean;
  questionId: string;
  presentationId: string;
  chosenOptionIndex: number;
  /** Safe to reveal: the learner has answered. */
  correctOptionIndex: number;
  misses: number;
  helpOffered: boolean;
}

export type Random = () => number;

export class SessionError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

const freshRun = (): QuestionRun => ({
  correct: false,
  misses: 0,
  firstTry: null,
  seenPresentations: [],
  lastPresentation: null,
});

function pick<T>(items: T[], random: Random): T {
  return items[Math.min(items.length - 1, Math.floor(random() * items.length))];
}

function shuffled(count: number, random: Random): number[] {
  const order = Array.from({ length: count }, (_, i) => i);
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/** A shuffle that differs from `previous` when there is more than one option, so a re-ask is not the same layout. */
function shuffledDifferently(
  count: number,
  previous: number[] | null,
  random: Random,
): number[] {
  for (let attempt = 0; attempt < 10; attempt++) {
    const order = shuffled(count, random);
    if (!previous || count < 2 || order.join() !== previous.join())
      return order;
  }
  return (previous ?? []).map((_, i, all) => all[(i + 1) % all.length]);
}

function questionOf(content: SessionContent, id: string): QuestionContent {
  const question = content.questions.find((q) => q.id === id);
  if (!question)
    throw new SessionError(
      "UNKNOWN_QUESTION",
      `Question ${id} is not in this lesson`,
    );
  return question;
}

/** First ask: any wording, at random. Re-ask: a wording not seen yet, else a different one, else the only one. */
function choosePresentation(
  question: QuestionContent,
  run: QuestionRun,
  random: Random,
): PresentationContent {
  const all = question.presentations;
  if (run.seenPresentations.length === 0) return pick(all, random);
  const unseen = all.filter((p) => !run.seenPresentations.includes(p.id));
  if (unseen.length > 0) return pick(unseen, random);
  const others = all.filter((p) => p.id !== run.lastPresentation);
  return others.length > 0 ? pick(others, random) : all[0];
}

function present(
  session: LessonSession,
  content: SessionContent,
  random: Random,
): LessonSession {
  const questionId = session.queue[0];
  const question = questionOf(content, questionId);
  const run = session.runs[questionId];
  const presentation = choosePresentation(question, run, random);
  const previous =
    session.presented?.questionId === questionId &&
    session.presented.presentationId === presentation.id
      ? session.presented.optionOrder
      : null;
  return {
    ...session,
    phase: "questions",
    presented: {
      questionId,
      presentationId: presentation.id,
      optionOrder: shuffledDifferently(
        presentation.optionCount,
        previous,
        random,
      ),
    },
    remediation: null,
    runs: {
      ...session.runs,
      [questionId]: {
        ...run,
        lastPresentation: presentation.id,
        seenPresentations: [
          ...new Set([...run.seenPresentations, presentation.id]),
        ],
      },
    },
  };
}

function passed(session: LessonSession): LessonSession {
  return {
    ...session,
    phase: "passed",
    presented: null,
    remediation: null,
    helpOffered: null,
    queue: [],
  };
}

function startQuestions(
  session: LessonSession,
  content: SessionContent,
  random: Random,
): LessonSession {
  const started = {
    ...session,
    currentScreen: null,
    phase: "questions" as const,
  };
  return started.queue.length === 0
    ? passed(started)
    : present(started, content, random);
}

export interface StartOptions {
  /** Skip the screens and ask only the questions (a spaced review, or a test-out). */
  skipScreens?: boolean;
  /** Ask only these question ids. */
  only?: string[];
}

export function startSession(
  content: SessionContent,
  random: Random,
  options: StartOptions = {},
): LessonSession {
  const questions = content.questions.filter(
    (q) => !options.only || options.only.includes(q.id),
  );
  if (questions.length === 0) {
    throw new SessionError(
      "NO_QUESTIONS",
      "This lesson has no questions, so it cannot be passed yet",
    );
  }
  const base: LessonSession = {
    phase: "screens",
    currentScreen: content.screens[0] ?? null,
    readScreens: [],
    queue: questions.map((q) => q.id),
    runs: Object.fromEntries(questions.map((q) => [q.id, freshRun()])),
    presented: null,
    remediation: null,
    helpOffered: null,
    paused: false,
  };
  return options.skipScreens || content.screens.length === 0
    ? startQuestions(base, content, random)
    : base;
}

function requirePhase(
  session: LessonSession,
  phase: SessionPhase,
  action: string,
): void {
  if (session.paused)
    throw new SessionError("PAUSED", "The lesson is paused: resume it first");
  if (session.phase !== phase) {
    throw new SessionError(
      "WRONG_PHASE",
      `Cannot ${action} while the session is in the "${session.phase}" phase`,
    );
  }
}

/** "Next" on a screen. The last screen leads to the questions. */
export function nextScreen(
  session: LessonSession,
  content: SessionContent,
  random: Random,
): LessonSession {
  requirePhase(session, "screens", "go to the next screen");
  const current = session.currentScreen;
  const readScreens =
    current && !session.readScreens.includes(current)
      ? [...session.readScreens, current]
      : session.readScreens;
  const following = content.screens.find(
    (n) => current === null || compareScreenNumbers(n, current) > 0,
  );
  if (following === undefined)
    return startQuestions({ ...session, readScreens }, content, random);
  return { ...session, readScreens, currentScreen: following };
}

export function previousScreen(
  session: LessonSession,
  content: SessionContent,
): LessonSession {
  requirePhase(session, "screens", "go back a screen");
  const before = content.screens.filter(
    (n) =>
      session.currentScreen !== null &&
      compareScreenNumbers(n, session.currentScreen) < 0,
  );
  return before.length === 0
    ? session
    : { ...session, currentScreen: before[before.length - 1] };
}

/** After a miss: a question with a variant is re-asked next; one without goes to the back of the set. */
function requeueAfterMiss(
  queue: string[],
  question: QuestionContent,
): string[] {
  if (question.presentations.length > 1 || queue.length === 1) return queue;
  return [...queue.slice(1), queue[0]];
}

/**
 * Answer the question on screen. `chosenPosition` is the position the learner tapped, in the
 * shuffled order they were shown. Right moves on; wrong shows the teaching screens first.
 */
export function answerQuestion(
  session: LessonSession,
  content: SessionContent,
  chosenPosition: number,
  random: Random,
): { session: LessonSession; outcome: AnswerOutcome } {
  requirePhase(session, "questions", "answer a question");
  const presented = session.presented!;
  if (
    !Number.isInteger(chosenPosition) ||
    chosenPosition < 0 ||
    chosenPosition >= presented.optionOrder.length
  ) {
    throw new SessionError("BAD_CHOICE", "That option does not exist");
  }
  const question = questionOf(content, presented.questionId);
  const presentation = question.presentations.find(
    (p) => p.id === presented.presentationId,
  )!;
  const chosen = presented.optionOrder[chosenPosition];
  const correct = chosen === presentation.correctIndex;
  const run = session.runs[question.id];
  const updated: QuestionRun = correct
    ? { ...run, correct: true, firstTry: run.firstTry ?? "right" }
    : { ...run, misses: run.misses + 1, firstTry: run.firstTry ?? "wrong" };
  const runs = { ...session.runs, [question.id]: updated };
  const outcome: AnswerOutcome = {
    correct,
    questionId: question.id,
    presentationId: presentation.id,
    chosenOptionIndex: chosen,
    correctOptionIndex: presentation.correctIndex,
    misses: updated.misses,
    helpOffered: !correct && updated.misses >= HELP_AFTER_MISSES,
  };
  if (correct) {
    const queue = session.queue.filter((id) => id !== question.id);
    const next = {
      ...session,
      runs,
      queue,
      presented: null,
      helpOffered: null,
    };
    return {
      session:
        queue.length === 0 ? passed(next) : present(next, content, random),
      outcome,
    };
  }
  const missed: LessonSession = {
    ...session,
    runs,
    queue: requeueAfterMiss(session.queue, question),
    presented: null,
    helpOffered: outcome.helpOffered ? question.id : null,
    remediation: {
      questionId: question.id,
      screens: question.screens,
      position: 0,
    },
    phase: "remediation",
  };
  return {
    session:
      question.screens.length === 0 ? present(missed, content, random) : missed,
    outcome,
  };
}

/** "Continue" while the teaching screens are shown; after the last one the question is asked again. */
export function continueRemediation(
  session: LessonSession,
  content: SessionContent,
  random: Random,
): LessonSession {
  requirePhase(session, "remediation", "continue");
  const remediation = session.remediation!;
  if (remediation.position + 1 < remediation.screens.length) {
    return {
      ...session,
      remediation: { ...remediation, position: remediation.position + 1 },
    };
  }
  return present(session, content, random);
}

/** "Come back later": nothing is lost and the lesson is not passed. */
export function comeBackLater(session: LessonSession): LessonSession {
  if (session.phase === "passed")
    throw new SessionError("WRONG_PHASE", "The lesson is already passed");
  return { ...session, paused: true };
}

export function resume(session: LessonSession): LessonSession {
  return { ...session, paused: false };
}

export interface LessonResult {
  total: number;
  firstTryRight: number;
  byQuestion: { questionId: string; firstTry: FirstTry; misses: number }[];
}

/** Meaningful once the lesson is passed: how each question went on the first attempt. */
export function lessonResult(session: LessonSession): LessonResult {
  const runs = Object.entries(session.runs);
  return {
    total: runs.length,
    firstTryRight: runs.filter(([, run]) => run.firstTry === "right").length,
    byQuestion: runs.map(([questionId, run]) => ({
      questionId,
      firstTry: run.firstTry ?? "wrong",
      misses: run.misses,
    })),
  };
}

export type Step =
  | {
      kind: "screen";
      number: string;
      index: number;
      total: number;
      canGoBack: boolean;
    }
  | {
      kind: "question";
      questionId: string;
      presentationId: string;
      optionOrder: number[];
      answered: number;
      total: number;
      misses: number;
      helpOffered: boolean;
    }
  | {
      kind: "remediation";
      questionId: string;
      number: string;
      position: number;
      of: number;
      helpOffered: boolean;
    }
  | { kind: "passed"; result: LessonResult }
  | { kind: "paused" };

/** What to show now. Never contains a correct answer: that is only revealed after the learner answers. */
export function describeStep(
  session: LessonSession,
  content: SessionContent,
): Step {
  if (session.paused) return { kind: "paused" };
  const total = Object.keys(session.runs).length;
  switch (session.phase) {
    case "screens": {
      const index = Math.max(
        0,
        content.screens.indexOf(session.currentScreen ?? ""),
      );
      return {
        kind: "screen",
        number: session.currentScreen ?? content.screens[0],
        index,
        total: content.screens.length,
        canGoBack: index > 0,
      };
    }
    case "questions": {
      const presented = session.presented!;
      const answered = Object.values(session.runs).filter(
        (run) => run.correct,
      ).length;
      return {
        kind: "question",
        questionId: presented.questionId,
        presentationId: presented.presentationId,
        optionOrder: presented.optionOrder,
        answered,
        total,
        misses: session.runs[presented.questionId].misses,
        helpOffered: session.helpOffered === presented.questionId,
      };
    }
    case "remediation": {
      const remediation = session.remediation!;
      return {
        kind: "remediation",
        questionId: remediation.questionId,
        number: remediation.screens[remediation.position],
        position: remediation.position,
        of: remediation.screens.length,
        helpOffered: session.helpOffered === remediation.questionId,
      };
    }
    default:
      return { kind: "passed", result: lessonResult(session) };
  }
}

/**
 * Brings a saved session in line with edited lesson content: screens or questions that were
 * removed or retired are dropped, questions added since are appended, and a passed lesson is left
 * alone (adding a question only affects new learners).
 */
export function reconcile(
  session: LessonSession,
  content: SessionContent,
  random: Random,
): LessonSession {
  if (session.phase === "passed") return session;
  const known = new Set(content.questions.map((q) => q.id));
  const runs = Object.fromEntries(
    Object.entries(session.runs).filter(([id]) => known.has(id)),
  );
  for (const id of known) if (!runs[id]) runs[id] = freshRun();
  const queue = [
    ...session.queue.filter((id) => known.has(id)),
    ...content.questions
      .filter((q) => !runs[q.id].correct && !session.queue.includes(q.id))
      .map((q) => q.id),
  ];
  const base: LessonSession = { ...session, runs, queue: [...new Set(queue)] };
  if (base.phase === "screens") return reconcileScreens(base, content, random);
  return reconcileQuestions(base, content, random);
}

function reconcileScreens(
  session: LessonSession,
  content: SessionContent,
  random: Random,
): LessonSession {
  const current = session.currentScreen;
  if (current !== null && content.screens.includes(current)) return session;
  const following = content.screens.find(
    (n) => current === null || compareScreenNumbers(n, current) > 0,
  );
  if (following !== undefined) return { ...session, currentScreen: following };
  return startQuestions(session, content, random);
}

function reconcileQuestions(
  session: LessonSession,
  content: SessionContent,
  random: Random,
): LessonSession {
  if (session.queue.length === 0) return passed(session);
  if (session.phase === "remediation" && session.remediation) {
    const question = content.questions.find(
      (q) => q.id === session.remediation!.questionId,
    );
    const screens = (question?.screens ?? []).filter((n) =>
      content.screens.includes(n),
    );
    if (question && screens.length > 0) {
      return {
        ...session,
        remediation: {
          ...session.remediation,
          screens,
          position: Math.min(session.remediation.position, screens.length - 1),
        },
      };
    }
    return present({ ...session, remediation: null }, content, random);
  }
  const presented = session.presented;
  const stillValid =
    presented &&
    session.queue[0] === presented.questionId &&
    content.questions
      .find((q) => q.id === presented.questionId)
      ?.presentations.some((p) => p.id === presented.presentationId);
  return stillValid ? session : present(session, content, random);
}
