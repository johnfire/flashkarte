jest.mock("./study.repository");
jest.mock("../audit/audit.service", () => ({ recordRequired: jest.fn() }));
import * as repo from "./study.repository";
import { recordRequired } from "../audit/audit.service";
import { sync, getStudyBatch } from "./study.service";

const mockRepo = repo as jest.Mocked<typeof repo>;
const mockRecordRequired = recordRequired as jest.MockedFunction<
  typeof recordRequired
>;
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
  mockRecordRequired.mockResolvedValue();
});

describe("sync", () => {
  test("applies same-card events in reviewed_at order regardless of input order", async () => {
    const res = await sync("u1", [
      {
        event_id: "e2",
        card_id: "c1",
        rating: 5,
        reviewed_at: "2026-06-05T10:00:00.000Z",
      },
      {
        event_id: "e1",
        card_id: "c1",
        rating: 4,
        reviewed_at: "2026-06-05T09:00:00.000Z",
      },
    ]);
    // The two ratings must differ for this test to mean anything: fixed
    // cadences make a Good-then-Good pair land on the same interval whichever
    // order it is applied in. e1 (Good) -> 2 days, then e2 (Easy, entering from
    // Good) -> 4 days. Applied in the wrong order the card would end on Good's
    // 2 days instead.
    const p = res.progress.find((x) => x.card_id === "c1");
    expect(p!.interval).toBe(4);
    expect(p!.repetitions).toBe(2);
    expect(res.acked_event_ids).toEqual(expect.arrayContaining(["e1", "e2"]));
    expect(mockRepo.upsertProgressAt).toHaveBeenCalledTimes(1);
    expect(mockRecordRequired).toHaveBeenCalledWith(
      expect.objectContaining({ action: "study.synced", targetId: "c1" }),
      mockClient,
    );
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
    await expect(sync("u1", { nope: true } as never)).rejects.toThrow(
      "events must be an array",
    );
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
    await expect(sync("u1", huge)).rejects.toThrow(
      "too many events (max 1000)",
    );
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

describe("getStudyBatch — chained senses (Spec 10)", () => {
  const senseCard = (
    id: string,
    index: number,
    repetitions: number,
    word = "der-zug",
    count = 3,
  ) => ({
    id,
    content: {
      front: "der Zug",
      back: `gloss-${index}`,
      sense: { context: null, hint: null, word, index, count },
    },
    category: null,
    position: index,
    repetitions,
  });

  const plain = (id: string) => ({
    id,
    content: { front: id, back: "b" },
    category: null,
  });

  test("a chained word brings all its senses, ordered by senseIndex", async () => {
    // Only sense 1 is due, but the word has not graduated, so all three come.
    mockRepo.getDueAndNewCards.mockResolvedValue([
      senseCard("s1", 1, 0) as never,
    ]);
    mockRepo.getSenseCardsForWords.mockResolvedValue([
      senseCard("s2", 2, 0),
      senseCard("s0", 0, 1),
      senseCard("s1", 1, 0),
    ] as never);

    const batch = await getStudyBatch("u1", "d1");
    expect(batch.map((c) => c.id)).toEqual(["s0", "s1", "s2"]);
  });

  test("a graduated word brings only the sense that is actually due", async () => {
    mockRepo.getDueAndNewCards.mockResolvedValue([
      senseCard("s1", 1, 5) as never,
    ]);
    mockRepo.getSenseCardsForWords.mockResolvedValue([
      senseCard("s0", 0, 4),
      senseCard("s1", 1, 5),
      senseCard("s2", 2, 3),
    ] as never);

    const batch = await getStudyBatch("u1", "d1");
    expect(batch.map((c) => c.id)).toEqual(["s1"]);
  });

  test("a lapse on one sense re-chains the whole word", async () => {
    mockRepo.getDueAndNewCards.mockResolvedValue([
      senseCard("s0", 0, 0) as never,
    ]);
    mockRepo.getSenseCardsForWords.mockResolvedValue([
      senseCard("s0", 0, 0), // just failed
      senseCard("s1", 1, 9),
      senseCard("s2", 2, 9),
    ] as never);

    const batch = await getStudyBatch("u1", "d1");
    expect(batch.map((c) => c.id)).toEqual(["s0", "s1", "s2"]);
  });

  test("a word is expanded once even when several of its senses are due", async () => {
    mockRepo.getDueAndNewCards.mockResolvedValue([
      senseCard("s0", 0, 0) as never,
      senseCard("s1", 1, 0) as never,
    ]);
    mockRepo.getSenseCardsForWords.mockResolvedValue([
      senseCard("s0", 0, 0),
      senseCard("s1", 1, 0),
    ] as never);

    const batch = await getStudyBatch("u1", "d1");
    expect(batch.map((c) => c.id)).toEqual(["s0", "s1"]);
  });

  test("decks without sense cards never hit the second query", async () => {
    mockRepo.getDueAndNewCards.mockResolvedValue([
      plain("c1") as never,
      plain("c2") as never,
    ]);

    const batch = await getStudyBatch("u1", "d1");
    expect(batch.map((c) => c.id)).toEqual(["c1", "c2"]);
    expect(mockRepo.getSenseCardsForWords).not.toHaveBeenCalled();
  });

  test("ordinary cards keep their place around an expanded word", async () => {
    mockRepo.getDueAndNewCards.mockResolvedValue([
      plain("before") as never,
      senseCard("s1", 1, 0) as never,
      plain("after") as never,
    ]);
    mockRepo.getSenseCardsForWords.mockResolvedValue([
      senseCard("s0", 0, 0),
      senseCard("s1", 1, 0),
    ] as never);

    const batch = await getStudyBatch("u1", "d1");
    expect(batch.map((c) => c.id)).toEqual(["before", "s0", "s1", "after"]);
  });
});
