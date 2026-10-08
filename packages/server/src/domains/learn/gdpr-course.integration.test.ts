import fs from "fs";
import path from "path";
import { seededRandom } from "@flashkarte/shared";
import { importLesson } from "../lessons/lesson-import.service";
import { importSubject } from "../subjects/subjects-import.service";
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
  for (const planned of plannedLessons) {
    const slug = planned.id.toLowerCase();
    const result = await importLesson(
      LEARNER,
      subject.id,
      readJson(`lessons/en/${slug}.json`),
      "ai",
    );
    expect({ slug, issues: result.issues }).toEqual({ slug, issues: [] });
    expect(result.lesson.stage).toBe("testing");
  }
  return subject.id;
}

describe("English GDPR Basics release", () => {
  it("imports all 40 lessons cleanly and unlocks the complete learner path", async () => {
    expect(plannedLessons).toHaveLength(40);
    const subjectId = await importEnglishCourse();
    const random = seededRandom(2016);
    const outline = async () => getLearnerOutline(LEARNER, subjectId);
    const initial = await outline();
    expect(initial.modules).toHaveLength(6);
    expect(initial.modules.flatMap((module) => module.lessons)).toHaveLength(
      40,
    );

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
  }, 240_000);
});
