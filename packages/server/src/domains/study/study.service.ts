import { calculate } from "@flashkarte/shared";
import { ValidationError, NotFoundError } from "../../utils/errors";
import * as repo from "./study.repository";

export function getStudyBatch(userId: string, deckId: string, limit = 20) {
  return repo.getDueAndNewCards(userId, deckId, limit);
}

export async function review(userId: string, cardId: unknown, rating: unknown) {
  if (typeof cardId !== "string") {
    throw new ValidationError("card_id is required");
  }
  if (
    typeof rating !== "number" ||
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5
  ) {
    throw new ValidationError("rating must be an integer 1-5");
  }
  const owns = await repo.cardBelongsToUser(userId, cardId);
  if (!owns) throw new NotFoundError("Card not found");

  const row = await repo.getProgressRow(userId, cardId);
  const prev = row
    ? {
        easiness: row.ease_factor,
        interval: row.interval_days,
        repetitions: row.repetitions,
      }
    : { easiness: 2.5, interval: 0, repetitions: 0 };
  const next = calculate(prev, rating);
  const dueAt = new Date(Date.now() + next.interval * 86400_000);
  await repo.upsertProgress(userId, cardId, {
    repetitions: next.repetitions,
    easeFactor: next.easiness,
    intervalDays: next.interval,
    dueAt,
    lastRating: rating,
  });
  return { card_id: cardId, ...next, due_at: dueAt.toISOString() };
}

export async function stats(userId: string, deckId: string) {
  const r = await repo.getStats(userId, deckId);
  return {
    total: parseInt(r?.total ?? "0", 10),
    new: parseInt(r?.new ?? "0", 10),
    due: parseInt(r?.due ?? "0", 10),
    learned: parseInt(r?.learned ?? "0", 10),
    viewed: parseInt(r?.viewed ?? "0", 10),
    again: parseInt(r?.again ?? "0", 10),
    hard: parseInt(r?.hard ?? "0", 10),
    good: parseInt(r?.good ?? "0", 10),
    easy: parseInt(r?.easy ?? "0", 10),
  };
}
