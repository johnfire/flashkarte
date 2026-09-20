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
 * The second module, "Output side: from scores to text": four AI-drafted lessons for the owner to
 * review, built on the input-side pilot. This proves they import and lint clean, form the order the
 * concept graph implies, and can be learned through the learner path, and that nothing opens before
 * its prerequisites are passed.
 */
const INPUT_SIDE = [
  "transformers-tokens-lesson.json",
  "transformers-sequence-shapes-lesson.json",
];
const OUTPUT_SIDE = [
  "transformers-logits-softmax-lesson.json",
  "transformers-next-token-sampling-lesson.json",
  "transformers-generation-loop-lesson.json",
  "transformers-temperature-decoding-lesson.json",
];
const OUTPUT_SLUGS = [
  "logits-softmax",
  "next-token-sampling",
  "generation-loop",
  "temperature-decoding",
];
const importModule = () =>
  importTransformersLessons([...INPUT_SIDE, ...OUTPUT_SIDE]);

beforeAll(startDatabase);
afterAll(stopDatabase);

describe("Transformers: Output side (draft content)", () => {
  it("imports clean, finishes, and forms one module in prerequisite order", async () => {
    const subjectId = await importModule();
    for (const slug of OUTPUT_SLUGS) {
      expect(
        await lessons.finishLesson(LEARNER, subjectId, slug),
      ).toMatchObject({ stage: "finished" });
    }
    const outline = await getOutline(LEARNER, subjectId);
    const output = outline.modules.find(
      (m) => m.title === "Output side: from scores to text",
    );
    const order = output!.lessons.map((l) => l.slug);
    expect(order).toHaveLength(4);
    expect(order[0]).toBe("logits-softmax");
    expect(order[1]).toBe("next-token-sampling");
    expect(order.slice(2).sort()).toEqual([
      "generation-loop",
      "temperature-decoding",
    ]);
  });

  it("can be learned in order, each pass opening exactly the next lessons", async () => {
    const subjectId = await importModule();
    const random = seededRandom(13);
    const open = async () =>
      (await getLearnerOutline(LEARNER, subjectId)).modules
        .flatMap((m) => m.lessons)
        .filter((l) => l.access === "available")
        .map((l) => l.slug)
        .sort();

    expect(await open()).toEqual(["tokens"]);
    const first = await learnToPass(subjectId, "tokens", random);
    expect(first.unlocked.map((u) => u.slug).sort()).toEqual([
      "logits-softmax",
      "sequence-shapes",
    ]);

    const softmax = await learnToPass(subjectId, "logits-softmax", random);
    expect(softmax.unlocked.map((u) => u.slug)).toEqual([
      "next-token-sampling",
    ]);
    // generation-loop also needs sequence-shapes, so it is still shut here.
    const sampling = await learnToPass(
      subjectId,
      "next-token-sampling",
      random,
    );
    expect(sampling.unlocked.map((u) => u.slug)).toEqual([
      "temperature-decoding",
    ]);
    const shapes = await learnToPass(subjectId, "sequence-shapes", random);
    expect(shapes.unlocked.map((u) => u.slug)).toEqual(["generation-loop"]);

    await learnToPass(subjectId, "temperature-decoding", random);
    await learnToPass(subjectId, "generation-loop", random);
    expect(await open()).toEqual([]);
  });
});
