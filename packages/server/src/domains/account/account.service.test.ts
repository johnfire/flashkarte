jest.mock("./account.repository");

import * as repo from "./account.repository";
import { exportData } from "./account.service";
import { NotFoundError } from "../../utils/errors";

const mock = repo as jest.Mocked<typeof repo>;

const profileRow: repo.ProfileRow = {
  email: "ada@example.com",
  display_name: "Ada",
  role: "user",
  account_type: "free",
  language: "en",
  speech_enabled: true,
  speech_lang: "en-GB",
  speech_autoplay: "back",
  speech_rate: 0.9,
  email_verified_at: "2026-01-02T00:00:00Z",
  created_at: "2026-01-01T00:00:00Z",
};

beforeEach(() => {
  jest.clearAllMocks();
  mock.findProfile.mockResolvedValue(profileRow);
  mock.findDecks.mockResolvedValue([]);
  mock.findCards.mockResolvedValue([]);
  mock.findProgress.mockResolvedValue([]);
  mock.findReviewEvents.mockResolvedValue([]);
  mock.findApiKeyMeta.mockResolvedValue([]);
  mock.findSubjects.mockResolvedValue([]);
  mock.findConcepts.mockResolvedValue([]);
  mock.findConceptEdges.mockResolvedValue([]);
  mock.findCardReads.mockResolvedValue([]);
  mock.findLessonModules.mockResolvedValue([]);
  mock.findLessons.mockResolvedValue([]);
  mock.findScreens.mockResolvedValue([]);
  mock.findLessonQuestions.mockResolvedValue([]);
  mock.findLessonProgress.mockResolvedValue([]);
  mock.findQuestionAttempts.mockResolvedValue([]);
  mock.findQuestionReviews.mockResolvedValue([]);
  mock.findScreenComments.mockResolvedValue([]);
  mock.findAssets.mockResolvedValue([]);
});

