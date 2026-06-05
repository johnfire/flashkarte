jest.mock("./study.repository");
import * as repo from "./study.repository";
import { sync } from "./study.service";

const mockRepo = repo as jest.Mocked<typeof repo>;
beforeEach(() => {
  jest.clearAllMocks();
  mockRepo.cardBelongsToUser.mockResolvedValue({ id: "c1" } as never);
  mockRepo.getProgressRow.mockResolvedValue(null as never);
  mockRepo.insertReviewEvent.mockResolvedValue(true);
  mockRepo.upsertProgressAt.mockResolvedValue(undefined as never);
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
});
