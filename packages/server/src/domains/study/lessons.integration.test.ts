import { STABLE_REPS } from "@flashkarte/shared";
import { closePool, getPool } from "../../db/client";
import { runMigrations } from "../../db/migrate";
import { ValidationError } from "../../utils/errors";
import * as accountRepo from "../account/account.repository";
import * as courses from "../courses/courses.service";
import * as decksRepo from "../decks/decks.repository";
import { importDeck, updateCard } from "../decks/decks.service";
import * as concepts from "../subjects/concepts.service";
import * as subjects from "../subjects/subjects.service";
import { recordLessonReads } from "./lesson-reads.service";
import * as study from "./study.service";

const USER_ID = "10000000-0000-4000-8000-0000000000d1";
const OTHER_USER_ID = "10000000-0000-4000-8000-0000000000d2";

const LESSON_DECK = `# Lessons
## Basics

@read
**1. What a dot product does**
It multiplies matching entries and adds them up.

- large and positive: same direction
- near zero: unrelated

**2. What is 2 + 2?**
Four.

@read
**3. Why softmax comes next**
It turns scores into probabilities.
`;

interface Fixture {
  deckId: string;
  lessonA: string;
  question: string;
  lessonB: string;
}

async function resetUsers(): Promise<void> {
  const pool = getPool();
  await pool.query("TRUNCATE TABLE users CASCADE");
  await pool.query(
    `INSERT INTO users (id, email, password_hash) VALUES
       ($1, 'lessons@example.com', 'x'), ($2, 'lessons-other@example.com', 'x')`,
    [USER_ID, OTHER_USER_ID],
  );
}

async function seedLessonDeck(markdown = LESSON_DECK): Promise<Fixture> {
  const deck = await importDeck(USER_ID, markdown, "lessons.md");
  const cards = await decksRepo.getCards(USER_ID, deck.id);
  return {
    deckId: deck.id,
    lessonA: cards[0].id,
    question: cards[1].id,
    lessonB: cards[2].id,
  };
}

const batchIds = async (deckId: string, includeLessons: boolean) =>
  (await study.getStudyBatch(USER_ID, deckId, 20, includeLessons)).map(
    (card) => card.id,
  );

beforeAll(async () => {
  if (!(process.env.POSTGRES_DB ?? "").endsWith("_test")) {
    throw new Error("Integration tests require POSTGRES_DB ending in _test");
  }
  await runMigrations();
});
beforeEach(resetUsers);
afterAll(async () => {
  await closePool();
});

