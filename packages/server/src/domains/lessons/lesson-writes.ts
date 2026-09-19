import {
  isValidScreenNumber,
  normalizeScreenNumber,
  suggestScreenNumber,
  validateBlocks,
} from "@flashkarte/shared";
import type { Queryable } from "../../db/queryable";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../utils/errors";
import { renderBlocks, renderQuestionBlocks } from "../maths/render-formulas";
import * as lessonsRepo from "./lessons.repository";
import * as questionsRepo from "./questions.repository";
import * as screensRepo from "./screens.repository";
import { resolveConceptIds } from "./lesson-context";
import type { Place } from "./lessons.schemas";

/** Block lists are validated by the shared validator, so every problem comes back with its path. */
export function assertValidBlocks(input: unknown, label = "blocks"): void {
  const { issues } = validateBlocks(input, label);
  if (issues.length > 0) {
    throw new ValidationError(`${issues[0].path} ${issues[0].message}`, {
      issues,
    });
  }
}

function requireValidNumber(number: string): string {
  if (!isValidScreenNumber(number)) {
    throw new ValidationError(
      `"${number}" is not a valid screen number (for example 213 or 213.010)`,
    );
  }
  return normalizeScreenNumber(number);
}

async function requireScreenOfLesson(
  db: Queryable,
  lesson: lessonsRepo.LessonRow,
  number: string,
): Promise<screensRepo.ScreenRow> {
  const screen = await screensRepo.findScreenByNumber(
    db,
    lesson.subject_id,
    requireValidNumber(number),
  );
  if (!screen || screen.lesson_id !== lesson.id) {
    throw new NotFoundError(
      `Screen ${number} is not a screen of lesson "${lesson.slug}"`,
    );
  }
  return screen;
}

/** The number a new screen gets: the one asked for, right after or before another, or the end of the lesson. */
export async function chooseScreenNumber(
  db: Queryable,
  lesson: lessonsRepo.LessonRow,
  place: Place | undefined,
): Promise<string> {
  const subjectId = lesson.subject_id;
  if (place?.number) {
    const number = requireValidNumber(place.number);
    if (await screensRepo.findScreenByNumber(db, subjectId, number)) {
      throw new ConflictError(`Screen ${number} already exists`);
    }
    return number;
  }
  if (place?.after) {
    const anchor = await requireScreenOfLesson(db, lesson, place.after);
    return suggestScreenNumber(
      anchor.number,
      await screensRepo.nextNumberAfter(db, subjectId, anchor.number),
    );
  }
  if (place?.before) {
    const anchor = await requireScreenOfLesson(db, lesson, place.before);
    return suggestScreenNumber(
      await screensRepo.previousNumberBefore(db, subjectId, anchor.number),
      anchor.number,
    );
  }
  const last =
    (await screensRepo.highestNumber(db, subjectId, lesson.id)) ??
    (await screensRepo.highestNumber(db, subjectId));
  return last === null
    ? "1"
    : suggestScreenNumber(
        last,
        await screensRepo.nextNumberAfter(db, subjectId, last),
      );
}

export async function createScreen(
  db: Queryable,
  lesson: lessonsRepo.LessonRow,
  fields: {
    blocks: unknown;
    place?: Place;
    authorKind: screensRepo.AuthorKind;
    sources?: unknown;
  },
): Promise<screensRepo.ScreenRow> {
  assertValidBlocks(fields.blocks);
  const blocks = await renderBlocks(
    db,
    lesson.subject_id,
    fields.blocks,
    fields.authorKind,
  );
  const number = await chooseScreenNumber(db, lesson, fields.place);
  return screensRepo.insertScreen(db, {
    subjectId: lesson.subject_id,
    lessonId: lesson.id,
    number,
    blocks,
    authorKind: fields.authorKind,
    sources: fields.sources ?? null,
  });
}

/** Screen numbers to ids, all active screens of this lesson. Names every one that is not. */
async function resolveTeachingScreens(
  db: Queryable,
  lesson: lessonsRepo.LessonRow,
  numbers: string[],
  known: Map<string, string> = new Map(),
): Promise<string[]> {
  const screens = await screensRepo.listScreens(db, lesson.id);
  const active = new Map(
    screens.filter((s) => s.retired_at === null).map((s) => [s.number, s.id]),
  );
  const ids: string[] = [];
  for (const raw of [...new Set(numbers)]) {
    const id =
      known.get(raw) ??
      active.get(isValidScreenNumber(raw) ? normalizeScreenNumber(raw) : raw);
    if (!id)
      throw new ValidationError(
        `Teaching screen "${raw}" is not an active screen of lesson "${lesson.slug}"`,
      );
    ids.push(id);
  }
  return ids;
}

export interface QuestionFields {
  prompt: unknown;
  options: unknown;
  screens: string[];
  covers: string[];
  variants?: { prompt: unknown; options: unknown }[];
}

/** A question, its teaching-screen and concept links, and its variants. `refs` maps import refs to screen ids. */
export async function createQuestion(
  db: Queryable,
  lesson: lessonsRepo.LessonRow,
  fields: QuestionFields,
  refs: Map<string, string> = new Map(),
): Promise<questionsRepo.QuestionRow> {
  const drawn = await renderQuestionBlocks(db, lesson.subject_id, fields);
  const question = await questionsRepo.insertQuestion(db, {
    lessonId: lesson.id,
    parentId: null,
    prompt: drawn.prompt,
    options: drawn.options,
  });
  await questionsRepo.replaceQuestionScreens(
    db,
    question.id,
    await resolveTeachingScreens(db, lesson, fields.screens, refs),
  );
  await questionsRepo.replaceQuestionConcepts(
    db,
    question.id,
    await resolveConceptIds(db, lesson.subject_id, fields.covers),
  );
  for (const variant of fields.variants ?? []) {
    const drawnVariant = await renderQuestionBlocks(
      db,
      lesson.subject_id,
      variant,
    );
    await questionsRepo.insertQuestion(db, {
      lessonId: lesson.id,
      parentId: question.id,
      prompt: drawnVariant.prompt,
      options: drawnVariant.options,
    });
  }
  return question;
}

export { resolveTeachingScreens };

export async function createLessonRow(
  db: Queryable,
  subjectId: string,
  fields: {
    slug: string;
    title: string;
    summary: string;
    moduleId: string | null;
    covers: string[];
  },
): Promise<lessonsRepo.LessonRow> {
  if (await lessonsRepo.findLessonBySlug(db, subjectId, fields.slug)) {
    throw new ConflictError(`A lesson "${fields.slug}" already exists`);
  }
  if (
    fields.moduleId &&
    !(await lessonsRepo.findModule(db, subjectId, fields.moduleId))
  ) {
    throw new NotFoundError("Module not found");
  }
  const lesson = await lessonsRepo.insertLesson(db, subjectId, fields);
  await lessonsRepo.replaceLessonConcepts(
    db,
    lesson.id,
    await resolveConceptIds(db, subjectId, fields.covers),
  );
  return lesson;
}
