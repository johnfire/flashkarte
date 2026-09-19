import { closePool, getPool } from "../../../db/client";
import { runMigrations } from "../../../db/migrate";
import * as concepts from "../../subjects/concepts.service";
import * as subjects from "../../subjects/subjects.service";
import * as lessons from "../../lessons/lessons.service";
import * as questions from "../../lessons/questions.service";
import * as screens from "../../lessons/screens.service";
import * as learn from "../learn-lessons.service";

export const LEARNER = "10000000-0000-4000-8000-0000000000f1";
export const STRANGER = "10000000-0000-4000-8000-0000000000f2";

const para = (text: string) => [{ type: "paragraph", spans: [{ text }] }];
const option = (correct: boolean) => ({
  correct,
  blocks: para(correct ? "RIGHT" : "WRONG"),
  reason: para(correct ? "Because it is." : "Because it is not."),
});

export async function startDatabase(): Promise<void> {
  if (!(process.env.POSTGRES_DB ?? "").endsWith("_test")) {
    throw new Error("Integration tests require POSTGRES_DB ending in _test");
  }
  await runMigrations();
}
export const stopDatabase = () => closePool();

/** A clean database with one learner (who owns the subject) and one stranger. Returns the subject id. */
export async function resetCourse(name = "Transformers"): Promise<string> {
  const pool = getPool();
  await pool.query("TRUNCATE TABLE users CASCADE");
  await pool.query(
    `INSERT INTO users (id, email, password_hash) VALUES
       ($1, 'learner@example.com', 'x'), ($2, 'stranger@example.com', 'x')`,
    [LEARNER, STRANGER],
  );
  return (await subjects.createSubject(LEARNER, name)).id;
}

export interface LessonShape {
  screens?: number;
  questions?: number;
  /** Give every question one extra worded variant. Default true. */
  variants?: boolean;
  requires?: string[];
}

/** Authors a small lesson: numbered screens, and questions each teaching one screen. */
export async function authorLesson(
  subjectId: string,
  slug: string,
  shape: LessonShape = {},
): Promise<void> {
  const { screens: screenCount = 4, questions: questionCount = 3 } = shape;
  await concepts.addConcept(LEARNER, subjectId, {
    slug,
    name: slug,
    kind: "idea",
  });
  await lessons.createLesson(LEARNER, subjectId, {
    slug,
    title: `Lesson ${slug}`,
    summary: `About ${slug}`,
    covers: [slug],
  });
  for (let index = 1; index <= screenCount; index++) {
    await screens.addScreen(
      LEARNER,
      subjectId,
      slug,
      { blocks: para(`${slug} screen ${index}`) },
      "human",
    );
  }
  // Screen numbers continue after the subject's highest, so ask the lesson what it was given.
  const numbers = (
    await lessons.getLesson(LEARNER, subjectId, slug)
  ).screens.map((screen) => screen.number);
  for (let index = 1; index <= questionCount; index++) {
    const variants =
      shape.variants === false
        ? []
        : [
            {
              prompt: para(`${slug} q${index} reworded`),
              options: [option(true), option(false)],
            },
          ];
    await questions.addQuestion(LEARNER, subjectId, slug, {
      prompt: para(`${slug} q${index}`),
      options: [option(true), option(false), option(false)],
      teaches: [numbers[(index - 1) % screenCount]],
      covers: [slug],
      variants,
    });
  }
  for (const from of shape.requires ?? []) {
    await lessons.setPrerequisite(LEARNER, subjectId, slug, {
      from,
      reason: `${slug} builds on ${from}`,
    });
  }
}

interface AnyStep {
  kind: string;
  options?: { blocks: unknown }[];
}
export const textOf = (blocks: unknown): string =>
  (blocks as { spans?: { text: string }[] }[])
    .flatMap((block) => block.spans ?? [])
    .map((span) => span.text)
    .join(" ");

/** Which shown position holds the right (or a wrong) option. The step itself never says: authored text does. */
export function positionOf(step: AnyStep, wantRight: boolean): number {
  const wanted = wantRight ? "RIGHT" : "WRONG";
  const position = (step.options ?? []).findIndex(
    (option) => textOf(option.blocks) === wanted,
  );
  if (position < 0) throw new Error(`No ${wanted} option on this step`);
  return position;
}

type Rand = () => number;

/** Reads every screen of a started lesson until the first question. */
export async function readToQuestions(
  subjectId: string,
  slug: string,
  random: Rand,
) {
  let { step } = await learn.startLesson(LEARNER, subjectId, slug, random);
  while (step.kind === "screen") {
    ({ step } = await learn.goNext(LEARNER, subjectId, slug, random));
  }
  return step;
}

/**
 * Plays a started lesson to the end. `missFirst` lists question prompts (by order asked) to get
 * wrong once; every other answer is right. Returns each answer result in order.
 */
export async function playToEnd(
  subjectId: string,
  slug: string,
  random: Rand,
  options: { now?: Date; missTimes?: Map<number, number> } = {},
) {
  let step: { kind: string; options?: AnyStep["options"] } =
    await readToQuestions(subjectId, slug, random);
  const results = [];
  let asked = 0;
  for (let guard = 0; guard < 200 && step.kind !== "passed"; guard++) {
    if (step.kind === "remediation") {
      ({ step } = await learn.continueLesson(LEARNER, subjectId, slug, random));
      continue;
    }
    if (step.kind !== "question") throw new Error(`Unexpected ${step.kind}`);
    const wrong = (options.missTimes?.get(asked) ?? 0) > 0;
    if (wrong)
      options.missTimes!.set(asked, options.missTimes!.get(asked)! - 1);
    const result = await learn.answerLesson(
      LEARNER,
      subjectId,
      slug,
      positionOf(step, !wrong),
      random,
      options.now,
    );
    results.push(result);
    step = result.step;
    if (result.answer.correct) asked++;
  }
  if (step.kind !== "passed") throw new Error("Lesson did not finish");
  return results;
}

/**
 * For lessons whose options are not marked in their text (real content): finds the right position
 * by looking the answer up in the database, the way only a test may.
 */
export async function rightPositionFromDatabase(step: {
  presentation_id: string;
  options: { blocks: unknown }[];
}): Promise<number> {
  const stored = (
    await getPool().query<{ options: { correct: boolean; blocks: unknown }[] }>(
      `SELECT options FROM lesson_questions WHERE id = $1`,
      [step.presentation_id],
    )
  ).rows[0].options;
  const rightText = textOf(stored.find((option) => option.correct)!.blocks);
  return step.options.findIndex((shown) => textOf(shown.blocks) === rightText);
}
