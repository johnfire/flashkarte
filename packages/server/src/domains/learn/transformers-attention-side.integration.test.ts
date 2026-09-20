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
 * The fourth module, "Attention: how tokens exchange information": seven AI-drafted lessons for the
 * owner to review. They lean on the earlier modules, so those prerequisites are imported too. This
 * proves the module imports clean, forms the order the concept graph implies, and can be learned
 * through the learner path, with nothing opening before its prerequisites are passed.
 */
const PREREQUISITES = [
  "transformers-tokens-lesson.json",
  "transformers-sequence-shapes-lesson.json",
  "transformers-embeddings-lesson.json",
  "transformers-logits-softmax-lesson.json",
  "transformers-next-token-sampling-lesson.json",
  "transformers-generation-loop-lesson.json",
  "transformers-training-basics-lesson.json",
  "transformers-next-token-loss-lesson.json",
  "transformers-teacher-forcing-lesson.json",
];
const ATTENTION = [
  "transformers-attention-gist-lesson.json",
  "transformers-qkv-projections-lesson.json",
  "transformers-scores-weights-lesson.json",
  "transformers-scaling-and-cost-lesson.json",
  "transformers-attention-output-lesson.json",
  "transformers-causal-mask-lesson.json",
  "transformers-multi-head-lesson.json",
];
const ATTENTION_SLUGS = [
  "attention-gist",
  "qkv-projections",
  "scores-weights",
  "scaling-and-cost",
  "attention-output",
  "causal-mask",
  "multi-head",
];
const importModule = () =>
  importTransformersLessons([...PREREQUISITES, ...ATTENTION]);

beforeAll(startDatabase);
afterAll(stopDatabase);

describe("Transformers: Attention (draft content)", () => {
  it("imports clean, finishes, and forms one module in prerequisite order", async () => {
    const subjectId = await importModule();
    for (const slug of ATTENTION_SLUGS) {
      expect(
        await lessons.finishLesson(LEARNER, subjectId, slug),
      ).toMatchObject({ stage: "finished" });
    }
    const outline = await getOutline(LEARNER, subjectId);
    const attention = outline.modules.find(
      (m) => m.title === "Attention: how tokens exchange information",
    );
    const order = attention!.lessons.map((l) => l.slug);
    expect(order).toHaveLength(7);
    const after = (later: string, earlier: string) =>
      expect(order.indexOf(later)).toBeGreaterThan(order.indexOf(earlier));
    after("qkv-projections", "attention-gist");
    after("scores-weights", "qkv-projections");
    after("scaling-and-cost", "scores-weights");
    after("attention-output", "scores-weights");
    after("causal-mask", "scores-weights");
    after("multi-head", "attention-output");
  });

  it("can be learned in order, each pass opening exactly the next lessons", async () => {
    const subjectId = await importModule();
    const random = seededRandom(19);
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
    await passing("training-basics");
    await passing("tokens");
    await passing("sequence-shapes");
    expect(await passing("embeddings")).toEqual(["attention-gist"]);
    // qkv-projections needs attention-gist, sequence-shapes and training-basics: all passed now.
    expect(await passing("attention-gist")).toEqual(["qkv-projections"]);
    // scores-weights needs qkv-projections and logits-softmax.
    expect(await passing("qkv-projections")).toEqual([]);
    expect(await passing("logits-softmax")).toEqual([
      "next-token-sampling",
      "scores-weights",
    ]);
    expect(await passing("scores-weights")).toEqual([
      "attention-output",
      "scaling-and-cost",
    ]);
    expect(await passing("attention-output")).toEqual(["multi-head"]);
    await passing("scaling-and-cost");
    await passing("multi-head");
    expect(await passing("next-token-sampling")).toEqual([
      "generation-loop",
      "next-token-loss",
    ]);
    await passing("next-token-loss");
    expect(await passing("generation-loop")).toEqual(["teacher-forcing"]);
    // causal-mask needs teacher-forcing as well as scores-weights, so it opens last.
    expect(await passing("teacher-forcing")).toEqual(["causal-mask"]);
    await passing("causal-mask");
    expect(await open()).toEqual([]);
  });
});
