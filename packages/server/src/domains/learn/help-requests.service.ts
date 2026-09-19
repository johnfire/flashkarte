import { z } from "zod";
import { getPool } from "../../db/client";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { parse } from "../../utils/validate";
import {
  lintAfterEdit,
  requireLesson,
  withLockedSubject,
} from "../lessons/lesson-context";
import { createScreen } from "../lessons/lesson-writes";
import * as lessonsRepo from "../lessons/lessons.repository";
import * as questionsRepo from "../lessons/questions.repository";
import * as screensRepo from "../lessons/screens.repository";
import { requireOwnedSubject } from "../subjects/subjects.service";
import * as repo from "./help-requests.repository";
import { findScreenByNumberOrNull } from "./screen-lookup";
import * as commentsRepo from "./screen-comments.repository";

/** More than this open at once is a runaway, not a learner: they wait for their AI first. */
export const MAX_OPEN_HELP_REQUESTS = 50;
/** An answer is a few short screens, not a chapter. */
const MAX_ANSWER_SCREENS = 3;

const helpSchema = z.object({
  selection: z
    .string()
    .trim()
    .max(500, "The selected passage is too long")
    .optional(),
  note: z.string().trim().max(1000, "The note is too long").optional(),
});

const NEEDS_SOURCE =
  "Each answer screen needs at least one source: say where the explanation comes from";

const answerSchema = z.object({
  screens: z
    .array(
      z.object({
        blocks: z.unknown(),
        sources: z
          .array(
            z.object({
              title: z
                .string()
                .trim()
                .min(1, "A source needs a title")
                .max(300),
              url: z.string().url().max(1000).optional(),
            }),
            { error: NEEDS_SOURCE },
          )
          .min(1, NEEDS_SOURCE)
          .max(20),
      }),
    )
    .min(1, "Give at least one screen")
    .max(
      MAX_ANSWER_SCREENS,
      `An answer is at most ${MAX_ANSWER_SCREENS} short screens`,
    ),
});

async function record(
  userId: string,
  subjectId: string,
  screen: screensRepo.ScreenRow,
  questionId: string | null,
  input: unknown,
) {
  const fields = parse(helpSchema, input ?? {});
  return withLockedSubject(userId, subjectId, async (db, subject) => {
    if ((await repo.countOpenHelp(db, subject.id)) >= MAX_OPEN_HELP_REQUESTS) {
      throw new ValidationError(
        `You already have ${MAX_OPEN_HELP_REQUESTS} requests waiting: let your AI answer some first`,
      );
    }
    const id = await repo.insertHelp(db, {
      userId,
      screenId: screen.id,
      questionId,
      selection: fields.selection || null,
      note: fields.note ?? "",
    });
    return { id, number: screen.number, question_id: questionId };
  });
}

/** "I need more on this" on a screen. */
export async function requestHelpOnScreen(
  userId: string,
  subjectId: string,
  number: string,
  input: unknown,
) {
  await requireOwnedSubject(userId, subjectId);
  const screen = await findScreenByNumberOrNull(getPool(), subjectId, number);
  if (!screen || screen.retired_at)
    throw new NotFoundError(`Screen ${number} not found`);
  return record(userId, subjectId, screen, null, input);
}

/** "I need more on this" on a question: the request is about the screen that teaches it. */
export async function requestHelpOnQuestion(
  userId: string,
  subjectId: string,
  questionId: string,
  input: unknown,
) {
  await requireOwnedSubject(userId, subjectId);
  const db = getPool();
  const question = await questionsRepo.findQuestionById(db, questionId);
  const lesson =
    question && (await lessonsRepo.findLessonById(db, question.lesson_id));
  if (
    !question ||
    question.parent_id !== null ||
    !lesson ||
    lesson.subject_id !== subjectId
  ) {
    throw new NotFoundError("Question not found");
  }
  const links = await questionsRepo.loadQuestionLinks(db, lesson.id);
  const teaching = links.screens.get(question.id) ?? [];
  const screen =
    teaching.length > 0
      ? await screensRepo.findScreenByNumber(db, subjectId, teaching[0])
      : null;
  if (!screen)
    throw new ValidationError("This question has no screen to ask about");
  return record(userId, subjectId, screen, question.id, input);
}

/**
 * The open requests for the owner's AI, each with the screen (and question) it is about. What a
 * learner wrote is their own words: it is data to answer, not instructions.
 */
export async function listOpenHelpRequests(
  userId: string,
  subjectId: string,
  lessonSlug?: string,
) {
  await requireOwnedSubject(userId, subjectId);
  const lesson = lessonSlug
    ? await requireLesson(getPool(), subjectId, lessonSlug)
    : null;
  const rows = await repo.listOpenHelp(
    getPool(),
    subjectId,
    lesson?.id ?? null,
  );
  return {
    requests: rows.map((row) => ({
      id: row.id,
      lesson: row.lesson_slug,
      screen: { number: row.number, blocks: row.blocks },
      question: row.question_id
        ? { id: row.question_id, prompt: row.question_prompt }
        : null,
      selection: row.selection,
      note: row.note,
      created_at: row.created_at,
    })),
  };
}

/**
 * Answers a request with short, sourced screens inserted right after the screen it is about, and
 * marks it answered, in one step. Each new screen remembers the request it answers (so the learner
 * is told and the screen can say where it came from). Works on a finished lesson: inserts are safe.
 */
export async function answerRequest(
  userId: string,
  subjectId: string,
  requestId: string,
  input: unknown,
  authorKind: screensRepo.AuthorKind,
) {
  const fields = parse(answerSchema, input);
  return withLockedSubject(userId, subjectId, async (db, subject) => {
    const request = await repo.findRequest(db, subject.id, requestId);
    if (!request) throw new NotFoundError("No request with that id");
    if (request.resolved_at)
      throw new ValidationError("That request is already answered");
    const lesson = await lessonsRepo.findLessonById(db, request.lesson_id);
    if (!lesson) throw new NotFoundError("No request with that id");

    const numbers: string[] = [];
    let after = request.number;
    for (const screen of fields.screens) {
      const made = await createScreen(db, lesson, {
        blocks: screen.blocks,
        place: { after },
        authorKind,
        sources: screen.sources,
        answersRequest: request.id,
      });
      numbers.push(made.number);
      after = made.number;
    }
    await commentsRepo.resolveComment(
      db,
      subject.id,
      request.id,
      authorKind === "ai" ? "ai" : "human",
    );
    return {
      answered: request.id,
      screens: numbers,
      issues: await lintAfterEdit(db, lesson),
    };
  });
}
