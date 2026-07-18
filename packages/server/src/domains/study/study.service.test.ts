jest.mock("./study.repository");
import * as repo from "./study.repository";
import { sync } from "./study.service";

const mockRepo = repo as jest.Mocked<typeof repo>;
const mockClient = {} as import("pg").PoolClient;
beforeEach(() => {
  jest.clearAllMocks();
  mockRepo.cardBelongsToUser.mockResolvedValue({ id: "c1" } as never);
  mockRepo.getOwnedCardIds.mockResolvedValue(new Set(["c1"]));
  mockRepo.getProgressRow.mockResolvedValue(null as never);
  mockRepo.insertReviewEvent.mockResolvedValue(true);
  mockRepo.upsertProgressAt.mockResolvedValue(undefined as never);
  mockRepo.withCardProgressLock.mockImplementation(
    async (_userId, _cardId, action) => action(mockClient),
  );
});

describe("sync", () => {
  test("applies same-card events in reviewed_at order regardless of input order", async () => {
    const res = await sync("u1", [
      {
        event_id: "e2",
        card_id: "c1",
        rating: 4,
        reviewed_at: "2026-06-05T10:00:00.000Z",
      },
      {
        event_id: "e1",
        card_id: "c1",
        rating: 4,
        reviewed_at: "2026-06-05T09:00:00.000Z",
      },
    ]);
    // e1 (new card, rating 4) -> interval 1, reps 1; then e2 -> interval 6, reps 2.
    const p = res.progress.find((x) => x.card_id === "c1");
    expect(p!.interval).toBe(6);
    expect(p!.repetitions).toBe(2);
    expect(res.acked_event_ids).toEqual(expect.arrayContaining(["e1", "e2"]));
    expect(mockRepo.upsertProgressAt).toHaveBeenCalledTimes(1);
  });

  test("duplicate event_id is acked but not re-applied", async () => {
    mockRepo.insertReviewEvent.mockResolvedValue(false); // already processed
    const res = await sync("u1", [
      {
        event_id: "dup",
        card_id: "c1",
        rating: 5,
        reviewed_at: "2026-06-05T09:00:00.000Z",
      },
    ]);
    expect(mockRepo.upsertProgressAt).not.toHaveBeenCalled();
    expect(res.acked_event_ids).toEqual(["dup"]);
    expect(res.progress).toEqual([]);
  });

  test("invalid event is acked-and-dropped, valid events in same batch still apply", async () => {
    const res = await sync("u1", [
      {
        event_id: "bad",
        card_id: "c1",
        rating: 9,
        reviewed_at: "2026-06-05T09:00:00.000Z",
      },
      {
        event_id: "ok",
        card_id: "c1",
        rating: 4,
        reviewed_at: "2026-06-05T09:30:00.000Z",
      },
    ]);
    expect(res.acked_event_ids).toEqual(expect.arrayContaining(["bad", "ok"]));
    expect(mockRepo.upsertProgressAt).toHaveBeenCalledTimes(1);
  });

  test("rejects non-array events", async () => {
    await expect(sync("u1", { nope: true } as never)).rejects.toThrow();
  });

  // DATA-001: an unbounded events array amplifies one request into hundreds of
  // thousands of serial DB round-trips. Cap it before processing.
  test("rejects an oversized events array", async () => {
    const huge = Array.from({ length: 1001 }, (_, i) => ({
      event_id: `e${i}`,
      card_id: "c1",
      rating: 4,
      reviewed_at: "2026-06-05T09:00:00.000Z",
    }));
    await expect(sync("u1", huge)).rejects.toThrow(/too many|max/i);
    expect(mockRepo.cardBelongsToUser).not.toHaveBeenCalled();
  });

  // Spec 01 — option_index on the ledger.
  test("records a diagnostic pick's option_index in the review event", async () => {
    await sync("u1", [
      {
        event_id: "e1",
        card_id: "c1",
        rating: 1,
        reviewed_at: "2026-06-05T09:00:00.000Z",
        option_index: 2,
      },
    ]);
    expect(mockRepo.insertReviewEvent).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({ event_id: "e1", option_index: 2 }),
      mockClient,
    );
  });

  test("accepts the old sync shape without option_index (old clients)", async () => {
    const res = await sync("u1", [
      {
        event_id: "e1",
        card_id: "c1",
        rating: 4,
        reviewed_at: "2026-06-05T09:00:00.000Z",
      },
    ]);
    expect(res.acked_event_ids).toEqual(["e1"]);
    expect(mockRepo.insertReviewEvent).toHaveBeenCalledTimes(1);
    // The event applied normally; option_index simply absent.
    const [, ev] = mockRepo.insertReviewEvent.mock.calls[0];
    expect((ev as { option_index?: number }).option_index).toBeUndefined();
  });

  test("checks ownership once for all distinct cards", async () => {
    mockRepo.getOwnedCardIds.mockResolvedValue(new Set(["c1", "c2"]));
    await sync("u1", [
      {
        event_id: "e1",
        card_id: "c1",
        rating: 4,
        reviewed_at: "2026-06-05T09:00:00.000Z",
      },
      {
        event_id: "e2",
        card_id: "c2",
        rating: 4,
        reviewed_at: "2026-06-05T09:00:00.000Z",
      },
    ]);

    expect(mockRepo.getOwnedCardIds).toHaveBeenCalledTimes(1);
    expect(mockRepo.getOwnedCardIds).toHaveBeenCalledWith("u1", ["c1", "c2"]);
    expect(mockRepo.cardBelongsToUser).not.toHaveBeenCalled();
  });
});
