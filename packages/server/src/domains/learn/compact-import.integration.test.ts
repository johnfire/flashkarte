import { getLesson } from "../lessons/lessons.service";
import {
  LEARNER,
  importTransformersLessons,
  startDatabase,
  stopDatabase,
} from "./test-support/learning-course";

/**
 * Sending a lesson in its compact form (strings with **bold**, *italic* and `code`, `text`
 * shorthand, a bare-string paragraph) must store exactly what the full form stores. This imports
 * the same real lessons both ways against a real database and compares what was saved.
 */
const FILES = [
  "transformers-tokens-lesson.json",
  "transformers-sequence-shapes-lesson.json",
  "transformers-embeddings-lesson.json",
  "transformers-logits-softmax-lesson.json",
  "transformers-attention-gist-lesson.json",
];
const SLUGS = [
  "tokens",
  "sequence-shapes",
  "embeddings",
  "logits-softmax",
  "attention-gist",
];

beforeAll(startDatabase);
afterAll(stopDatabase);

/** Each import draws its own formula pictures, so their asset ids differ by design: compare all else. */
const withoutAssetIds = (value: unknown): unknown =>
  JSON.parse(JSON.stringify(value), (key, inner) =>
    key === "assetId" ? "<asset>" : inner,
  );

async function whatWasStored(subjectId: string, slug: string) {
  const lesson = await getLesson(LEARNER, subjectId, slug);
  return withoutAssetIds({
    screens: lesson.screens.map(({ blocks, sources, author_kind }) => ({
      blocks,
      sources,
      author_kind,
    })),
    questions: lesson.questions.map((question) => ({
      prompt: question.prompt,
      options: question.options,
      covers: question.covers,
      variants: question.variants.map(({ prompt, options }) => ({
        prompt,
        options,
      })),
    })),
  });
}

describe("importing in the compact form", () => {
  it("stores exactly what the full form stores", async () => {
    const full = await importTransformersLessons(FILES);
    const fromFull = await Promise.all(
      SLUGS.map((slug) => whatWasStored(full, slug)),
    );

    const compact = await importTransformersLessons(FILES, { compact: true });
    const fromCompact = await Promise.all(
      SLUGS.map((slug) => whatWasStored(compact, slug)),
    );

    expect(fromCompact).toEqual(fromFull);
    // And it really stored the spans a client expects, not markup.
    const [first] = (fromCompact[0] as { screens: { blocks: unknown }[] })
      .screens[0].blocks as {
      type: string;
      spans: { text: string }[];
    }[];
    expect(first.type).toBe("paragraph");
    expect(JSON.stringify(first)).not.toMatch(/\*\*/);
  });
});
