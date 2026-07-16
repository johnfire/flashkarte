import { z } from "zod";
import { calculate } from "@flashkarte/shared";
import { ValidationError, NotFoundError } from "../../utils/errors";
import { parse } from "../../utils/validate";
import * as repo from "./study.repository";

const ratingSchema = z
  .number({ error: "rating must be an integer 1-5" })
  .int("rating must be an integer 1-5")
  .min(1, "rating must be an integer 1-5")
  .max(5, "rating must be an integer 1-5");

const syncEventSchema = z.object({
  event_id: z.string(),
  card_id: z.string(),
  rating: ratingSchema,
  reviewed_at: z
    .string()
    .refine((s) => !Number.isNaN(Date.parse(s)), "Invalid reviewed_at date"),
  // Diagnostic-card MC pick (Spec 01): index into the card's authored options.
  // Optional and nullable — old clients omit it and must keep working.
  option_index: z.number().int().min(0).nullable().optional(),
});

export function getStudyBatch(userId: string, deckId: string, limit = 20) {
  return repo.getDueAndNewCards(userId, deckId, limit);
}

export async function review(userId: string, cardId: unknown, rating: unknown) {
  const validCardId = parse(
    z.string({ error: "card_id is required" }).min(1, "card_id is required"),
    cardId,
  );
  const validRating = parse(ratingSchema, rating);
  const owns = await repo.cardBelongsToUser(userId, validCardId);
  if (!owns) throw new NotFoundError("Card not found");

  const row = await repo.getProgressRow(userId, validCardId);
  const prev = row
    ? {
        easiness: row.ease_factor,
        interval: row.interval_days,
        repetitions: row.repetitions,
      }
    : { easiness: 2.5, interval: 0, repetitions: 0 };
  const next = calculate(prev, validRating);
  const dueAt = new Date(Date.now() + next.interval * 86400_000);
  await repo.upsertProgress(userId, validCardId, {
    repetitions: next.repetitions,
    easeFactor: next.easiness,
    intervalDays: next.interval,
    dueAt,
    lastRating: validRating,
  });
  return { card_id: validCardId, ...next, due_at: dueAt.toISOString() };
}

type SyncEvent = z.infer<typeof syncEventSchema>;

function parseEvent(e: unknown): SyncEvent | null {
  const parsed = syncEventSchema.safeParse(e);
  return parsed.success ? parsed.data : null;
}

// One sync call applies events serially with several DB round-trips each, so an
// unbounded array is a request-amplification DoS. Clients drain their outbox in
// reasonable chunks; cap well above that.
const MAX_SYNC_EVENTS = 1000;

export async function sync(userId: string, events: unknown) {
  if (!Array.isArray(events)) {
    throw new ValidationError("events must be an array");
  }
  if (events.length > MAX_SYNC_EVENTS) {
    throw new ValidationError(`too many events (max ${MAX_SYNC_EVENTS})`);
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
