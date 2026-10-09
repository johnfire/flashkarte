import fs from "fs";
import path from "path";
import { seededRandom } from "@flashkarte/shared";
import { importLesson } from "../lessons/lesson-import.service";
import { importSubject } from "../subjects/subjects-import.service";
import {
  createCourseFamily,
  createLocalizedEdition,
} from "../subjects/subjects.service";
import { getLearnerOutline } from "./learn-outline.service";
import {
  LEARNER,
  learnToPass,
  resetCourse,
  startDatabase,
  stopDatabase,
} from "./test-support/learning-course";

const COURSE = path.resolve(__dirname, "../../../../../docs/courses/gdpr");
const readJson = (filename: string) =>
  JSON.parse(fs.readFileSync(path.join(COURSE, filename), "utf8"));
const plannedLessons: { id: string }[] = readJson("curriculum.json").lessons;

beforeAll(startDatabase);
afterAll(stopDatabase);

async function importLessons(subjectId: string, locale: "en" | "de") {
  for (const planned of plannedLessons) {
    const slug = planned.id.toLowerCase();
    const result = await importLesson(
      LEARNER,
      subjectId,
      readJson(`lessons/${locale}/${slug}.json`),
      "ai",
    );
    expect({ slug, issues: result.issues }).toEqual({ slug, issues: [] });
    expect(result.lesson.stage).toBe("testing");
  }
}

async function importEnglishCourse(): Promise<string> {
  await resetCourse("GDPR import test");
  const graph = readJson("subject-import.json");
  const { subject } = await importSubject(LEARNER, {
    ...graph,
    concepts: graph.concepts.map((concept: object) => ({
      ...concept,
      cards: [],
    })),
  });
  await importLessons(subject.id, "en");
  return subject.id;
}

async function learnWholeCourse(subjectId: string, seed: number) {
  const random = seededRandom(seed);
  const outline = async () => getLearnerOutline(LEARNER, subjectId);
  const initial = await outline();
  expect(initial.modules).toHaveLength(6);
  expect(initial.modules.flatMap((module) => module.lessons)).toHaveLength(40);

  for (const planned of plannedLessons) {
    const slug = planned.id.toLowerCase();
    const next = (await outline()).modules
      .flatMap((module) => module.lessons)
      .find((lesson) => lesson.slug === slug);
    expect({ slug, access: next?.access }).toEqual({
      slug,
      access: "available",
    });
    await learnToPass(subjectId, slug, random);
  }
  const final = (await outline()).modules.flatMap((module) => module.lessons);
  expect(final.every((lesson) => lesson.access === "passed")).toBe(true);
}

describe("English GDPR Basics release", () => {
  it("imports all 40 lessons cleanly and unlocks the complete learner path", async () => {
    expect(plannedLessons).toHaveLength(40);
    const subjectId = await importEnglishCourse();
    await learnWholeCourse(subjectId, 2016);
  }, 240_000);
});

describe("German GDPR Basics edition", () => {
  it("creates the de edition from the English graph and teaches all 40 German lessons", async () => {
    const canonicalId = await importEnglishCourse();
    await createCourseFamily(LEARNER, canonicalId, "en");
    const { edition, concept_count } = await createLocalizedEdition(
      LEARNER,
      canonicalId,
      readJson("edition-de.json"),
    );
    expect(edition.locale).toBe("de");
    expect(concept_count).toBe(readJson("subject-import.json").concepts.length);
    await importLessons(edition.id, "de");
    await learnWholeCourse(edition.id, 2018);
  }, 360_000);
});
