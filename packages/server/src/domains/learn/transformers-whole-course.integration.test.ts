import fs from "fs";
import path from "path";
import { seededRandom } from "@flashkarte/shared";
import { getLearnerOutline } from "./learn-outline.service";
import {
  LEARNER,
  importTransformersLessons,
  learnToPass,
  startDatabase,
  stopDatabase,
} from "./test-support/learning-course";

/**
 * The whole Transformers course, every lesson we have authored. It sorts the lessons by their own
 * declared prerequisites, imports them all (each must import with no issues), and then learns the
 * course from the start: at each step the next lesson must be open, because its prerequisites have
 * been passed. It needs no hand-written expectations, so a new module is covered just by adding its
 * fixtures, and a prerequisite that names a missing lesson, or forms a cycle, fails here.
 */
const FIXTURES = path.join(__dirname, "..", "lessons", "fixtures");

interface Authored {
  file: string;
  slug: string;
  prerequisites: string[];
}

function readAuthored(): Authored[] {
  return fs
    .readdirSync(FIXTURES)
    .filter((name) => /^transformers-.+-lesson\.json$/.test(name))
    .sort()
    .map((file) => {
      const lesson = JSON.parse(
        fs.readFileSync(path.join(FIXTURES, file), "utf8"),
      ).lesson;
      return {
        file,
        slug: lesson.slug as string,
        prerequisites: (lesson.prerequisites ?? []).map(
          (p: { lesson: string }) => p.lesson,
        ),
      };
    });
}

/** Prerequisites first (a stable topological order), or the offending slugs. */
function inDependencyOrder(all: Authored[]): Authored[] {
  const bySlug = new Map(all.map((lesson) => [lesson.slug, lesson]));
  for (const lesson of all) {
    for (const prerequisite of lesson.prerequisites) {
      if (!bySlug.has(prerequisite)) {
        throw new Error(
          `${lesson.slug} requires "${prerequisite}", which is not authored`,
        );
      }
    }
  }
  const ordered: Authored[] = [];
  const done = new Set<string>();
  while (ordered.length < all.length) {
    const next = all.find(
      (lesson) =>
        !done.has(lesson.slug) &&
        lesson.prerequisites.every((prerequisite) => done.has(prerequisite)),
    );
    if (!next) {
      const stuck = all.filter((lesson) => !done.has(lesson.slug));
      throw new Error(
        `prerequisites form a cycle among: ${stuck.map((l) => l.slug).join(", ")}`,
      );
    }
    ordered.push(next);
    done.add(next.slug);
  }
  return ordered;
}

beforeAll(startDatabase);
afterAll(stopDatabase);

describe("The whole Transformers course", () => {
  it("has lessons, and every prerequisite names a lesson that exists", () => {
    const all = readAuthored();
    expect(all.length).toBeGreaterThanOrEqual(37);
    expect(new Set(all.map((lesson) => lesson.slug)).size).toBe(all.length);
    expect(() => inDependencyOrder(all)).not.toThrow();
  });

  it("imports clean and can be learned from start to finish, each lesson opening in turn", async () => {
    const order = inDependencyOrder(readAuthored());
    const subjectId = await importTransformersLessons(
      order.map((lesson) => lesson.file),
    );
    const random = seededRandom(31);
    const outline = async () =>
      (await getLearnerOutline(LEARNER, subjectId)).modules.flatMap(
        (m) => m.lessons,
      );

    for (const lesson of order) {
      const open = (await outline())
        .filter((l) => l.access === "available")
        .map((l) => l.slug);
      expect({ next: lesson.slug, open: open.includes(lesson.slug) }).toEqual({
        next: lesson.slug,
        open: true,
      });
      await learnToPass(subjectId, lesson.slug, random);
    }
    const finished = await outline();
    expect(finished).toHaveLength(order.length);
    expect(finished.every((l) => l.access === "passed")).toBe(true);
  }, 240_000);
});
