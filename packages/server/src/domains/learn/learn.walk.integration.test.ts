import fs from "fs";
import path from "path";
import { seededRandom } from "@flashkarte/shared";
import { getPool } from "../../db/client";
import { importLesson } from "../lessons/lesson-import.service";
import { importSubject } from "../subjects/subjects-import.service";
import { getLearnerOutline } from "./learn-outline.service";
import * as learn from "./learn-lessons.service";
import * as reviews from "./learn-reviews.service";
import {
  LEARNER,
  authorLesson,
  playToEnd,
  positionOf,
  readToQuestions,
  resetCourse,
  rightPositionFromDatabase,
  startDatabase,
  stopDatabase,
} from "./test-support/learning-course";

/**
 * A learner is driven through a whole subject, with wrong answers along the way, to prove the
 * rules hold together: nothing opens before its prerequisites are passed, what a pass reports as
 * unlocked is exactly what became open, no learner is ever stuck, and reviews come due later.
 */
const DAY = 24 * 60 * 60 * 1000;
// a -> b, a -> c, b + c -> d (a diamond), e alone, d + e -> f (a join).
const GRAPH: Record<string, string[]> = {
  a: [],
  b: ["a"],
  c: ["a"],
  d: ["b", "c"],
  e: [],
  f: ["d", "e"],
};

beforeAll(startDatabase);
afterAll(stopDatabase);

async function accessBySlug(subjectId: string) {
  const outline = await getLearnerOutline(LEARNER, subjectId);
  return new Map(
    outline.modules.flatMap((m) => m.lessons).map((l) => [l.slug, l.access]),
  );
}

describe("a learner walks a whole subject", () => {
  let subjectId: string;
  beforeEach(async () => {
    subjectId = await resetCourse("Walk");
    for (const [slug, requires] of Object.entries(GRAPH)) {
      await authorLesson(subjectId, slug, {
        requires,
        screens: 4,
        questions: 3,
      });
    }
  });

  it.each([1, 2, 3, 4, 5])(
    "passes every lesson in an order the rules allow, never early and never stuck (seed %i)",
    async (seed) => {
      const random = seededRandom(seed);
      const passed = new Set<string>();

      for (let round = 0; round < 20 && passed.size < 6; round++) {
        const before = await accessBySlug(subjectId);
        const open = [...before]
          .filter(([, a]) => a === "available")
          .map(([s]) => s);

        // Nothing is open unless everything it needs is passed, and nothing is skipped over.
        for (const [slug, needs] of Object.entries(GRAPH)) {
          const shouldBeOpen =
            !passed.has(slug) && needs.every((n) => passed.has(n));
          expect(open.includes(slug)).toBe(shouldBeOpen);
          if (before.get(slug) === "locked") {
            await expect(
              learn.startLesson(LEARNER, subjectId, slug, random),
            ).rejects.toThrow(/locked/);
          }
        }
        expect(open.length).toBeGreaterThan(0); // never stuck

        const slug = open[Math.floor(random() * open.length)];
        await learn.startLesson(LEARNER, subjectId, slug, random);
        const misses = new Map<number, number>([[0, Math.floor(random() * 3)]]);
        const results = await playToEnd(subjectId, slug, random, {
          missTimes: misses,
        });
        passed.add(slug);

        const after = await accessBySlug(subjectId);
        const nowOpen = new Set(
          [...after].filter(([, a]) => a === "available").map(([s]) => s),
        );
        const newlyOpen = [...nowOpen].filter((s) => !open.includes(s));
        const reported = results[results.length - 1].unlocked.map(
          (u) => u.slug,
        );
        expect([...reported].sort()).toEqual([...newlyOpen].sort());
        expect(after.get(slug)).toBe("passed");
      }
      expect(passed.size).toBe(6);
    },
  );

  it("brings every question back for review later, and a miss comes back sooner than a hit", async () => {
    const random = seededRandom(9);
    const start = new Date("2030-03-01T00:00:00Z");
    for (const slug of ["a", "b", "c", "d", "e", "f"]) {
      await learn.startLesson(LEARNER, subjectId, slug, random);
      await playToEnd(subjectId, slug, random, {
        now: start,
        missTimes: new Map([[0, slug === "a" ? 1 : 0]]),
      });
    }
    expect(
      (await reviews.listDueReviews(LEARNER, subjectId, start)).due,
    ).toHaveLength(0);

    const later = new Date(start.getTime() + 60 * DAY);
    const due = await reviews.listDueReviews(LEARNER, subjectId, later);
    expect(due.due).toHaveLength(18); // 6 lessons x 3 questions

    for (const { question_id } of due.due) {
      const begun = await reviews.startReview(
        LEARNER,
        subjectId,
        question_id,
        random,
        later,
      );
      if (begun.step.kind !== "question")
        throw new Error("expected a question");
      const done = await reviews.answerReview(
        LEARNER,
        subjectId,
        question_id,
        positionOf(begun.step, true),
        random,
        later,
      );
      expect(done.step.kind).toBe("review_done");
    }
    expect(
      (await reviews.listDueReviews(LEARNER, subjectId, later)).due,
    ).toHaveLength(0);
    const ledger = await getPool().query(
      `SELECT phase, count(*)::int AS n FROM question_attempts GROUP BY phase ORDER BY phase`,
    );
    const byPhase = Object.fromEntries(ledger.rows.map((r) => [r.phase, r.n]));
    expect(byPhase.review).toBe(18);
    expect(byPhase.lesson).toBeGreaterThanOrEqual(19); // 18 right, plus the deliberate miss
  });
});

describe("the real Transformers lesson (draft content) is learnable end to end", () => {
  it("can be read, missed, re-taught, passed, and then reviewed", async () => {
    const subjectFixtures = path.join(
      __dirname,
      "..",
      "subjects",
      "fixtures",
      "transformers-subject.json",
    );
    const graph = JSON.parse(fs.readFileSync(subjectFixtures, "utf8"));
    await resetCourse("unused");
    const real = await importSubject(LEARNER, {
      title: graph.title,
      concepts: graph.concepts.map((c: object) => ({ ...c, cards: [] })),
      edges: graph.edges,
    });
    await importLesson(
      LEARNER,
      real.subject.id,
      JSON.parse(
        fs.readFileSync(
          path.join(
            __dirname,
            "..",
            "lessons",
            "fixtures",
            "transformers-tokens-lesson.json",
          ),
          "utf8",
        ),
      ),
      "ai",
    );
    const random = seededRandom(3);
    let step = (await readToQuestions(
      real.subject.id,
      "tokens",
      random,
    )) as never as {
      kind: string;
      presentation_id: string;
      options: { blocks: unknown }[];
    };
    expect(step.kind).toBe("question");

    let missedOnce = false;
    let result;
    for (let guard = 0; guard < 60; guard++) {
      if (step.kind === "remediation") {
        step = (
          await learn.continueLesson(LEARNER, real.subject.id, "tokens", random)
        ).step as never;
        continue;
      }
      const right = await rightPositionFromDatabase(step);
      const choice = !missedOnce ? (right + 1) % step.options.length : right;
      missedOnce = true;
      result = await learn.answerLesson(
        LEARNER,
        real.subject.id,
        "tokens",
        choice,
        random,
      );
      step = result.step as never;
      if (result.passed) break;
    }
    expect(result?.passed).toBe(true);
    expect(result?.step).toMatchObject({ kind: "passed", total: 4 });
    const later = new Date(Date.now() + 90 * DAY);
    expect(
      (await reviews.listDueReviews(LEARNER, real.subject.id, later)).due,
    ).toHaveLength(4);
  });
});
