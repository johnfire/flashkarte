import {
  formulasWithoutSpokenText,
  inlineMathWithoutSpokenText,
  validateBlocks,
  type Block,
} from "./lesson-blocks";
import { isValidScreenNumber, normalizeScreenNumber } from "./screen-number";

/**
 * The checks a lesson has to pass, on two levels (plus advice):
 *
 * - **structural**: the content is malformed (bad blocks, a question pointing at a screen that is
 *   not there). These block any save, so a lesson can never be stored broken.
 * - **completeness**: the lesson is unfinished (a concept nothing tests, a formula with no spoken
 *   text). Reported on every save, and only block moving the lesson to **finished**, so a
 *   half-written lesson in the testing stage can always be saved.
 * - **warning**: advice that never blocks (a lesson with 12 screens, a question with no variant).
 *
 * A clean lint means the lesson is consistent. It does not mean the teaching is any good.
 */

export type LessonIssueLevel = "structural" | "completeness" | "warning";

export interface LessonIssue {
  level: LessonIssueLevel;
  code: string;
  message: string;
  /** What the issue is about, for example "screen 213" or a question id. */
  ref: string | null;
}

export const RECOMMENDED = {
  minScreens: 4,
  maxScreens: 10,
  minQuestions: 3,
  maxQuestions: 5,
} as const;

export interface OptionInput {
  correct: boolean;
  blocks: unknown;
  reason: unknown;
}
export interface VariantInput {
  id: string;
  prompt: unknown;
  options: OptionInput[];
  retired?: boolean;
}
export interface QuestionInput {
  id: string;
  prompt: unknown;
  options: OptionInput[];
  /** Screen numbers that teach it; a variant inherits these. */
  screens: string[];
  /** Concept slugs it tests; a variant inherits these. */
  covers: string[];
  variants: VariantInput[];
  retired?: boolean;
}
export interface ScreenInput {
  number: string;
  blocks: unknown;
  retired?: boolean;
}
export interface LessonInput {
  /**
   * The ids of the images the subject holds. When given, an image block that points at an asset
   * not in this list is reported; when left out, images are not checked.
   */
  assetIds?: string[];
  summary: string;
  /** The lesson's coverage checklist: concept slugs. */
  covers: string[];
  screens: ScreenInput[];
  questions: QuestionInput[];
}

type Add = (
  level: LessonIssueLevel,
  code: string,
  message: string,
  ref?: string | null,
) => void;

/** Blocks that validated, gathered from wherever they appear, to look for formulas without spoken text. */
function collectBlocks(
  input: unknown,
  into: Block[],
): { path: string; message: string }[] {
  const { blocks, issues } = validateBlocks(input);
  into.push(...blocks);
  return issues;
}

function checkScreens(
  lesson: LessonInput,
  add: Add,
  blocks: Block[],
): Set<string> {
  const known = new Set<string>();
  for (const screen of lesson.screens.filter((s) => !s.retired)) {
    if (!isValidScreenNumber(screen.number)) {
      add(
        "structural",
        "SCREEN_NUMBER_INVALID",
        `"${screen.number}" is not a valid screen number`,
      );
      continue;
    }
    const number = normalizeScreenNumber(screen.number);
    if (known.has(number)) {
      add(
        "structural",
        "SCREEN_NUMBER_DUPLICATE",
        `Screen ${number} appears twice`,
        `screen ${number}`,
      );
    }
    known.add(number);
    for (const issue of collectBlocks(screen.blocks, blocks)) {
      add(
        "structural",
        "SCREEN_BLOCKS_INVALID",
        `${issue.path} ${issue.message}`,
        `screen ${number}`,
      );
    }
  }
  return known;
}

function checkOptions(
  label: string,
  prompt: unknown,
  options: OptionInput[],
  add: Add,
  blocks: Block[],
): void {
  for (const issue of collectBlocks(prompt, blocks)) {
    add(
      "structural",
      "QUESTION_PROMPT_INVALID",
      `prompt: ${issue.path} ${issue.message}`,
      label,
    );
  }
  if (options.length < 2) {
    add(
      "structural",
      "QUESTION_OPTIONS_COUNT",
      "A question needs at least two options",
      label,
    );
  }
  if (options.filter((option) => option.correct).length !== 1) {
    add(
      "structural",
      "QUESTION_CORRECT_COUNT",
      "A question needs exactly one correct option",
      label,
    );
  }
  options.forEach((option, index) => {
    for (const issue of collectBlocks(option.blocks, blocks)) {
      add(
        "structural",
        "OPTION_INVALID",
        `option ${index + 1}: ${issue.path} ${issue.message}`,
        label,
      );
    }
    for (const issue of collectBlocks(option.reason, blocks)) {
      add(
        "structural",
        "OPTION_REASON_INVALID",
        `option ${index + 1} reason: ${issue.path} ${issue.message}`,
        label,
      );
    }
  });
}

function checkQuestion(
  question: QuestionInput,
  known: Set<string>,
  add: Add,
  blocks: Block[],
): void {
  const label = `question ${question.id}`;
  checkOptions(label, question.prompt, question.options, add, blocks);
  if (question.screens.length === 0) {
    add(
      "structural",
      "QUESTION_NO_SCREENS",
      "A question must name at least one screen that teaches it",
      label,
    );
  }
  for (const number of question.screens) {
    const normalized = isValidScreenNumber(number)
      ? normalizeScreenNumber(number)
      : number;
    if (!known.has(normalized)) {
      add(
        "structural",
        "QUESTION_SCREEN_UNKNOWN",
        `Teaching screen ${number} is not an active screen of this lesson`,
        label,
      );
    }
  }
  for (const variant of question.variants.filter((v) => !v.retired)) {
    checkOptions(
      `variant ${variant.id} of ${label}`,
      variant.prompt,
      variant.options,
      add,
      blocks,
    );
  }
}

