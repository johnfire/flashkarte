import type { ConceptEdge } from "../graph/concept-graph-types";
import { topologicalOrder } from "../graph/prerequisites";

/**
 * The course outline, the first thing a learner sees in a subject: modules as headings, and under
 * each the lessons in prerequisite order with what each covers and what unlocks it. It is derived
 * from the lesson graph, never written separately, so it cannot disagree with the lessons.
 *
 * Lessons that are available at the same time are listed in authoring order, which is the
 * recommended path; the learner can still open any available lesson. Locked lessons stay visible
 * with what unlocks them. (A learner's own state, locked or passed, is added on top of this later.)
 */

export interface OutlineModuleInput {
  id: string;
  title: string;
  position: number;
}
export interface OutlineLessonInput {
  id: string;
  moduleId: string | null;
  slug: string;
  title: string;
  summary: string;
  position: number;
  /** "testing" or "finished"; passed through so a client can label an unfinished lesson. */
  stage?: string;
  /** What the lesson covers, for display (concept names). */
  covers: string[];
}
export interface OutlineEdgeInput {
  /** The prerequisite lesson. */
  from: string;
  /** The lesson that depends on it. */
  to: string;
  reason: string;
}

export interface OutlineUnlock {
  lessonId: string;
  title: string;
  reason: string;
}
export interface OutlineLesson {
  id: string;
  slug: string;
  title: string;
  summary: string;
  stage: string | null;
  covers: string[];
  unlocksAfter: OutlineUnlock[];
}
export interface OutlineModule {
  /** Null for lessons that belong to no module. */
  id: string | null;
  title: string | null;
  lessons: OutlineLesson[];
}

function byPosition<T extends { position: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.position - b.position);
}

export function buildOutline(
  modules: OutlineModuleInput[],
  lessons: OutlineLessonInput[],
  edges: OutlineEdgeInput[],
): OutlineModule[] {
  const authoring = byPosition(lessons);
  const authoringIds = authoring.map((lesson) => lesson.id);
  const graphEdges: ConceptEdge[] = edges.map((edge) => ({
    from: edge.from,
    to: edge.to,
    strength: "requires",
    reason: edge.reason,
  }));
  // A cycle cannot be stored (the API refuses it), so the fallback only guards bad data.
  const route = topologicalOrder(authoringIds, graphEdges) ?? authoringIds;
  const rank = new Map(route.map((id, index) => [id, index]));
  const byId = new Map(lessons.map((lesson) => [lesson.id, lesson]));

  const toOutlineLesson = (lesson: OutlineLessonInput): OutlineLesson => ({
    id: lesson.id,
    slug: lesson.slug,
    title: lesson.title,
    summary: lesson.summary,
    stage: lesson.stage ?? null,
    covers: lesson.covers,
    unlocksAfter: edges
      .filter((edge) => edge.to === lesson.id && byId.has(edge.from))
      .map((edge) => ({
        lessonId: edge.from,
        title: byId.get(edge.from)!.title,
        reason: edge.reason,
      }))
      .sort(
        (a, b) => (rank.get(a.lessonId) ?? 0) - (rank.get(b.lessonId) ?? 0),
      ),
  });

  const inRouteOrder = (group: OutlineLessonInput[]) =>
    [...group].sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));

  const result: OutlineModule[] = byPosition(modules).map((module) => ({
    id: module.id,
    title: module.title,
    lessons: inRouteOrder(
      lessons.filter((lesson) => lesson.moduleId === module.id),
    ).map(toOutlineLesson),
  }));
  const moduleIds = new Set(modules.map((module) => module.id));
  const loose = lessons.filter(
    (lesson) => lesson.moduleId === null || !moduleIds.has(lesson.moduleId),
  );
  if (loose.length > 0) {
    result.push({
      id: null,
      title: null,
      lessons: inRouteOrder(loose).map(toOutlineLesson),
    });
  }
  return result;
}
