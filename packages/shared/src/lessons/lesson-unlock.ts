/**
 * Which lessons a learner may open. A lesson unlocks when every one of its prerequisite lessons is
 * passed. Locked lessons stay visible, with what they are waiting for.
 *
 * Progress is never taken away by a later edit: a lesson already passed stays passed, and one in
 * progress stays open, even if a prerequisite was added to it afterwards.
 */

export type LessonProgressStatus = "not_started" | "in_progress" | "passed";
export type LessonAccess = "locked" | "available" | "in_progress" | "passed";

export interface LessonAccessInfo {
  access: LessonAccess;
  /** Prerequisite lesson ids that are not passed yet. */
  missing: string[];
}

export interface PrerequisiteEdge {
  /** The prerequisite lesson. */
  from: string;
  /** The lesson that depends on it. */
  to: string;
}

export function computeLessonAccess(
  lessonIds: string[],
  edges: PrerequisiteEdge[],
  status: Map<string, LessonProgressStatus>,
): Map<string, LessonAccessInfo> {
  const known = new Set(lessonIds);
  const statusOf = (id: string): LessonProgressStatus =>
    status.get(id) ?? "not_started";
  const result = new Map<string, LessonAccessInfo>();
  for (const id of lessonIds) {
    const missing = edges
      .filter(
        (edge) =>
          edge.to === id &&
          known.has(edge.from) &&
          statusOf(edge.from) !== "passed",
      )
      .map((edge) => edge.from);
    const current = statusOf(id);
    const access: LessonAccess =
      current === "passed"
        ? "passed"
        : current === "in_progress"
          ? "in_progress"
          : missing.length > 0
            ? "locked"
            : "available";
    result.set(id, { access, missing });
  }
  return result;
}

/** A learner may start a lesson that is available, or resume one in progress. */
export function canOpen(info: LessonAccessInfo): boolean {
  return info.access === "available" || info.access === "in_progress";
}
