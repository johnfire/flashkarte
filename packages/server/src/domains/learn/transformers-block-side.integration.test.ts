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
 * The sixth module, "The transformer block": seven AI-drafted lessons, plus absolute-vs-rope, which
 * joins the Position module because the graph makes it require the residual stream. They lean on
 * the earlier modules, so those prerequisites are imported too. This proves everything imports
 * clean, forms the order the concept graph implies, and can be learned through the learner path,
 * with nothing opening before its prerequisites are passed.
 */
const PREREQUISITES = [
  "training-basics",
  "gradient-descent",
  "tokens",
  "sequence-shapes",
  "embeddings",
  "logits-softmax",
  "attention-gist",
  "qkv-projections",
  "scores-weights",
  "attention-output",
  "multi-head",
  "position-need",
  "absolute-positions",
  "rope",
];
const BLOCK = [
  "layers-hidden-states",
  "residual-stream",
  "layernorm",
  "feed-forward",
  "preln-block",
  "stack-and-size",
  "pre-vs-post-ln",
];
const file = (slug: string) => `transformers-${slug}-lesson.json`;
const importModule = () =>
  importTransformersLessons(
    [...PREREQUISITES, ...BLOCK, "absolute-vs-rope"].map(file),
  );

beforeAll(startDatabase);
afterAll(stopDatabase);

describe("Transformers: The block (draft content)", () => {
  it("imports clean, finishes, and forms the modules in prerequisite order", async () => {
    const subjectId = await importModule();
    for (const slug of [...BLOCK, "absolute-vs-rope"]) {
      expect(
        await lessons.finishLesson(LEARNER, subjectId, slug),
      ).toMatchObject({ stage: "finished" });
    }
    const outline = await getOutline(LEARNER, subjectId);
    const block = outline.modules.find(
      (m) => m.title === "The transformer block",
    );
    const order = block!.lessons.map((l) => l.slug);
    expect(order).toHaveLength(7);
    const after = (later: string, earlier: string) =>
      expect(order.indexOf(later)).toBeGreaterThan(order.indexOf(earlier));
    after("residual-stream", "layers-hidden-states");
    after("layernorm", "layers-hidden-states");
    after("feed-forward", "layers-hidden-states");
    after("preln-block", "residual-stream");
    after("preln-block", "layernorm");
    after("preln-block", "feed-forward");
    after("stack-and-size", "preln-block");
    after("pre-vs-post-ln", "preln-block");
    // absolute-vs-rope was added to the Position module.
    const position = outline.modules.find((m) =>
      m.title?.startsWith("Position:"),
    );
    expect(position!.lessons.map((l) => l.slug)).toContain("absolute-vs-rope");
  });

  it("can be learned in order, each pass opening exactly the next lessons", async () => {
    const subjectId = await importModule();
    const random = seededRandom(29);
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

    for (const slug of PREREQUISITES) await passing(slug);
    // Only layers-hidden-states has all its prerequisites (embeddings, training-basics) passed.
    expect(await open()).toEqual(["layers-hidden-states"]);
    expect(await passing("layers-hidden-states")).toEqual([
      "feed-forward",
      "layernorm",
      "residual-stream",
    ]);
    // absolute-vs-rope needs the residual stream as well as both position lessons.
    expect(await passing("residual-stream")).toEqual(["absolute-vs-rope"]);
    expect(await passing("layernorm")).toEqual([]);
    // preln-block needs the residual stream, layernorm, feed-forward and multi-head.
    expect(await passing("feed-forward")).toEqual(["preln-block"]);
    expect(await passing("preln-block")).toEqual([
      "pre-vs-post-ln",
      "stack-and-size",
    ]);
    await passing("stack-and-size");
    await passing("pre-vs-post-ln");
    await passing("absolute-vs-rope");
    expect(await open()).toEqual([]);
  });
});
