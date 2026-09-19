import type { LessonInput, QuestionInput } from "@flashkarte/shared";
import type { Queryable } from "../../db/queryable";
import * as lessonsRepo from "./lessons.repository";
import * as questionsRepo from "./questions.repository";
import * as screensRepo from "./screens.repository";

/**
 * Loads a whole lesson in the shape the shared lint reads. Question links (screens and concepts)
 * live on the top-level question; a variant inherits them, so it carries only its own prompt and
 * options.
 */
export async function loadLessonForLint(
  db: Queryable,
  lesson: lessonsRepo.LessonRow,
): Promise<LessonInput> {
  // One after the other: `db` is often a single transaction connection, which runs one query at a time.
  const screens = await screensRepo.listScreens(db, lesson.id);
  const questions = await questionsRepo.listQuestions(db, lesson.id);
  const links = await questionsRepo.loadQuestionLinks(db, lesson.id);
  const covered = await lessonsRepo.listLessonConcepts(db, lesson.subject_id);
  const top = questions.filter((question) => question.parent_id === null);
  const toQuestion = (question: questionsRepo.QuestionRow): QuestionInput => ({
    id: question.id,
    prompt: question.prompt,
    options: question.options,
    screens: links.screens.get(question.id) ?? [],
    covers: links.concepts.get(question.id) ?? [],
    retired: question.retired_at !== null,
    variants: questions
      .filter((variant) => variant.parent_id === question.id)
      .map((variant) => ({
        id: variant.id,
        prompt: variant.prompt,
        options: variant.options,
        retired: variant.retired_at !== null,
      })),
  });
  return {
    summary: lesson.summary,
    covers: covered
      .filter((row) => row.lesson_id === lesson.id)
      .map((row) => row.slug),
    screens: screens.map((screen) => ({
      number: screen.number,
      blocks: screen.blocks,
      retired: screen.retired_at !== null,
    })),
    questions: top.map(toQuestion),
  };
}