describe("authoring reading cards", () => {
  it("stores a lesson as type read with its body exactly as written", async () => {
    const deck = await seedLessonDeck();
    const [lesson] = await decksRepo.getCards(USER_ID, deck.deckId);
    expect(lesson.type).toBe("read");
    expect(lesson.content).toEqual({
      front: "What a dot product does",
      back: [
        "It multiplies matching entries and adds them up.",
        "",
        "- large and positive: same direction",
        "- near zero: unrelated",
      ].join("\n"),
    });
  });

  it("refuses a lesson in a deck that also has branch cards", async () => {
    const mixed = `# Mixed\n[a]\n**1. Start**\n- go -> end\n\n@read\n**2. A lesson**\nText.\n`;
    await expect(importDeck(USER_ID, mixed)).rejects.toThrow(
      /can't mix branch cards with reading cards/,
    );
  });

  it("refuses a lesson with no body", async () => {
    await expect(
      importDeck(USER_ID, "# Empty\n@read\n**1. Nothing here**\n"),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("editing a lesson keeps its type and its line structure", async () => {
    const deck = await seedLessonDeck();
    await updateCard(USER_ID, deck.deckId, deck.lessonA, {
      back: "Line one\n\n- a\n- b",
    });
    const [lesson] = await decksRepo.getCards(USER_ID, deck.deckId);
    expect(lesson.type).toBe("read");
    expect(lesson.content.back).toBe("Line one\n\n- a\n- b");
  });

  it("refuses to give a lesson options", async () => {
    const deck = await seedLessonDeck();
    await expect(
      updateCard(USER_ID, deck.deckId, deck.lessonA, {
        options: [{ text: "x", goto: "correct" }],
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("the study queue", () => {
  it("never sends lessons to a client that did not ask for them", async () => {
    const deck = await seedLessonDeck();
    expect(await batchIds(deck.deckId, false)).toEqual([deck.question]);
  });

  it("sends unread lessons in deck order when a client asks, and each card carries its type", async () => {
    const deck = await seedLessonDeck();
    const batch = await study.getStudyBatch(USER_ID, deck.deckId, 20, true);
    expect(batch.map((card) => card.id)).toEqual([
      deck.lessonA,
      deck.question,
      deck.lessonB,
    ]);
    expect(batch.map((card) => card.type)).toEqual(["read", "basic", "read"]);
  });

  it("stops offering a lesson once it has been read, for that learner only", async () => {
    const deck = await seedLessonDeck();
    await recordLessonReads(USER_ID, [{ card_id: deck.lessonA }]);
    expect(await batchIds(deck.deckId, true)).toEqual([
      deck.question,
      deck.lessonB,
    ]);
    const otherLearner = (
      await study.getStudyBatch(OTHER_USER_ID, deck.deckId, 20, true)
    ).map((card) => card.id);
    expect(otherLearner).not.toContain(deck.lessonA);
  });

  it("leaves the practice round to real questions only", async () => {
    const deck = await seedLessonDeck();
    await recordLessonReads(USER_ID, [
      { card_id: deck.lessonA },
      { card_id: deck.lessonB },
    ]);
    await getPool().query(
      `INSERT INTO card_progress (user_id, card_id, due_at) VALUES ($1, $2, now() + interval '3 days')`,
      [USER_ID, deck.question],
    );
    expect(await batchIds(deck.deckId, true)).toEqual([deck.question]);
  });
});

describe("recording reads", () => {
  it("is idempotent, and the first read time wins", async () => {
    const deck = await seedLessonDeck();
    await recordLessonReads(USER_ID, [
      { card_id: deck.lessonA, read_at: "2026-01-01T10:00:00Z" },
    ]);
    const again = await recordLessonReads(USER_ID, [
      { card_id: deck.lessonA, read_at: "2026-02-02T10:00:00Z" },
    ]);
    expect(again.acked_card_ids).toEqual([deck.lessonA]);
    const { rows } = await getPool().query(
      "SELECT read_at FROM card_reads WHERE card_id = $1",
      [deck.lessonA],
    );
    expect(rows).toHaveLength(1);
    expect(new Date(rows[0].read_at).toISOString()).toBe(
      "2026-01-01T10:00:00.000Z",
    );
  });

  it("clamps a read time in the future to now", async () => {
    const deck = await seedLessonDeck();
    await recordLessonReads(USER_ID, [
      { card_id: deck.lessonA, read_at: "2999-01-01T00:00:00Z" },
    ]);
    const { rows } = await getPool().query(
      "SELECT read_at FROM card_reads WHERE card_id = $1",
      [deck.lessonA],
    );
    expect(new Date(rows[0].read_at).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("acknowledges but does not record a question, an unknown card, or someone else's lesson", async () => {
    const deck = await seedLessonDeck();
    const unknown = "30000000-0000-4000-8000-00000000ffff";
    const result = await recordLessonReads(OTHER_USER_ID, [
      { card_id: deck.question },
      { card_id: unknown },
      { card_id: deck.lessonA },
    ]);
    expect(result.recorded).toBe(0);
    expect(result.acked_card_ids).toHaveLength(3);
    const { rows } = await getPool().query("SELECT 1 FROM card_reads");
    expect(rows).toHaveLength(0);
  });

  it("rejects a malformed or empty batch", async () => {
    await expect(recordLessonReads(USER_ID, [])).rejects.toBeInstanceOf(
      ValidationError,
    );
    await expect(
      recordLessonReads(USER_ID, [{ card_id: "not-a-uuid" }]),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("never touches spaced-repetition state or the review ledger", async () => {
    const deck = await seedLessonDeck();
    await recordLessonReads(USER_ID, [{ card_id: deck.lessonA }]);
    const progress = await getPool().query("SELECT 1 FROM card_progress");
    const events = await getPool().query("SELECT 1 FROM review_events");
    expect(progress.rowCount).toBe(0);
    expect(events.rowCount).toBe(0);
  });
});

describe("counts and gating", () => {
  it("keeps lessons out of the review counts and reports them separately", async () => {
    const deck = await seedLessonDeck();
    const row = (await decksRepo.listDecksWithCounts(USER_ID)).find(
      (r) => r.id === deck.deckId,
    )!;
    expect(row).toMatchObject({
      card_count: "1",
      due_count: "1",
      new_count: "1",
      lesson_count: "2",
      unread_lesson_count: "2",
    });
    await recordLessonReads(USER_ID, [{ card_id: deck.lessonA }]);
    const after = (await decksRepo.listDecksWithCounts(USER_ID)).find(
      (r) => r.id === deck.deckId,
    )!;
    expect(after.unread_lesson_count).toBe("1");
    expect(after.due_count).toBe("1");
    const stats = await study.stats(USER_ID, deck.deckId);
    expect(stats.total).toBe(1);
  });

  it("lets a course unlock the next deck without the lessons being 'mastered'", async () => {
    const first = await seedLessonDeck();
    const second = await importDeck(USER_ID, "# Next\n**1. Q**\nA.\n");
    const course = await courses.createCourse(USER_ID, "C");
    await courses.addDeckToCourse(USER_ID, course.id, first.deckId);
    await courses.addDeckToCourse(USER_ID, course.id, second.id);
    await getPool().query(
      `INSERT INTO card_progress (user_id, card_id, repetitions) VALUES ($1, $2, $3)`,
      [USER_ID, first.question, STABLE_REPS],
    );
    const detail = await courses.getCourse(USER_ID, course.id);
    expect(detail.decks[0].mastered).toBe(true);
    expect(detail.decks[1].locked).toBe(false);
  });
});

describe("lessons in a subject", () => {
  it("offers a reading-only concept until read, then marks it done, without gating", async () => {
    const deck = await seedLessonDeck();
    const subject = await subjects.createSubject(USER_ID, "S");
    for (const [slug, kind] of [
      ["orient", "map"],
      ["dot", "idea"],
    ]) {
      await concepts.addConcept(USER_ID, subject.id, {
        slug,
        name: slug,
        kind,
      });
    }
    await concepts.setEdge(USER_ID, subject.id, {
      from: "orient",
      to: "dot",
      strength: "requires",
      reason: "orientation first",
    });
    await concepts.linkCards(USER_ID, subject.id, "orient", [deck.lessonA]);
    await concepts.linkCards(USER_ID, subject.id, "dot", [deck.question]);

    const before = await subjects.getSubjectProgress(USER_ID, subject.id);
    expect(before.frontier).toEqual(["orient", "dot"]);
    const orient = before.concepts.find((c) => c.slug === "orient")!;
    expect(orient).toMatchObject({
      needs_reading: true,
      lesson_count: 1,
      unread_lesson_count: 1,
      card_count: 0,
    });

    await recordLessonReads(USER_ID, [{ card_id: deck.lessonA }]);
    const after = await subjects.getSubjectProgress(USER_ID, subject.id);
    expect(after.concepts.find((c) => c.slug === "orient")?.state).toBe(
      "mastered",
    );
    expect(after.frontier).toEqual(["dot"]);
  });
});

describe("data export and deletion", () => {
  it("exports a learner's reads and removes them with the account", async () => {
    const deck = await seedLessonDeck();
    await recordLessonReads(USER_ID, [{ card_id: deck.lessonA }]);
    const exported = await accountRepo.findCardReads(USER_ID);
    expect(exported.map((r) => r.card_id)).toEqual([deck.lessonA]);
    expect(await accountRepo.findCardReads(OTHER_USER_ID)).toEqual([]);
    await getPool().query("DELETE FROM users WHERE id = $1", [USER_ID]);
    const left = await getPool().query("SELECT 1 FROM card_reads");
    expect(left.rowCount).toBe(0);
  });
});
