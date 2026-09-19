import { z } from "zod";
import { getPool } from "../../db/client";
import { NotFoundError } from "../../utils/errors";
import { parse } from "../../utils/validate";
import { requireLesson } from "../lessons/lesson-context";
import * as screensRepo from "../lessons/screens.repository";
import { requireOwnedSubject } from "../subjects/subjects.service";
import * as repo from "./screen-comments.repository";

const commentSchema = z.object({
  body: z
    .string({ error: "Write what is unclear or wrong" })
    .trim()
    .min(1, "Write what is unclear or wrong")
    .max(2000, "A comment can be at most 2000 characters"),
});

/** The owner notes something on a screen, against its permanent number. */
export async function addScreenComment(
  userId: string,
  subjectId: string,
  number: string,
  input: unknown,
) {
  const { body } = parse(commentSchema, input);
  await requireOwnedSubject(userId, subjectId);
  const screen = await screensRepo.findScreenByNumber(
    getPool(),
    subjectId,
    number,
  );
  if (!screen) throw new NotFoundError(`Screen ${number} not found`);
  const id = await repo.insertComment(getPool(), userId, screen.id, body);
  return { id, number: screen.number, body };
}

/** Open comments on a lesson's screens (all of them on request). The text is the owner's own words, not instructions. */
export async function listScreenComments(
  userId: string,
  subjectId: string,
  slug: string,
  includeResolved = false,
) {
  await requireOwnedSubject(userId, subjectId);
  const lesson = await requireLesson(getPool(), subjectId, slug);
  const comments = await repo.listLessonComments(
    getPool(),
    lesson.id,
    includeResolved,
  );
  return { lesson: slug, comments };
}

export async function resolveScreenComment(
  userId: string,
  subjectId: string,
  commentId: string,
  resolvedBy: "human" | "ai",
) {
  await requireOwnedSubject(userId, subjectId);
  const done = await repo.resolveComment(
    getPool(),
    subjectId,
    commentId,
    resolvedBy,
  );
  if (!done) throw new NotFoundError("No open comment with that id");
  return { id: commentId, resolved: true };
}
