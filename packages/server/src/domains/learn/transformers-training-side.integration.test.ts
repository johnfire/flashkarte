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
 * The third module, "Training: how the numbers are learned": six AI-drafted lessons for the owner
 * to review. Its lessons lean on the input and output sides, so those prerequisites are imported
 * too. This proves the module imports clean, forms the order the concept graph implies, and can be
 * learned through the learner path, with nothing opening before its prerequisites are passed.
 */
const PREREQUISITES = [
  "transformers-tokens-lesson.json",
  "transformers-sequence-shapes-lesson.json",
  "transformers-embeddings-lesson.json",
  "transformers-logits-softmax-lesson.json",
  "transformers-next-token-sampling-lesson.json",
  "transformers-generation-loop-lesson.json",
];
const TRAINING = [
  "transformers-training-basics-lesson.json",
  "transformers-gradient-descent-lesson.json",
  "transformers-next-token-loss-lesson.json",
  "transformers-teacher-forcing-lesson.json",
  "transformers-pretrain-posttrain-lesson.json",
  "transformers-tokenizer-fixed-lesson.json",
];
const TRAINING_SLUGS = [
  "training-basics",
  "gradient-descent",
  "next-token-loss",
  "teacher-forcing",
  "pretrain-posttrain",
  "tokenizer-fixed",
];
const importModule = () =>
  importTransformersLessons([...PREREQUISITES, ...TRAINING]);

beforeAll(startDatabase);
afterAll(stopDatabase);

describe("Transformers: Training (draft content)", () => {
  it("imports clean, finishes, and forms one module in prerequisite order", async () => {
    const subjectId = await importModule();
    for (const slug of TRAINING_SLUGS) {
      expect(
        await lessons.finishLesson(LEARNER, subjectId, slug),
      ).toMatchObject({ stage: "finished" });
    }
    const outline = await getOutline(LEARNER, subjectId);
    const training = outline.modules.find(
      (m) => m.title === "Training: how the numbers are learned",
    );
    const order = training!.lessons.map((l) => l.slug);
    expect(order).toHaveLength(6);
    const after = (later: string, earlier: string) =>
      expect(order.indexOf(later)).toBeGreaterThan(order.indexOf(earlier));
    after("gradient-descent", "training-basics");
    after("next-token-loss", "training-basics");
    after("teacher-forcing", "next-token-loss");
    after("pretrain-posttrain", "next-token-loss");
    after("tokenizer-fixed", "gradient-descent");
  });

  it("can be learned in order, each pass opening exactly the next lessons", async () => {
    const subjectId = await importModule();
    const random = seededRandom(17);
    const open = async () =>
      (await getLearnerOutline(LEARNER, subjectId)).modules
        .flatMap((m) => m.lessons)
        .filter((l) => l.access === "available")
        .map((l) => l.slug)
        .sort();
    const passing = async (slug: string) =>
      (await learnToPass(subjectId, slug, random)).unlocked
        .map((u) => u.slug)
        .sort();

    expect(await open()).toEqual(["tokens", "training-basics"]);
    expect(await passing("training-basics")).toEqual(["gradient-descent"]);
    expect(await passing("gradient-descent")).toEqual([]);
    expect(await passing("tokens")).toEqual([
      "logits-softmax",
      "sequence-shapes",
    ]);
    expect(await passing("sequence-shapes")).toEqual(["embeddings"]);
    // tokenizer-fixed needs tokens, embeddings and gradient-descent, all now passed.
    expect(await passing("embeddings")).toEqual(["tokenizer-fixed"]);
    expect(await passing("logits-softmax")).toEqual(["next-token-sampling"]);
    expect(await passing("next-token-sampling")).toEqual([
      "generation-loop",
      "next-token-loss",
    ]);
    // teacher-forcing also needs generation-loop, so only pretrain-posttrain opens here.
    expect(await passing("next-token-loss")).toEqual(["pretrain-posttrain"]);
    expect(await passing("generation-loop")).toEqual(["teacher-forcing"]);

    await learnToPass(subjectId, "teacher-forcing", random);
    await learnToPass(subjectId, "pretrain-posttrain", random);
    await learnToPass(subjectId, "tokenizer-fixed", random);
    expect(await open()).toEqual([]);
  });
});
