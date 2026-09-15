import { z } from "zod";
import { STABLE_REPS } from "@flashkarte/shared";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { parse } from "../../utils/validate";
import * as repo from "./courses.repository";
import type { CourseDeckRow } from "./courses.repository";

const titleSchema = z
  .string({ error: "Title is required" })
  .trim()
  .min(1, "Title is required")
  .max(200, "Title is too long");
const descriptionSchema = z.string().trim().max(2000).nullable();
const isPublicSchema = z.boolean();

export interface CourseDeckView extends CourseDeckRow {
  mastered: boolean;
  locked: boolean;
}

/**
 * Fold the ordered per-deck card counts into lock state. An empty deck is
 * vacuously mastered (every card in a set of zero is stable) so it can't
 * become a permanent dead end; deck 0 is always unlocked.
 */
export function computeGating(rows: CourseDeckRow[]): CourseDeckView[] {
  let previousMastered = true;
  return rows.map((row) => {
    const mastered =
      row.card_count === 0 || row.mastered_count === row.card_count;
    const locked = !previousMastered;
    previousMastered = mastered;
    return { ...row, mastered, locked };
  });
}

export async function createCourse(
  userId: string,
  titleInput: unknown,
  descriptionInput: unknown = null,
) {
  const title = parse(titleSchema, titleInput);
  const description = parse(descriptionSchema, descriptionInput ?? null);
  const course = await repo.createCourse(userId, title, description);
  if (!course) throw new Error("Failed to create course");
  return course;
}

export async function listCourses(userId: string) {
  const courses = await repo.listCourses(userId);
  return Promise.all(
    courses.map(async (course) => {
      const decks = computeGating(
        await repo.getCourseDecks(userId, course.id, STABLE_REPS),
      );
      return {
        ...course,
        decks_total: decks.length,
        decks_mastered: decks.filter((d) => d.mastered).length,
      };
    }),
  );
}

export async function getCourse(userId: string, id: string) {
  const course = await repo.getCourse(userId, id);
  if (!course) throw new NotFoundError("Course not found");
  const decks = computeGating(
    await repo.getCourseDecks(userId, id, STABLE_REPS),
  );
  return { ...course, decks };
}

export async function updateCourse(
  userId: string,
  id: string,
  patchInput: {
    title?: unknown;
    description?: unknown;
    isPublic?: unknown;
  },
) {
  const current = await repo.getOwnedCourse(userId, id);
  if (!current) throw new NotFoundError("Course not found");
  const next = {
    title:
      patchInput.title !== undefined
        ? parse(titleSchema, patchInput.title)
        : current.title,
    description:
      patchInput.description !== undefined
        ? parse(descriptionSchema, patchInput.description)
        : current.description,
    is_public:
      patchInput.isPublic !== undefined
        ? parse(isPublicSchema, patchInput.isPublic)
        : current.is_public,
  };
  const updated = await repo.updateCourseRow(id, next);
  if (!updated) throw new NotFoundError("Course not found");
  return updated;
}

export async function deleteCourse(userId: string, id: string) {
  const course = await repo.getOwnedCourse(userId, id);
  if (!course) throw new NotFoundError("Course not found");
  await repo.deleteCourse(id);
}

export async function addDeckToCourse(
  userId: string,
  courseId: string,
  deckIdInput: unknown,
) {
  const deckId = parse(
    z.string({ error: "deck_id is required" }).min(1),
    deckIdInput,
  );
  const course = await repo.getOwnedCourse(userId, courseId);
  if (!course) throw new NotFoundError("Course not found");
  const deck = await repo.deckBelongsToUser(userId, deckId);
  if (!deck) throw new NotFoundError("Deck not found");
  const existing = await repo.isDeckInCourse(courseId, deckId);
  if (existing) {
    throw new ValidationError("That deck is already in this course");
  }
  await repo.addDeckToCourse(courseId, deckId);
  return { course_id: courseId, deck_id: deckId };
}

export async function removeDeckFromCourse(
  userId: string,
  courseId: string,
  deckId: string,
) {
  const course = await repo.getOwnedCourse(userId, courseId);
  if (!course) throw new NotFoundError("Course not found");
  await repo.removeDeckFromCourse(courseId, deckId);
}

const reorderSchema = z
  .array(z.string().uuid("Each id must be a deck id"), {
    error: "A list of deck ids is required",
  })
  .min(1, "A list of deck ids is required");

export async function reorderCourseDecks(
  userId: string,
  courseId: string,
  orderedDeckIdsInput: unknown,
) {
  const course = await repo.getOwnedCourse(userId, courseId);
  if (!course) throw new NotFoundError("Course not found");
  const orderedDeckIds = parse(reorderSchema, orderedDeckIdsInput);

  const members = await repo.getCourseDecks(userId, courseId, STABLE_REPS);
  const memberIds = new Set(members.map((m) => m.deck_id));
  const inputIds = new Set(orderedDeckIds);
  const sameSet =
    memberIds.size === inputIds.size &&
    [...memberIds].every((id) => inputIds.has(id));
  if (!sameSet) {
    throw new ValidationError(
      "The reorder list must contain exactly this course's existing decks, no more and no fewer",
    );
  }

  await repo.reorderCourseDecks(courseId, orderedDeckIds);
  return { course_id: courseId, order: orderedDeckIds };
}
