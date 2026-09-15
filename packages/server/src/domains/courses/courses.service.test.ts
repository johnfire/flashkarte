jest.mock("./courses.repository");
jest.mock("../decks/decks.repository");
jest.mock("../decks/branching", () => ({ validateBranching: jest.fn() }));
jest.mock("../audit/audit.service", () => ({ recordRequired: jest.fn() }));
import * as repo from "./courses.repository";
import type { CourseDeckRow } from "./courses.repository";
import * as decksRepo from "../decks/decks.repository";
import {
  computeGating,
  createCourse,
  listCourses,
  getCourse,
  updateCourse,
  deleteCourse,
  addDeckToCourse,
  removeDeckFromCourse,
  reorderCourseDecks,
  listPublicCourses,
  getPublicCoursePreview,
  cloneCourse,
} from "./courses.service";

const mockRepo = repo as jest.Mocked<typeof repo>;
const mockDecksRepo = decksRepo as jest.Mocked<typeof decksRepo>;

const courseRow = {
  id: "c1",
  user_id: "u1",
  title: "My Course",
  description: null,
  is_public: false,
  created_at: "x",
  updated_at: "x",
};

const deckRow = (over: Partial<CourseDeckRow>): CourseDeckRow => ({
  deck_id: "d1",
  position: 0,
  title: "Deck",
  card_count: 2,
  mastered_count: 2,
  ...over,
});

beforeEach(() => jest.clearAllMocks());

describe("computeGating", () => {
  test("deck 0 is always unlocked", () => {
    const [first] = computeGating([
      deckRow({ card_count: 0, mastered_count: 0 }),
    ]);
    expect(first.locked).toBe(false);
  });

  test("an empty deck is vacuously mastered", () => {
    const [only] = computeGating([
      deckRow({ card_count: 0, mastered_count: 0 }),
    ]);
    expect(only.mastered).toBe(true);
  });

  test("a deck stays unlocked even when it isn't itself mastered, as long as the previous deck was", () => {
    const [, second] = computeGating([
      deckRow({ deck_id: "d1", position: 0, card_count: 2, mastered_count: 2 }),
      deckRow({ deck_id: "d2", position: 1, card_count: 2, mastered_count: 1 }),
    ]);
    expect(second.locked).toBe(false);
    expect(second.mastered).toBe(false);
  });

  test("an unmastered deck locks the one after it", () => {
    const [, , third] = computeGating([
      deckRow({ deck_id: "d1", position: 0, card_count: 2, mastered_count: 2 }),
      deckRow({ deck_id: "d2", position: 1, card_count: 2, mastered_count: 1 }),
      deckRow({ deck_id: "d3", position: 2, card_count: 0, mastered_count: 0 }),
    ]);
    expect(third.locked).toBe(true);
  });

  test("all decks stable, all unlocked", () => {
    const decks = computeGating([
      deckRow({ deck_id: "d1", position: 0 }),
      deckRow({ deck_id: "d2", position: 1 }),
    ]);
    expect(decks.every((d) => !d.locked)).toBe(true);
  });
});

describe("createCourse", () => {
  test("creates with a trimmed title and null description", async () => {
    mockRepo.createCourse.mockResolvedValue(courseRow as never);
    const course = await createCourse("u1", "  My Course  ");
    expect(mockRepo.createCourse).toHaveBeenCalledWith("u1", "My Course", null);
    expect(course.id).toBe("c1");
  });

  test("rejects an empty title", async () => {
    await expect(createCourse("u1", "   ")).rejects.toThrow(
      "Title is required",
    );
  });
});

describe("listCourses", () => {
  test("summarizes decks_total and decks_mastered per course", async () => {
    mockRepo.listCourses.mockResolvedValue([courseRow] as never);
    mockRepo.getCourseDecks.mockResolvedValue([
      deckRow({ deck_id: "d1", position: 0, card_count: 2, mastered_count: 2 }),
      deckRow({ deck_id: "d2", position: 1, card_count: 2, mastered_count: 1 }),
    ]);

    const [summary] = await listCourses("u1");
    expect(summary.decks_total).toBe(2);
    expect(summary.decks_mastered).toBe(1);
  });
});

