import { lintLesson, type LessonIssue } from "@flashkarte/shared";
import { getPool } from "../../db/client";
import { ConflictError, NotFoundError } from "../../utils/errors";
import { parse } from "../../utils/validate";
import { requireOwnedSubject } from "../subjects/subjects.service";
import {
  assertCanFinish,
  assertTesting,
  lessonEdgeMakesCycle,
  lintAfterEdit,
  requireLesson,
  resolveConceptIds,
  withLockedSubject,
} from "./lesson-context";
import { loadLessonForLint } from "./lesson-loader";
import { createLessonRow } from "./lesson-writes";
import * as repo from "./lessons.repository";
import * as questionsRepo from "./questions.repository";
import * as screensRepo from "./screens.repository";
import {
  lessonPatchSchema,
  moduleOrderSchema,
  modulePatchSchema,
  newLessonSchema,
  newModuleSchema,
  prerequisiteSchema,
} from "./lessons.schemas";
import { ValidationError } from "../../utils/errors";

export async function createModule(
  userId: string,
  subjectId: string,
  input: unknown,
) {
  const { title } = parse(newModuleSchema, input);
  return withLockedSubject(userId, subjectId, (db, subject) =>
    repo.insertModule(db, subject.id, title),
  );
}

export async function updateModule(
  userId: string,
  subjectId: string,
  moduleId: string,
  input: unknown,
) {
  const patch = parse(modulePatchSchema, input);
  return withLockedSubject(userId, subjectId, async (db, subject) => {
    const current = await repo.findModule(db, subject.id, moduleId);
    if (!current) throw new NotFoundError("Module not found");
    const renamed = await repo.writeModule(db, current.id, {
      title: patch.title ?? current.title,
      position: current.position,
    });
    if (patch.position === undefined) return renamed;
    // Move to the requested place and shift the others, so positions stay 0..n-1 and unique.
    const others = (await repo.listModules(db, subject.id))
      .filter((m) => m.id !== current.id)
      .map((m) => m.id);
    others.splice(Math.min(patch.position, others.length), 0, current.id);
    const moved = await repo.renumberModules(db, subject.id, others);
    return moved.find((m) => m.id === current.id)!;
  });
}

/** Set the order of all modules at once. `module_ids` must name every module of the subject exactly once. */
export async function reorderModules(
  userId: string,
  subjectId: string,
  input: unknown,
) {
  const { module_ids } = parse(moduleOrderSchema, input);
  return withLockedSubject(userId, subjectId, async (db, subject) => {
    const existing = (await repo.listModules(db, subject.id)).map((m) => m.id);
    const wanted = new Set(module_ids);
    const missing = existing.filter((id) => !wanted.has(id));
    const unknown = module_ids.filter((id) => !existing.includes(id));
    if (
      wanted.size !== module_ids.length ||
      missing.length > 0 ||
      unknown.length > 0
    ) {
      throw new ValidationError(
        "module_ids must name every module of the course exactly once" +
          (missing.length ? `; missing: ${missing.join(", ")}` : "") +
          (unknown.length ? `; unknown: ${unknown.join(", ")}` : "") +
          (wanted.size !== module_ids.length ? "; duplicates present" : ""),
      );
    }
    return repo.renumberModules(db, subject.id, module_ids);
  });
}

export async function deleteModule(
  userId: string,
  subjectId: string,
  moduleId: string,
) {
  return withLockedSubject(userId, subjectId, async (db, subject) => {
    const current = await repo.findModule(db, subject.id, moduleId);
    if (!current) throw new NotFoundError("Module not found");
    await repo.removeModule(db, current.id);
  });
}

export async function createLesson(
  userId: string,
  subjectId: string,
  input: unknown,
) {
  const fields = parse(newLessonSchema, input);
  return withLockedSubject(userId, subjectId, async (db, subject) => {
    const lesson = await createLessonRow(db, subject.id, {
      slug: fields.slug,
      title: fields.title,
      summary: fields.summary,
      moduleId: fields.module ?? null,
      covers: fields.covers,
    });
    return { lesson, issues: await lintAfterEdit(db, lesson) };
  });
}

export async function updateLesson(
  userId: string,
  subjectId: string,
  slug: string,
  input: unknown,
) {
  const patch = parse(lessonPatchSchema, input);
  return withLockedSubject(userId, subjectId, async (db, subject) => {
    const current = await requireLesson(db, subject.id, slug);
    if (patch.covers) assertTesting(current, "change what the lesson covers");
    const lesson = await repo.writeLesson(db, current.id, {
      title: patch.title ?? current.title,
      summary: patch.summary ?? current.summary,
      moduleId: patch.module === undefined ? current.module_id : patch.module,
    });
    if (patch.covers) {
      await repo.replaceLessonConcepts(
        db,
        lesson.id,
        await resolveConceptIds(db, subject.id, patch.covers),
      );
    }
    return { lesson, issues: await lintAfterEdit(db, lesson) };
  });
}

