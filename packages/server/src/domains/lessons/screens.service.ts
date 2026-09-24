import { isValidScreenNumber, normalizeScreenNumber } from "@flashkarte/shared";
import { getPool } from "../../db/client";
import type { Queryable } from "../../db/queryable";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../utils/errors";
import { parse } from "../../utils/validate";
import { requireOwnedSubject } from "../subjects/subjects.service";
import {
  assertTesting,
  lintAfterEdit,
  requireLesson,
  withLockedSubject,
} from "./lesson-context";
import { renderBlocks } from "../maths/render-formulas";
import { assertValidBlocks, createScreen } from "./lesson-writes";
import { findLessonById, type LessonRow } from "./lessons.repository";
import { newScreenSchema, screenPatchSchema } from "./lessons.schemas";
import * as questionsRepo from "./questions.repository";
import * as repo from "./screens.repository";

function normalizedOrNotFound(number: string): string {
  if (!isValidScreenNumber(number))
    throw new NotFoundError(`Screen ${number} not found`);
  return normalizeScreenNumber(number);
}

async function requireScreen(
  db: Queryable,
  subjectId: string,
  number: string,
): Promise<{ screen: repo.ScreenRow; lesson: LessonRow }> {
  const screen = await repo.findScreenByNumber(
    db,
    subjectId,
    normalizedOrNotFound(number),
  );
  if (!screen) throw new NotFoundError(`Screen ${number} not found`);
  const lesson = await findLessonById(db, screen.lesson_id);
  if (!lesson) throw new NotFoundError(`Screen ${number} not found`);
  return { screen, lesson };
}

/** Adds a screen. Allowed in both stages: inserting is safe because numbers never change. */
export async function addScreen(
  userId: string,
  subjectId: string,
  lessonSlug: string,
  input: unknown,
  authorKind: repo.AuthorKind,
) {
  const fields = parse(newScreenSchema, input);
  return withLockedSubject(userId, subjectId, async (db, subject) => {
    const lesson = await requireLesson(db, subject.id, lessonSlug);
    const screen = await createScreen(db, lesson, {
      blocks: fields.blocks,
      place: fields.place,
      authorKind,
      sources: fields.sources,
    });
    return { screen, issues: await lintAfterEdit(db, lesson) };
  });
}

/**
 * Edits a screen's content (kept in its revision history, in either stage) or, in the testing
 * stage only, gives it a new number. In a finished lesson a number never changes.
 */
export async function updateScreen(
  userId: string,
  subjectId: string,
  number: string,
  input: unknown,
) {
  const patch = parse(screenPatchSchema, input);
  return withLockedSubject(userId, subjectId, async (db, subject) => {
    const { screen, lesson } = await requireScreen(db, subject.id, number);
    if (patch.blocks !== undefined) {
      assertValidBlocks(patch.blocks);
      await repo.writeScreenBlocks(
        db,
        screen,
        await renderBlocks(db, subject.id, patch.blocks),
      );
    }
    if (patch.sources !== undefined) {
      await repo.writeScreenSources(db, screen.id, patch.sources);
    }
    let finalNumber = screen.number;
    if (patch.number !== undefined) {
      assertTesting(lesson, "renumber a screen");
      finalNumber = normalizedOrNotFound(patch.number);
      if (finalNumber !== screen.number) {
        if (await repo.findScreenByNumber(db, subject.id, finalNumber)) {
          throw new ConflictError(`Screen ${finalNumber} already exists`);
        }
        await repo.writeScreenNumber(db, screen.id, finalNumber);
      }
    }
    return { number: finalNumber, issues: await lintAfterEdit(db, lesson) };
  });
}

/** Hides a screen from new learners, keeping it (and its history) for anyone whose progress points at it. */
export async function retireScreen(
  userId: string,
  subjectId: string,
  number: string,
) {
  return withLockedSubject(userId, subjectId, async (db, subject) => {
    const { screen, lesson } = await requireScreen(db, subject.id, number);
    if (screen.retired_at)
      throw new ConflictError(`Screen ${screen.number} is already retired`);
    const teaching = (
      await questionsRepo.screensTaughtByQuestions(db, screen.id)
    ).filter((q) => !q.retired);
    if (teaching.length > 0) {
      throw new ValidationError(
        `Screen ${screen.number} is still taught by ${teaching.length} question${teaching.length === 1 ? "" : "s"}: ` +
          `point them at the replacement screen first`,
      );
    }
    await repo.retireScreen(db, screen);
    return { number: screen.number, issues: await lintAfterEdit(db, lesson) };
  });
}

/** Testing stage only. A screen a question teaches cannot be deleted from under it. */
export async function deleteScreen(
  userId: string,
  subjectId: string,
  number: string,
) {
  return withLockedSubject(userId, subjectId, async (db, subject) => {
    const { screen, lesson } = await requireScreen(db, subject.id, number);
    assertTesting(lesson, "delete a screen");
    if (
      (await questionsRepo.screensTaughtByQuestions(db, screen.id)).length > 0
    ) {
      throw new ValidationError(
        `Screen ${screen.number} is taught by a question: point the question at another screen first`,
      );
    }
    await repo.removeScreen(db, screen.id);
    return { issues: await lintAfterEdit(db, lesson) };
  });
}

export async function listScreenRevisions(
  userId: string,
  subjectId: string,
  number: string,
) {
  await requireOwnedSubject(userId, subjectId);
  const { screen } = await requireScreen(getPool(), subjectId, number);
  return repo.listRevisions(getPool(), screen.id);
}
