import { ValidationError } from "../../utils/errors";
import { parse } from "../../utils/validate";
import {
  lessonEdgeMakesCycle,
  lintAfterEdit,
  requireLesson,
  withLockedSubject,
} from "./lesson-context";
import { createLessonRow, createQuestion, createScreen } from "./lesson-writes";
import * as repo from "./lessons.repository";
import { importLessonSchema, type LessonImport } from "./lessons.schemas";
import type { AuthorKind } from "./screens.repository";
import type { Queryable } from "../../db/queryable";

async function findOrCreateModule(
  db: Queryable,
  subjectId: string,
  title: string | undefined,
) {
  if (!title) return null;
  const existing = (await repo.listModules(db, subjectId)).find(
    (module) => module.title.toLowerCase() === title.toLowerCase(),
  );
  return existing ?? repo.insertModule(db, subjectId, title);
}

function assertUniqueRefs(screens: LessonImport["screens"]): void {
  const seen = new Set<string>();
  for (const { ref } of screens) {
    if (!ref) continue;
    if (seen.has(ref))
      throw new ValidationError(`Screen ref "${ref}" is used twice`);
    seen.add(ref);
  }
}

async function addPrerequisites(
  db: Queryable,
  subjectId: string,
  lesson: repo.LessonRow,
  prerequisites: LessonImport["lesson"]["prerequisites"],
): Promise<void> {
  for (const { lesson: fromSlug, reason } of prerequisites) {
    const from = await requireLesson(db, subjectId, fromSlug);
    if (
      lessonEdgeMakesCycle(
        await repo.listPrerequisites(db, subjectId),
        from.id,
        lesson.id,
      )
    ) {
      throw new ValidationError(
        `"${fromSlug}" cannot be a prerequisite of "${lesson.slug}": that would create a cycle`,
      );
    }
    await repo.upsertPrerequisite(db, {
      from_lesson: from.id,
      to_lesson: lesson.id,
      reason,
    });
  }
}

/**
 * Creates a whole lesson in one transaction: the lesson, its module, prerequisites, every screen
 * (numbered in order, after the lesson's existing screens) and every question with its variants.
 * Structural problems reject the whole import, leaving nothing behind; anything left to do
 * (a concept nothing tests, a formula without spoken text) comes back with the result.
 */
export async function importLesson(
  userId: string,
  subjectId: string,
  input: unknown,
  authorKind: AuthorKind,
) {
  const data = parse(importLessonSchema, input);
  assertUniqueRefs(data.screens);
  return withLockedSubject(userId, subjectId, async (db, subject) => {
    const module = await findOrCreateModule(db, subject.id, data.module);
    const lesson = await createLessonRow(db, subject.id, {
      slug: data.lesson.slug,
      title: data.lesson.title,
      summary: data.lesson.summary,
      moduleId: module?.id ?? null,
      covers: data.lesson.covers,
    });
    await addPrerequisites(db, subject.id, lesson, data.lesson.prerequisites);

    const refs = new Map<string, string>();
    const screens: { number: string; ref: string | null }[] = [];
    for (const screen of data.screens) {
      const row = await createScreen(db, lesson, {
        blocks: screen.blocks,
        place: screen.number ? { number: screen.number } : undefined,
        authorKind,
        sources: screen.sources,
      });
      screens.push({ number: row.number, ref: screen.ref ?? null });
      if (screen.ref) refs.set(screen.ref, row.id);
      refs.set(row.number, row.id);
    }
    const questionIds: string[] = [];
    for (const question of data.questions) {
      const created = await createQuestion(
        db,
        lesson,
        { ...question, screens: question.teaches },
        refs,
      );
      questionIds.push(created.id);
    }
    return {
      lesson: { slug: lesson.slug, title: lesson.title, stage: lesson.stage },
      module: module ? { id: module.id, title: module.title } : null,
      screens,
      question_ids: questionIds,
      issues: await lintAfterEdit(db, lesson),
    };
  });
}
