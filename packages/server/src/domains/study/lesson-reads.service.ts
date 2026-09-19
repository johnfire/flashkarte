import { z } from "zod";
import { parse } from "../../utils/validate";
import * as repo from "./study.repository";

const MAX_READS_PER_REQUEST = 500;

const readsSchema = z
  .array(
    z.object({
      card_id: z
        .string({ error: "card_id is required" })
        .uuid("Invalid card id"),
      read_at: z.string().datetime({ offset: true }).optional(),
    }),
    { error: "reads must be a list" },
  )
  .min(1, "reads must not be empty")
  .max(
    MAX_READS_PER_REQUEST,
    `At most ${MAX_READS_PER_REQUEST} reads per request`,
  );

/** A client clock in the future would otherwise store a read that has not happened yet. */
function clampToNow(readAt: string | undefined, now: Date): Date {
  if (!readAt) return now;
  const claimed = new Date(readAt);
  return claimed.getTime() > now.getTime() ? now : claimed;
}

/**
 * Records that the learner has read these lessons. Idempotent, and safe to replay
 * from an offline queue: the first read wins. Every card id is acknowledged, including
 * ones that are not lessons the caller can read, so one stale entry can never make a
 * client retry a batch forever; only the lessons that were valid are counted.
 */
export async function recordLessonReads(userId: string, readsInput: unknown) {
  const reads = parse(readsSchema, readsInput);
  const now = new Date();
  const readable = await repo.getReadableLessonIds(
    userId,
    reads.map((read) => read.card_id),
  );
  const valid = reads
    .filter((read) => readable.has(read.card_id))
    .map((read) => ({
      cardId: read.card_id,
      readAt: clampToNow(read.read_at, now),
    }));
  await repo.insertCardReads(userId, valid);
  return {
    acked_card_ids: [...new Set(reads.map((read) => read.card_id))],
    recorded: new Set(valid.map((read) => read.cardId)).size,
  };
}