describe("account.service exportData", () => {
  it("exports the subject's stored images with their SVG", async () => {
    mock.findAssets.mockResolvedValue([
      {
        id: "a1",
        subject_id: "s1",
        kind: "diagram",
        description: "A box",
        author_kind: "ai",
        content: "<svg/>",
        latex: null,
        created_at: "t",
      },
    ]);
    const { lessonContent } = await exportData("u1");
    expect(lessonContent.assets).toEqual([
      {
        id: "a1",
        subjectId: "s1",
        kind: "diagram",
        description: "A box",
        authorKind: "ai",
        svg: "<svg/>",
        latex: null,
        createdAt: "t",
      },
    ]);
  });

  it("exports what the learner did: progress, every answer, and the review schedule", async () => {
    mock.findLessonProgress.mockResolvedValue([
      {
        subject_id: "s1",
        lesson_slug: "tokens",
        status: "passed",
        session: { phase: "passed" },
        started_at: "a",
        updated_at: "b",
        passed_at: "c",
      },
    ]);
    mock.findQuestionAttempts.mockResolvedValue([
      {
        question_id: "q1",
        presentation_id: "q1v",
        chosen_option: 2,
        correct: false,
        phase: "lesson",
        misses: 1,
        attempted_at: "t",
      },
    ]);
    mock.findQuestionReviews.mockResolvedValue([
      {
        question_id: "q1",
        easiness: 2.5,
        interval_days: 2,
        repetitions: 1,
        last_rating: 4,
        due_at: "d",
        last_reviewed_at: null,
      },
    ]);
    mock.findScreenComments.mockResolvedValue([
      {
        subject_id: "s1",
        number: "2.010",
        body: "Unclear",
        created_at: "t",
        resolved_at: null,
        resolved_by: null,
      },
    ]);
    const { lessonLearning } = await exportData("u1");
    expect(lessonLearning.comments).toEqual([
      expect.objectContaining({
        screen: "2.010",
        body: "Unclear",
        resolvedAt: null,
      }),
    ]);
    expect(lessonLearning.progress[0]).toMatchObject({
      lesson: "tokens",
      status: "passed",
      passedAt: "c",
    });
    expect(lessonLearning.answers[0]).toMatchObject({
      questionId: "q1",
      chosenOption: 2,
      correct: false,
      answeredAt: "t",
    });
    expect(lessonLearning.reviews[0]).toMatchObject({
      questionId: "q1",
      intervalDays: 2,
      lastRating: 4,
    });
  });

  it("exports lesson content: modules, lessons, screens with their revisions, and questions", async () => {
    mock.findLessonModules.mockResolvedValue([
      { id: "m1", subject_id: "s1", title: "Input side", position: 0 },
    ]);
    mock.findLessons.mockResolvedValue([
      {
        subject_id: "s1",
        module_id: "m1",
        slug: "tokens",
        title: "Tokens",
        summary: "s",
        stage: "finished",
        position: 0,
        covers: ["token"],
        prerequisites: [{ from: "intro", reason: "r" }],
      },
    ]);
    mock.findScreens.mockResolvedValue([
      {
        subject_id: "s1",
        lesson_slug: "tokens",
        number: "213.010",
        blocks: [{ type: "paragraph" }],
        author_kind: "ai",
        sources: null,
        retired_at: "2026-09-19T00:00:00Z",
        revisions: [{ change: "edited", changed_at: "t", blocks: [] }],
      },
    ]);
    mock.findLessonQuestions.mockResolvedValue([
      {
        subject_id: "s1",
        lesson_slug: "tokens",
        id: "q1",
        parent_id: null,
        prompt: [],
        options: [],
        retired_at: null,
        teaches: ["213.010"],
        covers: ["token"],
      },
    ]);
    const { lessonContent } = await exportData("u1");
    expect(lessonContent.modules).toEqual([
      { id: "m1", subjectId: "s1", title: "Input side", position: 0 },
    ]);
    expect(lessonContent.lessons[0]).toMatchObject({
      slug: "tokens",
      stage: "finished",
      covers: ["token"],
      prerequisites: [{ from: "intro", reason: "r" }],
    });
    expect(lessonContent.screens[0]).toMatchObject({
      number: "213.010",
      authorKind: "ai",
      retired: true,
      revisions: [{ change: "edited", changedAt: "t", blocks: [] }],
    });
    expect(lessonContent.questions[0]).toMatchObject({
      id: "q1",
      variantOf: null,
      teaches: ["213.010"],
      covers: ["token"],
      retired: false,
    });
  });

  it("exports which lessons the learner has read", async () => {
    mock.findCardReads.mockResolvedValue([
      { card_id: "lesson1", read_at: "2026-09-19T10:00:00Z" },
    ]);
    const result = await exportData("u1");
    expect(result.cardReads).toEqual([
      { cardId: "lesson1", readAt: "2026-09-19T10:00:00Z" },
    ]);
  });

  it("exports each subject with its concepts, card links and edges", async () => {
    mock.findSubjects.mockResolvedValue([
      {
        id: "s1",
        title: "Transformers",
        description: null,
        is_public: false,
        version: 4,
        created_at: "c",
        updated_at: "u",
      },
    ]);
    mock.findConcepts.mockResolvedValue([
      {
        subject_id: "s1",
        slug: "kv-cache",
        name: "KV cache",
        kind: "idea",
        tier: "core",
        position: 0,
        card_ids: ["card1"],
      },
      {
        subject_id: "other-subject",
        slug: "unrelated",
        name: "Unrelated",
        kind: "idea",
        tier: "core",
        position: 0,
        card_ids: [],
      },
    ]);
    mock.findConceptEdges.mockResolvedValue([
      {
        subject_id: "s1",
        from_slug: "causal-mask",
        to_slug: "kv-cache",
        strength: "requires",
        reason: "cache is valid because of the mask",
      },
    ]);

    const result = await exportData("u1");

    expect(result.subjects).toHaveLength(1);
    expect(result.subjects[0].concepts).toEqual([
      {
        slug: "kv-cache",
        name: "KV cache",
        kind: "idea",
        tier: "core",
        position: 0,
        cardIds: ["card1"],
      },
    ]);
    expect(result.subjects[0].edges).toEqual([
      {
        from: "causal-mask",
        to: "kv-cache",
        strength: "requires",
        reason: "cache is valid because of the mask",
      },
    ]);
  });

  it("throws NotFoundError for an unknown user", async () => {
    mock.findProfile.mockResolvedValue(null);
    await expect(exportData("ghost")).rejects.toThrow(NotFoundError);
  });

  it("exports the speech settings of the profile and each deck", async () => {
    mock.findDecks.mockResolvedValue([
      {
        id: "d1",
        title: "Spanish",
        source_filename: "es.md",
        is_public: false,
        is_ordered: false,
        speech_enabled: true,
        speech_front_lang: "es-ES",
        speech_back_lang: "en-GB",
        speech_autoplay: "both",
        speech_rate: 0.8,
        created_at: "c",
        updated_at: "u",
      },
    ]);

    const result = await exportData("u1");

    expect(result.profile.speech).toEqual({
      enabled: true,
      lang: "en-GB",
      autoplay: "back",
      rate: 0.9,
    });
    expect(result.decks[0].speech).toEqual({
      enabled: true,
      frontLang: "es-ES",
      backLang: "en-GB",
      autoplay: "both",
      rate: 0.8,
    });
  });

  it("assembles profile, decks with nested cards, progress, and events", async () => {
    mock.findDecks.mockResolvedValue([
      {
        id: "d1",
        title: "Spanish",
        source_filename: "es.md",
        is_public: false,
        is_ordered: false,
        speech_enabled: true,
        speech_front_lang: "es-ES",
        speech_back_lang: "en-GB",
        speech_autoplay: "both",
        speech_rate: 0.8,
        created_at: "c",
        updated_at: "u",
      },
    ]);
    mock.findCards.mockResolvedValue([
      {
        id: "c1",
        deck_id: "d1",
        type: "basic",
        content: { front: "hola", back: "hello" },
        category: null,
        position: 0,
        created_at: "c",
        updated_at: "u",
      },
    ]);
    mock.findProgress.mockResolvedValue([
      {
        card_id: "c1",
        repetitions: 3,
        ease_factor: 2.5,
        interval_days: 4,
        due_at: "due",
        last_reviewed_at: "lr",
        last_rating: 5,
      },
    ]);
    mock.findReviewEvents.mockResolvedValue([
      {
        event_id: "e1",
        card_id: "c1",
        rating: 5,
        reviewed_at: "ra",
        option_index: null,
        created_at: "c",
      },
    ]);

    const out = await exportData("u1");
    expect(out.profile.email).toBe("ada@example.com");
    expect(out.decks).toHaveLength(1);
    expect(out.decks[0].cards[0].content).toEqual({
      front: "hola",
      back: "hello",
    });
    expect(out.cardProgress[0].cardId).toBe("c1");
    expect(out.reviewEvents[0].eventId).toBe("e1");
    expect(typeof out.exportedAt).toBe("string");
  });

  it("includes API key metadata but can never leak a secret", async () => {
    mock.findApiKeyMeta.mockResolvedValue([
      {
        name: "MCP",
        key_prefix: "fk_abcd1234",
        scope: "deck",
        created_at: "c",
      },
    ]);
    const out = await exportData("u1");
    expect(out.apiKeys).toEqual([
      {
        name: "MCP",
        keyPrefix: "fk_abcd1234",
        scope: "deck",
        createdAt: "c",
      },
    ]);
    // Defense in depth: nothing shaped like a key hash or raw key anywhere.
    const serialized = JSON.stringify(out);
    expect(serialized).not.toMatch(/key_hash|keyHash/);
  });

  it("never exports the password hash", async () => {
    const out = await exportData("u1");
    expect(JSON.stringify(out)).not.toMatch(/password/i);
  });
});