describe("getCourse", () => {
  test("throws NotFoundError when the course doesn't exist or isn't visible", async () => {
    mockRepo.getCourse.mockResolvedValue(null);
    await expect(getCourse("u1", "nope")).rejects.toThrow("Course not found");
  });

  test("returns the course with gated decks", async () => {
    mockRepo.getCourse.mockResolvedValue(courseRow as never);
    mockRepo.getCourseDecks.mockResolvedValue([deckRow({})]);
    const result = await getCourse("u1", "c1");
    expect(result.decks).toHaveLength(1);
    expect(result.decks[0].locked).toBe(false);
  });
});

describe("updateCourse", () => {
  test("merges only the given fields onto the current row", async () => {
    mockRepo.getOwnedCourse.mockResolvedValue(courseRow as never);
    mockRepo.updateCourseRow.mockResolvedValue({
      ...courseRow,
      is_public: true,
    } as never);

    await updateCourse("u1", "c1", { isPublic: true });

    expect(mockRepo.updateCourseRow).toHaveBeenCalledWith("c1", {
      title: "My Course",
      description: null,
      is_public: true,
    });
  });

  test("rejects editing a course you don't own", async () => {
    mockRepo.getOwnedCourse.mockResolvedValue(null);
    await expect(
      updateCourse("u1", "someone-elses", { title: "x" }),
    ).rejects.toThrow("Course not found");
  });
});

describe("deleteCourse", () => {
  test("rejects deleting a course you don't own", async () => {
    mockRepo.getOwnedCourse.mockResolvedValue(null);
    await expect(deleteCourse("u1", "c1")).rejects.toThrow("Course not found");
    expect(mockRepo.deleteCourse).not.toHaveBeenCalled();
  });

  test("deletes an owned course", async () => {
    mockRepo.getOwnedCourse.mockResolvedValue(courseRow as never);
    await deleteCourse("u1", "c1");
    expect(mockRepo.deleteCourse).toHaveBeenCalledWith("c1");
  });
});

describe("addDeckToCourse", () => {
  test("rejects a deck the caller doesn't own", async () => {
    mockRepo.getOwnedCourse.mockResolvedValue(courseRow as never);
    mockRepo.deckBelongsToUser.mockResolvedValue(null);
    await expect(addDeckToCourse("u1", "c1", "d1")).rejects.toThrow(
      "Deck not found",
    );
  });

  test("rejects adding a deck that's already a member", async () => {
    mockRepo.getOwnedCourse.mockResolvedValue(courseRow as never);
    mockRepo.deckBelongsToUser.mockResolvedValue({ id: "d1" } as never);
    mockRepo.isDeckInCourse.mockResolvedValue({ deck_id: "d1" } as never);
    await expect(addDeckToCourse("u1", "c1", "d1")).rejects.toThrow(
      "already in this course",
    );
  });

  test("adds a valid, unowned-yet deck", async () => {
    mockRepo.getOwnedCourse.mockResolvedValue(courseRow as never);
    mockRepo.deckBelongsToUser.mockResolvedValue({ id: "d1" } as never);
    mockRepo.isDeckInCourse.mockResolvedValue(null);
    const result = await addDeckToCourse("u1", "c1", "d1");
    expect(mockRepo.addDeckToCourse).toHaveBeenCalledWith("c1", "d1");
    expect(result).toEqual({ course_id: "c1", deck_id: "d1" });
  });
});

describe("removeDeckFromCourse", () => {
  test("rejects a course you don't own", async () => {
    mockRepo.getOwnedCourse.mockResolvedValue(null);
    await expect(removeDeckFromCourse("u1", "c1", "d1")).rejects.toThrow(
      "Course not found",
    );
  });
});

describe("reorderCourseDecks", () => {
  test("rejects a list that drops or adds a member", async () => {
    mockRepo.getOwnedCourse.mockResolvedValue(courseRow as never);
    mockRepo.getCourseDecks.mockResolvedValue([
      deckRow({ deck_id: "11111111-1111-4111-8111-111111111111" }),
      deckRow({ deck_id: "22222222-2222-4222-8222-222222222222" }),
    ]);
    await expect(
      reorderCourseDecks("u1", "c1", ["11111111-1111-4111-8111-111111111111"]),
    ).rejects.toThrow("no more and no fewer");
  });

  test("reorders when the list matches the existing member set exactly", async () => {
    const a = "11111111-1111-4111-8111-111111111111";
    const b = "22222222-2222-4222-8222-222222222222";
    mockRepo.getOwnedCourse.mockResolvedValue(courseRow as never);
    mockRepo.getCourseDecks.mockResolvedValue([
      deckRow({ deck_id: a }),
      deckRow({ deck_id: b }),
    ]);
    const result = await reorderCourseDecks("u1", "c1", [b, a]);
    expect(mockRepo.reorderCourseDecks).toHaveBeenCalledWith("c1", [b, a]);
    expect(result.order).toEqual([b, a]);
  });
});

