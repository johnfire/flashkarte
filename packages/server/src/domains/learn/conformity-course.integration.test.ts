import fs from "fs";
import path from "path";
import { seededRandom } from "@flashkarte/shared";
import { importLesson } from "../lessons/lesson-import.service";
import { importSubject } from "../subjects/subjects-import.service";
import * as learn from "./learn-lessons.service";
import { getLearnerOutline } from "./learn-outline.service";
import * as subjects from "../subjects/subjects.service";
import { getPool } from "../../db/client";
import {
  LEARNER,
  STRANGER,
  learnToPass,
  readToQuestions,
  rightPositionFromDatabase,
  resetCourse,
  startDatabase,
  stopDatabase,
} from "./test-support/learning-course";

const COURSE = path.resolve(
  __dirname,
  "../../../../../docs/courses/eu-ai-act/conformity-market-access",
);
const readJson = (filename: string) =>
  JSON.parse(fs.readFileSync(path.join(COURSE, filename), "utf8"));
const plannedLessons: { id: string }[] = readJson("curriculum.json").lessons;

beforeAll(startDatabase);
afterAll(stopDatabase);

async function importEnglishCourse(): Promise<string> {
  await resetCourse("Conformity course import test");
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
  const first = await readToQuestions(subjectId, "f01", random);
  if (first.kind !== "question") throw new Error("Expected first question");
  const correctPosition = await rightPositionFromDatabase(first);
  const missed = await learn.answerLesson(
    LEARNER,
    subjectId,
    "f01",
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
    next = (await learn.continueLesson(LEARNER, subjectId, "f01", random)).step;
  }
  expect(next.kind).toBe("question");
  if (next.kind !== "question") throw new Error("Expected reworded retest");
  expect(next.presentation_id).not.toBe(first.presentation_id);
  expect(next.prompt).not.toEqual(first.prompt);
}

async function verifyCompletePath(subjectId: string): Promise<void> {
  const random = seededRandom(63);
  const outline = async () => getLearnerOutline(LEARNER, subjectId);
  for (const planned of plannedLessons) {
    const slug = planned.id.toLowerCase();
    const next = (await outline()).modules
      .flatMap((module) => module.lessons)
      .find((lesson) => lesson.slug === slug);
    expect({ slug, access: next?.access }).toEqual({
      slug,
      access: "available",
    });
    if (slug === "f01") await verifyMissAndRetest(subjectId);
    await learnToPass(subjectId, slug, random);
  }
  const final = (await outline()).modules.flatMap((module) => module.lessons);
  expect(final.every((lesson) => lesson.access === "passed")).toBe(true);
}

async function verifyCommunitySharing(subjectId: string): Promise<void> {
  expect(
    (await subjects.listCatalogSubjects(false, "en")).some(
      (s) => s.id === subjectId,
    ),
  ).toBe(false);
  await expect(
    subjects.enrollInPublicSubject(STRANGER, subjectId),
  ).rejects.toThrow();
  const published = await subjects.updateSubject(LEARNER, subjectId, {
    isPublic: true,
  });
  expect(published.is_public).toBe(true);
  expect(published.is_official).toBe(false);
  expect(
    (await subjects.listCatalogSubjects(false, "en")).some(
      (s) => s.id === subjectId,
    ),
  ).toBe(true);
  await subjects.enrollInPublicSubject(STRANGER, subjectId);
  const newcomer = await getLearnerOutline(STRANGER, subjectId);
  const lessons = newcomer.modules.flatMap((module) => module.lessons);
  expect(lessons).toHaveLength(30);
  expect(lessons.find((lesson) => lesson.slug === "f01")?.access).toBe(
    "available",
  );
  expect(lessons.find((lesson) => lesson.slug === "f30")?.access).toBe(
    "locked",
  );
  expect(lessons.some((lesson) => lesson.access === "passed")).toBe(false);
  const stages = await getPool().query(
    "SELECT DISTINCT stage FROM lessons WHERE subject_id = $1",
    [subjectId],
  );
  expect(stages.rows).toEqual([{ stage: "testing" }]);
}

describe("English conformity course release", () => {
  it("imports all 30 lessons cleanly and unlocks the complete learner path", async () => {
    expect(plannedLessons).toHaveLength(30);
    const subjectId = await importEnglishCourse();
    const initial = await getLearnerOutline(LEARNER, subjectId);
    expect(initial.modules).toHaveLength(5);
    const initialLessons = initial.modules.flatMap((module) => module.lessons);
    expect(initialLessons).toHaveLength(30);
    expect(initialLessons.find((lesson) => lesson.slug === "f30")?.access).toBe(
      "locked",
    );
    await verifyCompletePath(subjectId);
    await verifyCommunitySharing(subjectId);
  }, 240_000);
});
