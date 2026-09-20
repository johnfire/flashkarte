import { seededRandom } from "@flashkarte/shared";
import * as lessons from "../lessons/lessons.service";
import { getOutline } from "../lessons/outline.service";
import { getLearnerOutline } from "./learn-outline.service";
import {
  LEARNER,
  importTransformersLessons,
  learnToPass,
  startDatabase,
  stopDatabase,
} from "./test-support/learning-course";

/**
 * The pilot module, "Input side: text to vectors": four AI-drafted lessons for the owner to review.
 * This proves they import and lint clean, form the order the concept graph implies, and can be
 * learned through the learner path, and that nothing opens before its prerequisites are passed.
 */
const ORDER = [
  "transformers-tokens-lesson.json",
  "transformers-sequence-shapes-lesson.json",
  "transformers-embeddings-lesson.json",
  "transformers-subwords-bpe-lesson.json",
];

beforeAll(startDatabase);
afterAll(stopDatabase);

const importModule = () => importTransformersLessons(ORDER);

describe("Transformers: Input side (draft content for the pilot)", () => {
  it("imports clean, finishes, and forms one module in prerequisite order", async () => {
    const subjectId = await importModule();
    for (const slug of [
      "tokens",
      "sequence-shapes",
      "embeddings",
      "subwords-bpe",
    ]) {
      expect(
        await lessons.finishLesson(LEARNER, subjectId, slug),
      ).toMatchObject({
        stage: "finished",
      });
    }
    const outline = await getOutline(LEARNER, subjectId);
    expect(outline.modules).toHaveLength(1);
    expect(outline.modules[0].title).toBe("Input side: text to vectors");
    const order = outline.modules[0].lessons.map((l) => l.slug);
    expect(order.indexOf("tokens")).toBe(0);
    expect(order.indexOf("embeddings")).toBeGreaterThan(
      order.indexOf("sequence-shapes"),
    );
    expect(order.indexOf("subwords-bpe")).toBeGreaterThan(
      order.indexOf("tokens"),
    );
    expect(order).toHaveLength(4);
  });

  it("can be learned in order, each pass opening exactly the next lessons", async () => {
    const subjectId = await importModule();
    const random = seededRandom(11);
    const open = async () =>
      [
        ...(await getLearnerOutline(LEARNER, subjectId)).modules
          .flatMap((m) => m.lessons)
          .filter((l) => l.access === "available")
          .map((l) => l.slug),
      ].sort();

    expect(await open()).toEqual(["tokens"]);
    const first = await learnToPass(subjectId, "tokens", random);
    expect(first.unlocked.map((u) => u.slug).sort()).toEqual([
      "sequence-shapes",
      "subwords-bpe",
    ]);
    expect(await open()).toEqual(["sequence-shapes", "subwords-bpe"]);

    const second = await learnToPass(subjectId, "sequence-shapes", random);
    expect(second.unlocked.map((u) => u.slug)).toEqual(["embeddings"]);
    await learnToPass(subjectId, "embeddings", random);
    await learnToPass(subjectId, "subwords-bpe", random);
    expect(await open()).toEqual([]);
    const outline = await getLearnerOutline(LEARNER, subjectId);
    expect(
      outline.modules
        .flatMap((m) => m.lessons)
        .every((l) => l.access === "passed"),
    ).toBe(true);
  });
});
