import { Request, Response } from "express";
import { z } from "zod";
import { parse } from "../../utils/validate";
import { wrapAsync } from "../../utils/wrapAsync";
import { auditFromRequest } from "../audit/audit.service";
import { questionInsights } from "./learn-insights.service";
import * as comments from "./screen-comments.service";
import * as help from "./help-requests.service";
import * as learn from "./learn-lessons.service";
import { getLearnerOutline } from "./learn-outline.service";
import * as reviews from "./learn-reviews.service";

const answerSchema = z.object({
  choice: z
    .number({ error: "Say which option you chose" })
    .int("Say which option you chose")
    .min(0, "Say which option you chose"),
});

/** Audited against the subject (a uuid, like authoring); the lesson or question goes in the detail. */
function audit(req: Request, action: string, detail: object) {
  return auditFromRequest(
    req,
    action,
    "subject",
    req.params.id,
    "success",
    undefined,
    detail,
  );
}

const ids = (req: Request) =>
  [req.userId!, req.params.id, req.params.slug] as const;

export const outline = wrapAsync(async (req: Request, res: Response) => {
  res.json(await getLearnerOutline(req.userId!, req.params.id));
});

export const start = wrapAsync(async (req: Request, res: Response) => {
  const result = await learn.startLesson(...ids(req));
  if (!result.resumed) {
    await audit(req, "lesson.started", { lesson: req.params.slug });
  }
  res.json(result);
});

export const step = wrapAsync(async (req: Request, res: Response) => {
  res.json(await learn.currentLessonStep(...ids(req)));
});
export const next = wrapAsync(async (req: Request, res: Response) => {
  res.json(await learn.goNext(...ids(req)));
});
export const back = wrapAsync(async (req: Request, res: Response) => {
  res.json(await learn.goBack(...ids(req)));
});
export const carryOn = wrapAsync(async (req: Request, res: Response) => {
  res.json(await learn.continueLesson(...ids(req)));
});
export const resumeLater = wrapAsync(async (req: Request, res: Response) => {
  res.json(await learn.resumeLesson(...ids(req)));
});
export const comeBackLater = wrapAsync(async (req: Request, res: Response) => {
  const result = await learn.pauseLesson(...ids(req));
  await audit(req, "lesson.paused", { lesson: req.params.slug });
  res.json(result);
});
export const screens = wrapAsync(async (req: Request, res: Response) => {
  res.json(await learn.lessonScreens(...ids(req)));
});

export const answer = wrapAsync(async (req: Request, res: Response) => {
  const { choice } = parse(answerSchema, req.body);
  const result = await learn.answerLesson(...ids(req), choice);
  await audit(req, "question.answered", {
    lesson: req.params.slug,
    correct: result.answer.correct,
    phase: "lesson",
  });
  if (result.passed) {
    await audit(req, "lesson.passed", {
      lesson: req.params.slug,
      unlocked: result.unlocked.map((lesson) => lesson.slug),
    });
  }
  res.json(result);
});

export const dueReviews = wrapAsync(async (req: Request, res: Response) => {
  res.json(await reviews.listDueReviews(req.userId!, req.params.id));
});
export const startReview = wrapAsync(async (req: Request, res: Response) => {
  res.json(
    await reviews.startReview(
      req.userId!,
      req.params.id,
      req.params.questionId,
    ),
  );
});
export const continueReview = wrapAsync(async (req: Request, res: Response) => {
  res.json(
    await reviews.continueReview(
      req.userId!,
      req.params.id,
      req.params.questionId,
    ),
  );
});
export const pauseReview = wrapAsync(async (req: Request, res: Response) => {
  res.json(
    await reviews.pauseReview(
      req.userId!,
      req.params.id,
      req.params.questionId,
    ),
  );
});
export const answerReview = wrapAsync(async (req: Request, res: Response) => {
  const { choice } = parse(answerSchema, req.body);
  const result = await reviews.answerReview(
    req.userId!,
    req.params.id,
    req.params.questionId,
    choice,
  );
  await audit(req, "question.answered", {
    question: req.params.questionId,
    correct: result.answer.correct,
    phase: "review",
  });
  res.json(result);
});

/** For the owner: how often each question in a lesson is missed, over all learners, with no identities. */
export const insights = wrapAsync(async (req: Request, res: Response) => {
  res.json(await questionInsights(...ids(req)));
});

export const addComment = wrapAsync(async (req: Request, res: Response) => {
  const result = await comments.addScreenComment(
    req.userId!,
    req.params.id,
    req.params.number,
    req.body,
  );
  await audit(req, "screen.commented", {
    screen: result.number,
    comment: result.id,
  });
  res.status(201).json(result);
});
export const listComments = wrapAsync(async (req: Request, res: Response) => {
  res.json(
    await comments.listScreenComments(
      ...ids(req),
      req.query.include_resolved === "true",
    ),
  );
});
export const resolveComment = wrapAsync(async (req: Request, res: Response) => {
  const result = await comments.resolveScreenComment(
    req.userId!,
    req.params.id,
    req.params.commentId,
    req.keyScope === "deck" ? "ai" : "human",
  );
  await audit(req, "screen.comment_resolved", {
    comment: req.params.commentId,
  });
  res.json(result);
});

export const askForMore = wrapAsync(async (req: Request, res: Response) => {
  const result = await help.requestHelpOnScreen(
    req.userId!,
    req.params.id,
    req.params.number,
    req.body,
  );
  await audit(req, "help.requested", {
    screen: result.number,
    request: result.id,
  });
  res.status(201).json(result);
});
export const askForMoreOnQuestion = wrapAsync(
  async (req: Request, res: Response) => {
    const result = await help.requestHelpOnQuestion(
      req.userId!,
      req.params.id,
      req.params.questionId,
      req.body,
    );
    await audit(req, "help.requested", {
      screen: result.number,
      question: result.question_id,
      request: result.id,
    });
    res.status(201).json(result);
  },
);

/** For the owner's AI: what learners have asked for more on. */
export const openHelp = wrapAsync(async (req: Request, res: Response) => {
  res.json(
    await help.listOpenHelpRequests(
      req.userId!,
      req.params.id,
      typeof req.query.lesson === "string" ? req.query.lesson : undefined,
    ),
  );
});
export const answerHelp = wrapAsync(async (req: Request, res: Response) => {
  const result = await help.answerRequest(
    req.userId!,
    req.params.id,
    req.params.requestId,
    req.body,
    req.keyScope === "deck" ? "ai" : "human",
  );
  await audit(req, "help.answered", {
    request: result.answered,
    screens: result.screens,
  });
  res.status(201).json(result);
});
