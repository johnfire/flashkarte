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
 * The fifth module, "Position: where tokens are in the sequence": three AI-drafted lessons for the
 * owner to review. They lean on the earlier modules, so those prerequisites are imported too. This
 * proves the module imports clean, forms the order the concept graph implies, and can be learned
 * through the learner path, with nothing opening before its prerequisites are passed.
 * (absolute-vs-rope is not here: the graph makes it require residual-connection, in the block module.)
 */
const PREREQUISITES = [
  "transformers-tokens-lesson.json",
  "transformers-sequence-shapes-lesson.json",
  "transformers-embeddings-lesson.json",
  "transformers-logits-softmax-lesson.json",
  "transformers-training-basics-lesson.json",
  "transformers-attention-gist-lesson.json",
  "transformers-qkv-projections-lesson.json",
  "transformers-scores-weights-lesson.json",
  "transformers-attention-output-lesson.json",
];
const POSITION = [
  "transformers-position-need-lesson.json",
  "transformers-absolute-positions-lesson.json",
  "transformers-rope-lesson.json",
];
const POSITION_SLUGS = ["position-need", "absolute-positions", "rope"];
const importModule = () =>
  importTransformersLessons([...PREREQUISITES, ...POSITION]);

beforeAll(startDatabase);
afterAll(stopDatabase);

describe("Transformers: Position (draft content)", () => {
  it("imports clean, finishes, and forms one module in prerequisite order", async () => {
    const subjectId = await importModule();
    for (const slug of POSITION_SLUGS) {
      expect(
        await lessons.finishLesson(LEARNER, subjectId, slug),
      ).toMatchObject({ stage: "finished" });
    }
    const outline = await getOutline(LEARNER, subjectId);
    const position = outline.modules.find(
      (m) => m.title === "Position: where tokens are in the sequence",
    );
    const order = position!.lessons.map((l) => l.slug);
    expect(order).toHaveLength(3);
    expect(order[0]).toBe("position-need");
    expect(order.slice(1).sort()).toEqual(["absolute-positions", "rope"]);
  });

  it("can be learned in order, each pass opening exactly the next lessons", async () => {
    const subjectId = await importModule();
    const random = seededRandom(23);
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
    await passing("embeddings");
    await passing("attention-gist");
    await passing("qkv-projections");
    await passing("logits-softmax");
    await passing("scores-weights");
    // position-need needs attention-output, which is the last prerequisite.
    expect(await passing("attention-output")).toEqual(["position-need"]);
    // Both position schemes need position-need, and also embeddings / scores-weights (already passed).
    expect(await passing("position-need")).toEqual([
      "absolute-positions",
      "rope",
    ]);
    await passing("absolute-positions");
    await passing("rope");
    expect(await open()).toEqual([]);
  });
});
