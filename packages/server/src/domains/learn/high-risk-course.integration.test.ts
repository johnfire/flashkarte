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
  "../../../../../docs/courses/eu-ai-act/high-risk-compliance",
);
const readJson = (filename: string) =>
  JSON.parse(fs.readFileSync(path.join(COURSE, filename), "utf8"));
const plannedLessons: { id: string }[] = readJson("curriculum.json").lessons;

beforeAll(startDatabase);
afterAll(stopDatabase);

async function importEnglishCourse(): Promise<string> {
  await resetCourse("High-risk compliance import test");
  const graph = readJson("subject-import.json");
  const { subject } = await importSubject(LEARNER, {
    ...graph,
    concepts: graph.concepts.map((concept: object) => ({
      ...concept,
      cards: [],
    })),
  });
  expect(subject.is_public).toBe(false);
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
  const first = await readToQuestions(subjectId, "h01", random);
  if (first.kind !== "question") throw new Error("Expected first question");
  const correctPosition = await rightPositionFromDatabase(first);
  const missed = await learn.answerLesson(
    LEARNER,
    subjectId,
    "h01",
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
    next = (await learn.continueLesson(LEARNER, subjectId, "h01", random)).step;
  }
  expect(next.kind).toBe("question");
  if (next.kind !== "question") throw new Error("Expected reworded retest");
  expect(next.presentation_id).not.toBe(first.presentation_id);
  expect(next.prompt).not.toEqual(first.prompt);
}

async function verifyCoreAndOptionalPath(subjectId: string): Promise<void> {
  const random = seededRandom(63);
  const outline = async () => getLearnerOutline(LEARNER, subjectId);
  const coreFirst = [
    ...plannedLessons.filter((lesson) => lesson.id !== "H29"),
    ...plannedLessons.filter((lesson) => lesson.id === "H29"),
  ];
  for (const planned of coreFirst) {
    const slug = planned.id.toLowerCase();
    const next = (await outline()).modules
      .flatMap((module) => module.lessons)
      .find((lesson) => lesson.slug === slug);
    expect({ slug, access: next?.access }).toEqual({
      slug,
      access: "available",
    });
    if (slug === "h30") {
      const optional = (await outline()).modules
        .flatMap((module) => module.lessons)
        .find((lesson) => lesson.slug === "h29");
      expect(optional?.access).toBe("available");
    }
    if (slug === "h01") await verifyMissAndRetest(subjectId);
    await learnToPass(subjectId, slug, random);
  }
  const final = (await outline()).modules.flatMap((module) => module.lessons);
  expect(final.every((lesson) => lesson.access === "passed")).toBe(true);
}

describe("English high-risk compliance release", () => {
  it("imports all 30 lessons cleanly and unlocks the complete learner path", async () => {
    expect(plannedLessons).toHaveLength(30);
    const subjectId = await importEnglishCourse();
    const initial = await getLearnerOutline(LEARNER, subjectId);
    expect(initial.modules).toHaveLength(5);
    const initialLessons = initial.modules.flatMap((module) => module.lessons);
    expect(initialLessons).toHaveLength(30);
    expect(initialLessons.find((lesson) => lesson.slug === "h30")?.access).toBe(
      "locked",
    );
    await verifyCoreAndOptionalPath(subjectId);
  }, 240_000);
});
