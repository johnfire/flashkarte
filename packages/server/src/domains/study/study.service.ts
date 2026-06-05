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

interface SyncEvent {
  event_id: string;
  card_id: string;
  rating: number;
  reviewed_at: string;
}

function parseEvent(e: unknown): SyncEvent | null {
  if (!e || typeof e !== "object") return null;
  const o = e as Record<string, unknown>;
  if (typeof o.event_id !== "string") return null;
  if (typeof o.card_id !== "string") return null;
  if (
    typeof o.rating !== "number" ||
    !Number.isInteger(o.rating) ||
    o.rating < 1 ||
    o.rating > 5
  ) {
    return null;
  }
  if (
    typeof o.reviewed_at !== "string" ||
    Number.isNaN(Date.parse(o.reviewed_at))
  ) {
    return null;
  }
  return {
    event_id: o.event_id,
    card_id: o.card_id,
    rating: o.rating,
    reviewed_at: o.reviewed_at,
  };
}

export async function sync(userId: string, events: unknown) {
  if (!Array.isArray(events)) {
    throw new ValidationError("events must be an array");
  }

  const acked: string[] = [];
  const valid: SyncEvent[] = [];
  for (const raw of events) {
    const ev = parseEvent(raw);
    if (ev) {
      valid.push(ev);
    } else if (
      raw &&
      typeof (raw as { event_id?: unknown }).event_id === "string"
    ) {
      // permanently invalid — ack so the client drops it from its outbox
      acked.push((raw as { event_id: string }).event_id);
    }
  }

  // Apply per card, in reviewed_at order. Stable sort by (card_id, reviewed_at).
  valid.sort((a, b) =>
    a.card_id === b.card_id
      ? a.reviewed_at.localeCompare(b.reviewed_at)
      : a.card_id.localeCompare(b.card_id),
  );

  const progressByCard = new Map<
    string,
    {
      card_id: string;
      easiness: number;
      interval: number;
      repetitions: number;
      due_at: string;
      last_rating: number;
    }
  >();
  const prevByCard = new Map<
    string,
    { easiness: number; interval: number; repetitions: number }
  >();

  for (const ev of valid) {
    const owns = await repo.cardBelongsToUser(userId, ev.card_id);
    if (!owns) {
      acked.push(ev.event_id); // not ours / gone — drop it
      continue;
    }
    const inserted = await repo.insertReviewEvent(userId, ev);
    acked.push(ev.event_id);
    if (!inserted) continue; // duplicate — already applied in a previous sync

    let prev = prevByCard.get(ev.card_id);
    if (!prev) {
      const row = await repo.getProgressRow(userId, ev.card_id);
      prev = row
        ? {
            easiness: row.ease_factor,
            interval: row.interval_days,
            repetitions: row.repetitions,
          }
        : { easiness: 2.5, interval: 0, repetitions: 0 };
    }
    const next = calculate(prev, ev.rating);
    const dueAt = new Date(
      new Date(ev.reviewed_at).getTime() + next.interval * 86400_000,
    );
    await repo.upsertProgressAt(userId, ev.card_id, {
      repetitions: next.repetitions,
      easeFactor: next.easiness,
      intervalDays: next.interval,
      dueAt,
      lastRating: ev.rating,
      lastReviewedAt: new Date(ev.reviewed_at),
    });
    prevByCard.set(ev.card_id, next);
    progressByCard.set(ev.card_id, {
      card_id: ev.card_id,
      easiness: next.easiness,
      interval: next.interval,
      repetitions: next.repetitions,
      due_at: dueAt.toISOString(),
      last_rating: ev.rating,
    });
  }

  return {
    acked_event_ids: acked,
    progress: Array.from(progressByCard.values()),
  };
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
