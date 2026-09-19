import { Request, Response } from "express";
import { wrapAsync } from "../../utils/wrapAsync";
import { auditFromRequest } from "../audit/audit.service";
import { importLesson } from "./lesson-import.service";
import * as lessons from "./lessons.service";
import { getOutline } from "./outline.service";
import * as questions from "./questions.service";
import type { AuthorKind } from "./screens.repository";
import * as screens from "./screens.service";

/** A write made with an AI (deck-scoped) key is recorded as AI-authored, never as the person. */
const authorKindOf = (req: Request): AuthorKind =>
  req.keyScope === "deck" ? "ai" : "human";

function audit(req: Request, action: string, afterState?: unknown) {
  return auditFromRequest(
    req,
    action,
    "subject",
    req.params.id,
    "success",
    undefined,
    afterState,
  );
}

const ok = (res: Response, body: unknown) => res.json(body);

export const createModule = wrapAsync(async (req: Request, res: Response) => {
  const module = await lessons.createModule(
    req.userId!,
    req.params.id,
    req.body,
  );
  await audit(req, "lesson.module_created", { title: module.title });
  res.status(201).json(module);
});
export const updateModule = wrapAsync(async (req: Request, res: Response) => {
  const module = await lessons.updateModule(
    req.userId!,
    req.params.id,
    req.params.moduleId,
    req.body,
  );
  await audit(req, "lesson.module_updated", { module: module.id });
  ok(res, module);
});
export const deleteModule = wrapAsync(async (req: Request, res: Response) => {
  await lessons.deleteModule(req.userId!, req.params.id, req.params.moduleId);
  await audit(req, "lesson.module_deleted", { module: req.params.moduleId });
  res.status(204).end();
});

export const createLesson = wrapAsync(async (req: Request, res: Response) => {
  const result = await lessons.createLesson(
    req.userId!,
    req.params.id,
    req.body,
  );
  await audit(req, "lesson.created", { slug: result.lesson.slug });
  res.status(201).json(result);
});
export const importFromJson = wrapAsync(async (req: Request, res: Response) => {
  const result = await importLesson(
    req.userId!,
    req.params.id,
    req.body,
    authorKindOf(req),
  );
  await audit(req, "lesson.imported", {
    slug: result.lesson.slug,
    screens: result.screens.length,
    questions: result.question_ids.length,
  });
  res.status(201).json(result);
});
export const getLesson = wrapAsync(async (req: Request, res: Response) => {
  ok(res, await lessons.getLesson(req.userId!, req.params.id, req.params.slug));
});
export const lintLesson = wrapAsync(async (req: Request, res: Response) => {
  ok(res, {
    issues: await lessons.lintLessonForOwner(
      req.userId!,
      req.params.id,
      req.params.slug,
    ),
  });
});
export const updateLesson = wrapAsync(async (req: Request, res: Response) => {
  const result = await lessons.updateLesson(
    req.userId!,
    req.params.id,
    req.params.slug,
    req.body,
  );
  await audit(req, "lesson.updated", { slug: req.params.slug });
  ok(res, result);
});
export const deleteLesson = wrapAsync(async (req: Request, res: Response) => {
  await lessons.deleteLesson(req.userId!, req.params.id, req.params.slug);
  await audit(req, "lesson.deleted", { slug: req.params.slug });
  res.status(204).end();
});
export const finishLesson = wrapAsync(async (req: Request, res: Response) => {
  const result = await lessons.finishLesson(
    req.userId!,
    req.params.id,
    req.params.slug,
  );
  await audit(req, "lesson.finished", { slug: req.params.slug });
  ok(res, result);
});
export const setPrerequisite = wrapAsync(
  async (req: Request, res: Response) => {
    const edge = await lessons.setPrerequisite(
      req.userId!,
      req.params.id,
      req.params.slug,
      req.body,
    );
    await audit(req, "lesson.prerequisite_set", edge);
    ok(res, edge);
  },
);
export const removePrerequisite = wrapAsync(
  async (req: Request, res: Response) => {
    await lessons.removePrerequisite(
      req.userId!,
      req.params.id,
      req.params.slug,
      req.params.from,
    );
    await audit(req, "lesson.prerequisite_removed", {
      from: req.params.from,
      to: req.params.slug,
    });
    res.status(204).end();
  },
);
export const outline = wrapAsync(async (req: Request, res: Response) => {
  ok(res, await getOutline(req.userId!, req.params.id));
});

export const addScreen = wrapAsync(async (req: Request, res: Response) => {
  const result = await screens.addScreen(
    req.userId!,
    req.params.id,
    req.params.slug,
    req.body,
    authorKindOf(req),
  );
  await audit(req, "screen.added", {
    lesson: req.params.slug,
    number: result.screen.number,
  });
  res.status(201).json(result);
});
export const updateScreen = wrapAsync(async (req: Request, res: Response) => {
  const result = await screens.updateScreen(
    req.userId!,
    req.params.id,
    req.params.number,
    req.body,
  );
  await audit(req, "screen.updated", { number: result.number });
  ok(res, result);
});
export const retireScreen = wrapAsync(async (req: Request, res: Response) => {
  const result = await screens.retireScreen(
    req.userId!,
    req.params.id,
    req.params.number,
  );
  await audit(req, "screen.retired", { number: result.number });
  ok(res, result);
});
export const deleteScreen = wrapAsync(async (req: Request, res: Response) => {
  await screens.deleteScreen(req.userId!, req.params.id, req.params.number);
  await audit(req, "screen.deleted", { number: req.params.number });
  res.status(204).end();
});
export const screenRevisions = wrapAsync(
  async (req: Request, res: Response) => {
    ok(
      res,
      await screens.listScreenRevisions(
        req.userId!,
        req.params.id,
        req.params.number,
      ),
    );
  },
);

export const addQuestion = wrapAsync(async (req: Request, res: Response) => {
  const result = await questions.addQuestion(
    req.userId!,
    req.params.id,
    req.params.slug,
    req.body,
  );
  await audit(req, "question.added", {
    lesson: req.params.slug,
    question: result.id,
  });
  res.status(201).json(result);
});
export const addVariant = wrapAsync(async (req: Request, res: Response) => {
  const result = await questions.addVariant(
    req.userId!,
    req.params.id,
    req.params.slug,
    req.params.questionId,
    req.body,
  );
  await audit(req, "question.variant_added", {
    lesson: req.params.slug,
    question: req.params.questionId,
  });
  res.status(201).json(result);
});
export const updateQuestion = wrapAsync(async (req: Request, res: Response) => {
  const result = await questions.updateQuestion(
    req.userId!,
    req.params.id,
    req.params.slug,
    req.params.questionId,
    req.body,
  );
  await audit(req, "question.updated", {
    lesson: req.params.slug,
    question: result.id,
  });
  ok(res, result);
});
export const retireQuestion = wrapAsync(async (req: Request, res: Response) => {
  const result = await questions.retireQuestion(
    req.userId!,
    req.params.id,
    req.params.slug,
    req.params.questionId,
  );
  await audit(req, "question.retired", {
    lesson: req.params.slug,
    question: result.id,
  });
  ok(res, result);
});
export const deleteQuestion = wrapAsync(async (req: Request, res: Response) => {
  await questions.deleteQuestion(
    req.userId!,
    req.params.id,
    req.params.slug,
    req.params.questionId,
  );
  await audit(req, "question.deleted", {
    lesson: req.params.slug,
    question: req.params.questionId,
  });
  res.status(204).end();
});
