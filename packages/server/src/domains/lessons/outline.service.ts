import { buildOutline } from "@flashkarte/shared";
import { getPool } from "../../db/client";
import { requireOwnedSubject } from "../subjects/subjects.service";
import * as repo from "./lessons.repository";

/** The course outline, derived from the lesson graph. A learner's own state is added on top later. */
export async function getOutline(userId: string, subjectId: string) {
  await requireOwnedSubject(userId, subjectId);
  const db = getPool();
  const [modules, lessons, covered, prerequisites] = await Promise.all([
    repo.listModules(db, subjectId),
    repo.listLessons(db, subjectId),
    repo.listLessonConcepts(db, subjectId),
    repo.listPrerequisites(db, subjectId),
  ]);
  const outline = buildOutline(
    modules.map((m) => ({ id: m.id, title: m.title, position: m.position })),
    lessons.map((lesson) => ({
      id: lesson.id,
      moduleId: lesson.module_id,
      slug: lesson.slug,
      title: lesson.title,
      summary: lesson.summary,
      position: lesson.position,
      stage: lesson.stage,
      covers: covered
        .filter((c) => c.lesson_id === lesson.id)
        .map((c) => c.name),
    })),
    prerequisites.map((p) => ({
      from: p.from_lesson,
      to: p.to_lesson,
      reason: p.reason,
    })),
  );
  return { subject_id: subjectId, modules: outline };
}
