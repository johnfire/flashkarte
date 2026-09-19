import { NotFoundError, ValidationError } from "../../utils/errors";
import { parse } from "../../utils/validate";
import {
  assertTesting,
  lintAfterEdit,
  requireLesson,
  resolveConceptIds,
  withLockedSubject,
} from "./lesson-context";
import { createQuestion, resolveTeachingScreens } from "./lesson-writes";
import {
  newQuestionSchema,
  questionPatchSchema,
  variantSchema,
} from "./lessons.schemas";
import * as repo from "./questions.repository";

async function requireQuestion(
  db: Parameters<typeof repo.findQuestion>[0],
  lessonId: string,
  id: string,
) {
  const question = await repo.findQuestion(db, lessonId, id);
  if (!question) throw new NotFoundError("Question not found");
  return question;
}

export async function addQuestion(
  userId: string,
  subjectId: string,
  lessonSlug: string,
  input: unknown,
) {
  const fields = parse(newQuestionSchema, input);
  return withLockedSubject(userId, subjectId, async (db, subject) => {
    const lesson = await requireLesson(db, subject.id, lessonSlug);
    const question = await createQuestion(db, lesson, {
      prompt: fields.prompt,
      options: fields.options,
      screens: fields.teaches,
      covers: fields.covers,
      variants: fields.variants,
    });
    return { id: question.id, issues: await lintAfterEdit(db, lesson) };
  });
}

/** A variant is an equivalent question worded differently; it inherits its question's screens and concepts. */
export async function addVariant(
  userId: string,
  subjectId: string,
  lessonSlug: string,
  questionId: string,
  input: unknown,
) {
  const fields = parse(variantSchema, input);
  return withLockedSubject(userId, subjectId, async (db, subject) => {
    const lesson = await requireLesson(db, subject.id, lessonSlug);
    const parent = await requireQuestion(db, lesson.id, questionId);
    if (parent.parent_id !== null) {
      throw new ValidationError(
        "A variant cannot have variants: add it to the original question",
      );
    }
    const variant = await repo.insertQuestion(db, {
      lessonId: lesson.id,
      parentId: parent.id,
      prompt: fields.prompt,
      options: fields.options,
    });
    return { id: variant.id, issues: await lintAfterEdit(db, lesson) };
  });
}

/** Edits a question (or a variant's wording). Allowed in both stages; re-pointing lets a finished lesson swap in a replacement screen. */
export async function updateQuestion(
  userId: string,
  subjectId: string,
  lessonSlug: string,
  questionId: string,
  input: unknown,
) {
  const patch = parse(questionPatchSchema, input);
  return withLockedSubject(userId, subjectId, async (db, subject) => {
    const lesson = await requireLesson(db, subject.id, lessonSlug);
    const question = await requireQuestion(db, lesson.id, questionId);
    const isVariant = question.parent_id !== null;
    if (isVariant && (patch.teaches || patch.covers)) {
      throw new ValidationError(
        "A variant inherits its question's screens and concepts: change them on the question",
      );
    }
    await repo.writeQuestion(db, question.id, {
      prompt: patch.prompt ?? question.prompt,
      options: patch.options ?? question.options,
    });
    if (patch.teaches) {
      await repo.replaceQuestionScreens(
        db,
        question.id,
        await resolveTeachingScreens(db, lesson, patch.teaches),
      );
    }
    if (patch.covers) {
      await repo.replaceQuestionConcepts(
        db,
        question.id,
        await resolveConceptIds(db, subject.id, patch.covers),
      );
    }
    return { id: question.id, issues: await lintAfterEdit(db, lesson) };
  });
}

/** Hides a question from new learners. Anyone who already passed stays passed. */
export async function retireQuestion(
  userId: string,
  subjectId: string,
  lessonSlug: string,
  questionId: string,
) {
  return withLockedSubject(userId, subjectId, async (db, subject) => {
    const lesson = await requireLesson(db, subject.id, lessonSlug);
    const question = await requireQuestion(db, lesson.id, questionId);
    await repo.retireQuestion(db, question.id);
    return { id: question.id, issues: await lintAfterEdit(db, lesson) };
  });
}

export async function deleteQuestion(
  userId: string,
  subjectId: string,
  lessonSlug: string,
  questionId: string,
) {
  return withLockedSubject(userId, subjectId, async (db, subject) => {
    const lesson = await requireLesson(db, subject.id, lessonSlug);
    assertTesting(lesson, "delete a question");
    const question = await requireQuestion(db, lesson.id, questionId);
    await repo.removeQuestion(db, question.id);
    return { issues: await lintAfterEdit(db, lesson) };
  });
}
