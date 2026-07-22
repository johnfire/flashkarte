import { z } from "zod";
import type { PoolClient } from "pg";
import { calculate } from "@flashkarte/shared";
import { NotFoundError } from "../../utils/errors";
import { parse } from "../../utils/validate";
import { recordRequired } from "../audit/audit.service";
import type { AuditActor } from "../audit/audit.types";
import * as repo from "./study.repository";

const ratingSchema = z
  .number({ error: "rating must be an integer 1-5" })
  .int("rating must be an integer 1-5")
  .min(1, "rating must be an integer 1-5")
  .max(5, "rating must be an integer 1-5");
const MAX_SYNC_EVENTS = 1000;
const syncEventsSchema = z
  .array(z.unknown(), { error: "events must be an array" })
  .max(MAX_SYNC_EVENTS, `too many events (max ${MAX_SYNC_EVENTS})`);

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

export async function review(
  userId: string,
  cardId: unknown,
  rating: unknown,
  actor: AuditActor = { type: "user", id: userId },
) {
  const validCardId = parse(
    z.string({ error: "card_id is required" }).min(1, "card_id is required"),
    cardId,
  );
  const validRating = parse(ratingSchema, rating);
  return repo.withCardProgressLock(userId, validCardId, async (client) => {
    const ownedCard = await repo.cardBelongsToUser(userId, validCardId, client);
    if (!ownedCard) throw new NotFoundError("Card not found");
    const progressRow = await repo.getProgressRow(userId, validCardId, client);
    const previous = progressFromRow(progressRow);
    const update = calculateProgress(previous, validRating, new Date());
    await repo.upsertProgress(userId, validCardId, update.write, client);
    await recordRequired(
      {
        actor,
        action: "study.reviewed",
        targetType: "card",
        targetId: validCardId,
        afterState: { rating: validRating },
      },
      client,
    );
    return {
      card_id: validCardId,
      ...update.next,
      due_at: update.write.dueAt.toISOString(),
    };
  });
}

type SyncEvent = z.infer<typeof syncEventSchema>;