const publicCourseRow = { ...courseRow, is_public: true };

describe("listPublicCourses", () => {
  test("defaults to limit 50, offset 0", async () => {
    mockRepo.listPublicCourses.mockResolvedValue([]);
    await listPublicCourses({});
    expect(mockRepo.listPublicCourses).toHaveBeenCalledWith(50, 0);
  });
});

describe("getPublicCoursePreview", () => {
  test("404s when the course doesn't exist", async () => {
    mockRepo.getCourse.mockResolvedValue(null);
    await expect(getPublicCoursePreview("u1", "c1")).rejects.toThrow(
      "Course not found",
    );
  });

  test("404s when the course exists but isn't public", async () => {
    mockRepo.getCourse.mockResolvedValue(courseRow as never);
    await expect(getPublicCoursePreview("u1", "c1")).rejects.toThrow(
      "Course not found",
    );
  });

  test("returns the course with its ordered decks", async () => {
    mockRepo.getCourse.mockResolvedValue(publicCourseRow as never);
    mockRepo.getPublicCourseDecks.mockResolvedValue([
      { deck_id: "d1", position: 0, title: "Deck 1", card_count: 5 },
    ]);
    const result = await getPublicCoursePreview("u1", "c1");
    expect(result.decks).toHaveLength(1);
  });
});

describe("cloneCourse", () => {
  beforeEach(() => {
    mockDecksRepo.rowToParsedCard.mockImplementation(
      (row) =>
        ({
          type: "basic",
          front: "f",
          back: "b",
          category: row.category,
          label: null,
          options: [],
          sense: null,
          senseConflict: false,
        }) as never,
    );
  });

  test("404s on a course that isn't public", async () => {
    mockRepo.getCourse.mockResolvedValue(courseRow as never);
    await expect(cloneCourse("u2", "c1")).rejects.toThrow("Course not found");
  });

  test("rejects cloning a course with no decks", async () => {
    mockRepo.getCourse.mockResolvedValue(publicCourseRow as never);
    mockRepo.getPublicCourseDecks.mockResolvedValue([]);
    await expect(cloneCourse("u2", "c1")).rejects.toThrow("no decks");
  });

  test("clones every member deck into the caller's account, in order", async () => {
    mockRepo.getCourse.mockResolvedValue(publicCourseRow as never);
    mockRepo.getPublicCourseDecks.mockResolvedValue([
      { deck_id: "d1", position: 0, title: "Unit 1", card_count: 2 },
      { deck_id: "d2", position: 1, title: "Unit 2", card_count: 1 },
    ]);
    mockRepo.getCardsForDeck.mockResolvedValue([
      { type: "basic", content: {}, category: null, position: 0 },
    ]);
    mockRepo.createCourse.mockResolvedValue({
      ...publicCourseRow,
      id: "new-c1",
      user_id: "u2",
    } as never);
    mockDecksRepo.createDeckWithCards
      .mockResolvedValueOnce({ id: "new-d1" } as never)
      .mockResolvedValueOnce({ id: "new-d2" } as never);

    const result = await cloneCourse("u2", "c1");

    expect(mockRepo.createCourse).toHaveBeenCalledWith(
      "u2",
      publicCourseRow.title,
      publicCourseRow.description,
    );
    expect(mockDecksRepo.createDeckWithCards).toHaveBeenNthCalledWith(
      1,
      "u2",
      "Unit 1",
      null,
      expect.any(Array),
    );
    expect(mockDecksRepo.createDeckWithCards).toHaveBeenNthCalledWith(
      2,
      "u2",
      "Unit 2",
      null,
      expect.any(Array),
    );
    expect(mockRepo.addDeckToCourse).toHaveBeenNthCalledWith(
      1,
      "new-c1",
      "new-d1",
    );
    expect(mockRepo.addDeckToCourse).toHaveBeenNthCalledWith(
      2,
      "new-c1",
      "new-d2",
    );
    expect(result.decks_cloned).toBe(2);
    expect(result.course.id).toBe("new-c1");
  });
});