function checkCoverage(
  lesson: LessonInput,
  questions: QuestionInput[],
  add: Add,
): void {
  const listed = new Set(lesson.covers);
  const tested = new Set(questions.flatMap((question) => question.covers));
  for (const slug of lesson.covers) {
    if (!tested.has(slug)) {
      add(
        "completeness",
        "CONCEPT_NOT_TESTED",
        `Concept "${slug}" is taught but no question tests it`,
        slug,
      );
    }
  }
  for (const question of questions) {
    if (question.covers.length === 0) {
      add(
        "completeness",
        "QUESTION_NO_COVERS",
        "A question must test at least one concept",
        `question ${question.id}`,
      );
    }
    for (const slug of question.covers.filter((slug) => !listed.has(slug))) {
      add(
        "completeness",
        "QUESTION_COVERS_UNLISTED",
        `Tests "${slug}", which the lesson does not list as covered`,
        `question ${question.id}`,
      );
    }
  }
}

function checkAdvice(
  lesson: LessonInput,
  screens: ScreenInput[],
  questions: QuestionInput[],
  add: Add,
): void {
  if (
    screens.length > 0 &&
    (screens.length < RECOMMENDED.minScreens ||
      screens.length > RECOMMENDED.maxScreens)
  ) {
    add(
      "warning",
      "SCREEN_COUNT",
      `A lesson usually has ${RECOMMENDED.minScreens} to ${RECOMMENDED.maxScreens} screens; this has ${screens.length}`,
    );
  }
  if (
    questions.length > 0 &&
    (questions.length < RECOMMENDED.minQuestions ||
      questions.length > RECOMMENDED.maxQuestions)
  ) {
    add(
      "warning",
      "QUESTION_COUNT",
      `A lesson usually has ${RECOMMENDED.minQuestions} to ${RECOMMENDED.maxQuestions} questions; this has ${questions.length}`,
    );
  }
  for (const question of questions.filter(
    (q) => !q.variants.some((v) => !v.retired),
  )) {
    add(
      "warning",
      "QUESTION_NO_VARIANT",
      "No variant: a miss can only be re-asked from the back of the set",
      `question ${question.id}`,
    );
  }
}

export function lintLesson(lesson: LessonInput): LessonIssue[] {
  const issues: LessonIssue[] = [];
  const add: Add = (level, code, message, ref = null) =>
    issues.push({ level, code, message, ref });
  const screens = lesson.screens.filter((screen) => !screen.retired);
  const questions = lesson.questions.filter((question) => !question.retired);
  const blocks: Block[] = [];

  const known = checkScreens(lesson, add, blocks);
  questions.forEach((question) => checkQuestion(question, known, add, blocks));

  if (lesson.summary.trim() === "")
    add("completeness", "LESSON_NO_SUMMARY", "The lesson has no summary");
  if (screens.length === 0)
    add("completeness", "LESSON_NO_SCREENS", "The lesson has no screens");
  if (questions.length === 0)
    add(
      "completeness",
      "LESSON_NO_QUESTIONS",
      "The lesson has no questions, so it can never be passed",
    );
  checkCoverage(lesson, questions, add);
  for (const formula of formulasWithoutSpokenText(blocks)) {
    add(
      "completeness",
      "FORMULA_NO_SPOKEN_TEXT",
      `A formula has no spoken text for screen readers: ${formula.latex.slice(0, 40)}`,
    );
  }
  for (const span of inlineMathWithoutSpokenText(blocks)) {
    add(
      "completeness",
      "MATH_NO_SPOKEN_TEXT",
      `A symbol in a sentence has no spoken text for screen readers: ${span.text.slice(0, 40)}`,
    );
  }
  checkImages(lesson, blocks, add);
  checkAdvice(lesson, screens, questions, add);
  return issues;
}

const ASSET_SOURCE = /^asset:([0-9a-f-]{36})$/i;

/** An image that points at a stored diagram the subject does not have would show nothing. */
function checkImages(lesson: LessonInput, blocks: Block[], add: Add): void {
  if (!lesson.assetIds) return;
  const known = new Set(lesson.assetIds.map((id) => id.toLowerCase()));
  for (const block of blocks) {
    if (block.type !== "image") continue;
    const match = ASSET_SOURCE.exec(block.src);
    if (match && !known.has(match[1].toLowerCase())) {
      add(
        "completeness",
        "IMAGE_ASSET_MISSING",
        `An image points at a diagram this subject does not have: ${block.src} (${block.alt.slice(0, 40)})`,
      );
    }
  }
}

/** A lesson may be saved as long as nothing structural is wrong. */
export const canSave = (issues: LessonIssue[]): boolean =>
  !issues.some((issue) => issue.level === "structural");

/** A lesson may move to finished only when it is neither malformed nor incomplete. */
export const canFinish = (issues: LessonIssue[]): boolean =>
  !issues.some(
    (issue) => issue.level === "structural" || issue.level === "completeness",
  );
