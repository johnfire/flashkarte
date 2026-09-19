import fs from "fs";
import path from "path";
import { seededRandom } from "@flashkarte/shared";
import { importLesson } from "../lessons/lesson-import.service";
import * as lessons from "../lessons/lessons.service";
import { getOutline } from "../lessons/outline.service";
import { importSubject } from "../subjects/subjects-import.service";
import * as learn from "./learn-lessons.service";
import { getLearnerOutline } from "./learn-outline.service";
import {
  LEARNER,
  readToQuestions,
  resetCourse,
  rightPositionFromDatabase,
  startDatabase,
  stopDatabase,
} from "./test-support/learning-course";

/**
 * The pilot module, "Input side: text to vectors": four AI-drafted lessons for the owner to review.
 * This proves they import and lint clean, form the order the concept graph implies, and can be
 * learned through the learner path, and that nothing opens before its prerequisites are passed.
 */
const FIXTURES = path.join(__dirname, "..", "lessons", "fixtures");
const ORDER = [
  "transformers-tokens-lesson.json",
  "transformers-sequence-shapes-lesson.json",
  "transformers-embeddings-lesson.json",
  "transformers-subwords-bpe-lesson.json",
];
const readJson = (file: string) =>
  JSON.parse(fs.readFileSync(path.join(FIXTURES, file), "utf8"));

beforeAll(startDatabase);
afterAll(stopDatabase);

async function importModule(): Promise<string> {
  await resetCourse("unused");
  const graph = readJson(
    path.join("..", "..", "subjects", "fixtures", "transformers-subject.json"),
  );
  const real = await importSubject(LEARNER, {
    title: graph.title,
    concepts: graph.concepts.map((c: object) => ({ ...c, cards: [] })),
    edges: graph.edges,
  });
  for (const file of ORDER) {
    const result = await importLesson(
      LEARNER,
      real.subject.id,
      readJson(file),
      "ai",
    );
    expect({ file, issues: result.issues }).toEqual({ file, issues: [] });
  }
  return real.subject.id;
}

async function learnToPass(
  subjectId: string,
  slug: string,
  random: () => number,
) {
  let step = (await readToQuestions(subjectId, slug, random)) as never as {
    kind: string;
    presentation_id: string;
    options: { blocks: unknown }[];
  };
  for (let guard = 0; guard < 60; guard++) {
    if (step.kind === "remediation") {
      step = (await learn.continueLesson(LEARNER, subjectId, slug, random))
        .step as never;
      continue;
    }
    const reply = await learn.answerLesson(
      LEARNER,
      subjectId,
      slug,
      await rightPositionFromDatabase(step),
      random,
    );
    if (reply.passed) return reply;
    step = reply.step as never;
  }
  throw new Error(`${slug} did not finish`);
}

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