export async function deleteLesson(
  userId: string,
  subjectId: string,
  slug: string,
) {
  return withLockedSubject(userId, subjectId, async (db, subject) => {
    const lesson = await requireLesson(db, subject.id, slug);
    assertTesting(lesson, "delete the lesson");
    // Questions go first: a screen a question teaches is protected from deletion.
    for (const question of await questionsRepo.listQuestions(db, lesson.id)) {
      await questionsRepo.removeQuestion(db, question.id);
    }
    await repo.removeLesson(db, lesson.id);
  });
}

/** A prerequisite may only change while the dependent lesson is in testing; it would otherwise re-lock learners. */
export async function setPrerequisite(
  userId: string,
  subjectId: string,
  toSlug: string,
  input: unknown,
) {
  const { from, reason } = parse(prerequisiteSchema, input);
  return withLockedSubject(userId, subjectId, async (db, subject) => {
    const to = await requireLesson(db, subject.id, toSlug);
    assertTesting(to, "change its prerequisites");
    const before = await requireLesson(db, subject.id, from);
    if (
      lessonEdgeMakesCycle(
        await repo.listPrerequisites(db, subject.id),
        before.id,
        to.id,
      )
    ) {
      throw new ValidationError(
        `"${from}" cannot be a prerequisite of "${toSlug}": that would create a cycle`,
      );
    }
    await repo.upsertPrerequisite(db, {
      from_lesson: before.id,
      to_lesson: to.id,
      reason,
    });
    return { from, to: toSlug, reason };
  });
}

export async function removePrerequisite(
  userId: string,
  subjectId: string,
  toSlug: string,
  fromSlug: string,
) {
  return withLockedSubject(userId, subjectId, async (db, subject) => {
    const to = await requireLesson(db, subject.id, toSlug);
    assertTesting(to, "change its prerequisites");
    const from = await requireLesson(db, subject.id, fromSlug);
    if (!(await repo.removePrerequisite(db, from.id, to.id))) {
      throw new NotFoundError("That prerequisite does not exist");
    }
  });
}

/** Moves a lesson from testing to finished. It cannot go back; fix mistakes by retiring and inserting. */
export async function finishLesson(
  userId: string,
  subjectId: string,
  slug: string,
) {
  return withLockedSubject(userId, subjectId, async (db, subject) => {
    const lesson = await requireLesson(db, subject.id, slug);
    if (lesson.stage === "finished") {
      throw new ConflictError(`Lesson "${slug}" is already finished`);
    }
    const issues = lintLesson(await loadLessonForLint(db, lesson));
    assertCanFinish(issues);
    await repo.writeStage(db, lesson.id, "finished");
    return { slug, stage: "finished" as const, issues };
  });
}

export async function lintLessonForOwner(
  userId: string,
  subjectId: string,
  slug: string,
) {
  await requireOwnedSubject(userId, subjectId);
  const lesson = await requireLesson(getPool(), subjectId, slug);
  return lintLesson(await loadLessonForLint(getPool(), lesson));
}

/** Everything about one lesson for its owner: content, links, prerequisites and what is still to do. */
export async function getLesson(
  userId: string,
  subjectId: string,
  slug: string,
) {
  await requireOwnedSubject(userId, subjectId);
  const db = getPool();
  const lesson = await requireLesson(db, subjectId, slug);
  const [screens, questions, links, covered, lessons, prerequisites] =
    await Promise.all([
      screensRepo.listScreens(db, lesson.id),
      questionsRepo.listQuestions(db, lesson.id),
      questionsRepo.loadQuestionLinks(db, lesson.id),
      repo.listLessonConcepts(db, subjectId),
      repo.listLessons(db, subjectId),
      repo.listPrerequisites(db, subjectId),
    ]);
  const issues: LessonIssue[] = lintLesson(await loadLessonForLint(db, lesson));
  const slugOf = new Map(lessons.map((l) => [l.id, l.slug]));
  return {
    lesson: {
      slug: lesson.slug,
      title: lesson.title,
      summary: lesson.summary,
      stage: lesson.stage,
      module_id: lesson.module_id,
    },
    covers: covered
      .filter((c) => c.lesson_id === lesson.id)
      .map(({ slug: s, name }) => ({ slug: s, name })),
    prerequisites: prerequisites
      .filter((p) => p.to_lesson === lesson.id)
      .map((p) => ({
        from: slugOf.get(p.from_lesson) ?? p.from_lesson,
        reason: p.reason,
      })),
    screens: screens.map((s) => ({
      number: s.number,
      blocks: s.blocks,
      retired: s.retired_at !== null,
      author_kind: s.author_kind,
      sources: s.sources,
    })),
    questions: questions
      .filter((q) => q.parent_id === null)
      .map((q) => ({
        id: q.id,
        prompt: q.prompt,
        options: q.options,
        screens: links.screens.get(q.id) ?? [],
        covers: links.concepts.get(q.id) ?? [],
        retired: q.retired_at !== null,
        variants: questions
          .filter((v) => v.parent_id === q.id)
          .map((v) => ({
            id: v.id,
            prompt: v.prompt,
            options: v.options,
            retired: v.retired_at !== null,
          })),
      })),
    issues,
  };
}