function parseEvent(candidate: unknown): SyncEvent | null {
  const parsed = syncEventSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

// One sync call applies events serially with several DB round-trips each, so an
// unbounded array is a request-amplification DoS. Clients drain their outbox in
// reasonable chunks; cap well above that.
interface ProgressState {
  easiness: number;
  interval: number;
  repetitions: number;
}

interface ProgressWrite {
  repetitions: number;
  easeFactor: number;
  intervalDays: number;
  dueAt: Date;
  lastRating: number;
}

function progressFromRow(
  row: Awaited<ReturnType<typeof repo.getProgressRow>>,
): ProgressState {
  if (!row) return { easiness: 2.5, interval: 0, repetitions: 0 };
  return {
    easiness: row.ease_factor,
    interval: row.interval_days,
    repetitions: row.repetitions,
  };
}

function calculateProgress(
  previous: ProgressState,
  rating: number,
  reviewedAt: Date,
): { next: ProgressState; write: ProgressWrite } {
  const next = calculate(previous, rating);
  const dueAt = new Date(reviewedAt.getTime() + next.interval * 86400_000);
  return {
    next,
    write: {
      repetitions: next.repetitions,
      easeFactor: next.easiness,
      intervalDays: next.interval,
      dueAt,
      lastRating: rating,
    },
  };
}

function validateSyncEvents(events: unknown): {
  ackedEventIds: string[];
  validEvents: SyncEvent[];
} {
  const eventCandidates = parse(syncEventsSchema, events);

  const ackedEventIds: string[] = [];
  const validEvents: SyncEvent[] = [];
  for (const rawEvent of eventCandidates) {
    const event = parseEvent(rawEvent);
    if (event) {
      validEvents.push(event);
    } else if (
      rawEvent &&
      typeof (rawEvent as { event_id?: unknown }).event_id === "string"
    ) {
      ackedEventIds.push((rawEvent as { event_id: string }).event_id);
    }
  }
  return { ackedEventIds, validEvents };
}

function sortSyncEvents(events: SyncEvent[]): SyncEvent[] {
  return [...events].sort((left, right) =>
    left.card_id === right.card_id
      ? left.reviewed_at.localeCompare(right.reviewed_at)
      : left.card_id.localeCompare(right.card_id),
  );
}

function groupOwnedEvents(
  events: SyncEvent[],
  ownedCardIds: Set<string>,
): { byCard: Map<string, SyncEvent[]>; unownedEventIds: string[] } {
  const byCard = new Map<string, SyncEvent[]>();
  const unownedEventIds: string[] = [];
  for (const event of sortSyncEvents(events)) {
    if (!ownedCardIds.has(event.card_id)) {
      unownedEventIds.push(event.event_id);
      continue;
    }
    const cardEvents = byCard.get(event.card_id) ?? [];
    cardEvents.push(event);
    byCard.set(event.card_id, cardEvents);
  }
  return { byCard, unownedEventIds };
}

interface CardSyncProgress extends ProgressState {
  card_id: string;
  due_at: string;
  last_rating: number;
}

interface LatestAppliedEvent {
  event: SyncEvent;
  next: ProgressState;
  write: ProgressWrite;
}

async function applyNewCardEvents(
  userId: string,
  events: SyncEvent[],
  initialProgress: ProgressState,
  client: PoolClient,
): Promise<{ ackedEventIds: string[]; latest: LatestAppliedEvent | null }> {
  const ackedEventIds: string[] = [];
  let previous = initialProgress;
  let latest: LatestAppliedEvent | null = null;
  for (const event of events) {
    const inserted = await repo.insertReviewEvent(userId, event, client);
    ackedEventIds.push(event.event_id);
    if (!inserted) continue;
    const update = calculateProgress(
      previous,
      event.rating,
      new Date(event.reviewed_at),
    );
    previous = update.next;
    latest = { event, ...update };
  }
  return { ackedEventIds, latest };
}

async function applyCardEvents(
  userId: string,
  cardId: string,
  events: SyncEvent[],
  actor: AuditActor,
): Promise<{ ackedEventIds: string[]; progress: CardSyncProgress | null }> {
  return repo.withCardProgressLock(userId, cardId, async (client) => {
    const row = await repo.getProgressRow(userId, cardId, client);
    const applied = await applyNewCardEvents(
      userId,
      events,
      progressFromRow(row),
      client,
    );
    if (!applied.latest) {
      return { ackedEventIds: applied.ackedEventIds, progress: null };
    }
    const latest = applied.latest;
    await repo.upsertProgressAt(
      userId,
      cardId,
      { ...latest.write, lastReviewedAt: new Date(latest.event.reviewed_at) },
      client,
    );
    await recordRequired(
      {
        actor,
        action: "study.synced",
        targetType: "card",
        targetId: cardId,
        afterState: { rating: latest.event.rating, eventCount: events.length },
      },
      client,
    );
    return {
      ackedEventIds: applied.ackedEventIds,
      progress: {
        card_id: cardId,
        ...latest.next,
        due_at: latest.write.dueAt.toISOString(),
        last_rating: latest.event.rating,
      },
    };
  });
}

export async function sync(
  userId: string,
  events: unknown,
  actor: AuditActor = { type: "user", id: userId },
) {
  const parsed = validateSyncEvents(events);
  const distinctCardIds = [
    ...new Set(parsed.validEvents.map((event) => event.card_id)),
  ];
  const ownedCardIds = await repo.getOwnedCardIds(userId, distinctCardIds);
  const grouped = groupOwnedEvents(parsed.validEvents, ownedCardIds);
  const ackedEventIds = [...parsed.ackedEventIds, ...grouped.unownedEventIds];
  const progress: CardSyncProgress[] = [];

  for (const [cardId, cardEvents] of grouped.byCard) {
    const applied = await applyCardEvents(userId, cardId, cardEvents, actor);
    ackedEventIds.push(...applied.ackedEventIds);
    if (applied.progress) progress.push(applied.progress);
  }

  return {
    acked_event_ids: ackedEventIds,
    progress,
  };
}

export async function stats(userId: string, deckId: string) {
  const statsRow = await repo.getStats(userId, deckId);
  return {
    total: parseInt(statsRow?.total ?? "0", 10),
    new: parseInt(statsRow?.new ?? "0", 10),
    due: parseInt(statsRow?.due ?? "0", 10),
    learned: parseInt(statsRow?.learned ?? "0", 10),
    viewed: parseInt(statsRow?.viewed ?? "0", 10),
    again: parseInt(statsRow?.again ?? "0", 10),
    hard: parseInt(statsRow?.hard ?? "0", 10),
    good: parseInt(statsRow?.good ?? "0", 10),
    easy: parseInt(statsRow?.easy ?? "0", 10),
  };
}
