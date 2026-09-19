import type { PoolClient } from "pg";
import {
  canFinish,
  canSave,
  lintLesson,
  wouldCreateCycle,
  type ConceptEdge,
  type LessonIssue,
} from "@flashkarte/shared";
import { withTransaction } from "../../db/client";
import type { Queryable } from "../../db/queryable";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { listConcepts } from "../subjects/concepts.repository";
import * as subjectsRepo from "../subjects/subjects.repository";
import { loadLessonForLint } from "./lesson-loader";
import * as lessonsRepo from "./lessons.repository";

export type LockedEdit<T> = (
  db: PoolClient,
  subject: subjectsRepo.SubjectRow,
) => Promise<T>;

/**
 * Runs an edit under the subject's row lock, so concurrent edits to one subject's lessons are
 * serialised (two inserts can never be handed the same screen number). Not found and not yours
 * look the same.
 */
export function withLockedSubject<T>(
  userId: string,
  subjectId: string,
  edit: LockedEdit<T>,
): Promise<T> {
  return withTransaction(async (db) => {
    const subject = await subjectsRepo.lockOwnedSubject(db, userId, subjectId);
    if (!subject) throw new NotFoundError("Subject not found");
    return edit(db, subject);
  });
}

export async function requireLesson(
  db: Queryable,
  subjectId: string,
  slug: string,
): Promise<lessonsRepo.LessonRow> {
  const lesson = await lessonsRepo.findLessonBySlug(db, subjectId, slug);
  if (!lesson) throw new NotFoundError(`Lesson "${slug}" not found`);
  return lesson;
}

/** Concept slugs to ids, all within one subject. Names every slug that does not exist. */
export async function resolveConceptIds(
  db: Queryable,
  subjectId: string,
  slugs: string[],
): Promise<string[]> {
  const unique = [...new Set(slugs)];
  const concepts = await listConcepts(db, subjectId);
  const bySlug = new Map(concepts.map((concept) => [concept.slug, concept.id]));
  const missing = unique.filter((slug) => !bySlug.has(slug));
  if (missing.length > 0) {
    throw new ValidationError(
      `Unknown concept${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}`,
    );
  }
  return unique.map((slug) => bySlug.get(slug)!);
}

/**
 * The lesson may not be stored malformed: structural problems reject the change (the caller's
 * transaction rolls back). Everything else is returned so the author sees what is still to do.
 */
export async function lintAfterEdit(
  db: Queryable,
  lesson: lessonsRepo.LessonRow,
): Promise<LessonIssue[]> {
  const issues = lintLesson(await loadLessonForLint(db, lesson));
  if (!canSave(issues)) {
    const structural = issues.filter((issue) => issue.level === "structural");
    throw new ValidationError(structural[0].message, { issues: structural });
  }
  return issues;
}

/** A finished lesson is additive-only; this is the message for everything it does not allow. */
export function assertTesting(
  lesson: lessonsRepo.LessonRow,
  action: string,
): void {
  if (lesson.stage === "finished") {
    throw new ValidationError(
      `Cannot ${action}: lesson "${lesson.slug}" is finished. A finished lesson accepts new screens, ` +
        `new questions and edits, but nothing is deleted or moved; retire a screen instead.`,
    );
  }
}

export function assertCanFinish(issues: LessonIssue[]): void {
  if (!canFinish(issues)) {
    const blocking = issues.filter(
      (issue) => issue.level === "structural" || issue.level === "completeness",
    );
    throw new ValidationError(
      `The lesson is not complete enough to finish: ${blocking.length} thing${blocking.length === 1 ? "" : "s"} to fix`,
      { issues: blocking },
    );
  }
}

/** True when adding `from -> to` between these lessons would make the graph cyclic. */
export function lessonEdgeMakesCycle(
  edges: lessonsRepo.PrerequisiteRow[],
  fromLesson: string,
  toLesson: string,
): boolean {
  const graph: ConceptEdge[] = edges.map((edge) => ({
    from: edge.from_lesson,
    to: edge.to_lesson,
    strength: "requires",
    reason: edge.reason,
  }));
  return wouldCreateCycle(graph, fromLesson, toLesson);
}
