import fs from "fs";
import path from "path";
import { seededRandom } from "@flashkarte/shared";
import { importLesson } from "../lessons/lesson-import.service";
import { importSubject } from "../subjects/subjects-import.service";
import * as learn from "./learn-lessons.service";
import { getLearnerOutline } from "./learn-outline.service";
import {
  LEARNER,
  learnToPass,
  readToQuestions,
  rightPositionFromDatabase,
  resetCourse,
  startDatabase,
  stopDatabase,
} from "./test-support/learning-course";

const COURSE = path.resolve(
  __dirname,
  "../../../../../docs/courses/eu-ai-act/article-50",
);
const readJson = (filename: string) =>
  JSON.parse(fs.readFileSync(path.join(COURSE, filename), "utf8"));
const plannedLessons: { id: string }[] = readJson("curriculum.json").lessons;

beforeAll(startDatabase);
afterAll(stopDatabase);

async function importEnglishCourse(): Promise<string> {
  await resetCourse("Article 50 import test");
  const graph = readJson("subject-import.json");
  const { subject } = await importSubject(LEARNER, {
    ...graph,
    concepts: graph.concepts.map((concept: object) => ({
      ...concept,
      cards: [],
    })),
  });
  for (const planned of plannedLessons) {
    const slug = planned.id.toLowerCase();
    const importedLesson = await importLesson(
      LEARNER,
      subject.id,
      readJson(`lessons/en/${slug}.json`),
      "ai",
    );
    expect({ slug, issues: importedLesson.issues }).toEqual({
      slug,
      issues: [],
    });
    expect(importedLesson.lesson.stage).toBe("testing");
  }
  return subject.id;
}

async function verifyMissAndRetest(subjectId: string): Promise<void> {
  const random = seededRandom(50);
  const first = await readToQuestions(subjectId, "t01", random);
  if (first.kind !== "question") throw new Error("Expected first question");
  const correctPosition = await rightPositionFromDatabase(first);
  const missed = await learn.answerLesson(
    LEARNER,
    subjectId,
    "t01",
    (correctPosition + 1) % first.options.length,
    random,
  );
  expect(missed.answer.correct).toBe(false);
  expect(missed.step.kind).toBe("remediation");
  let next = missed.step;
  for (
    let attempts = 0;
    attempts < 10 && next.kind === "remediation";
    attempts++
  ) {
    next = (await learn.continueLesson(LEARNER, subjectId, "t01", random)).step;
  }
  expect(next.kind).toBe("question");
  if (next.kind !== "question") throw new Error("Expected reworded retest");
  expect(next.presentation_id).not.toBe(first.presentation_id);
  expect(next.prompt).not.toEqual(first.prompt);
}

describe("English Article 50 release", () => {
  it("imports all 18 lessons cleanly and unlocks the complete learner path", async () => {
    expect(plannedLessons).toHaveLength(18);
    const subjectId = await importEnglishCourse();
    const random = seededRandom(62);
    const outline = async () => getLearnerOutline(LEARNER, subjectId);
    const initial = await outline();
    expect(initial.modules).toHaveLength(3);
    expect(initial.modules.flatMap((module) => module.lessons)).toHaveLength(
      18,
    );

    expect(
      initial.modules
        .flatMap((module) => module.lessons)
        .find((lesson) => lesson.slug === "t18")?.access,
    ).toBe("locked");

    for (const planned of plannedLessons) {
      const slug = planned.id.toLowerCase();
      const next = (await outline()).modules
        .flatMap((module) => module.lessons)
        .find((lesson) => lesson.slug === slug);
      expect({ slug, access: next?.access }).toEqual({
        slug,
        access: "available",
      });
      if (slug === "t01") await verifyMissAndRetest(subjectId);
      await learnToPass(subjectId, slug, random);
    }
    const final = (await outline()).modules.flatMap((module) => module.lessons);
    expect(final.every((lesson) => lesson.access === "passed")).toBe(true);
  }, 240_000);
});
