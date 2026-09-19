import { Router } from "express";
import { requireFullScope } from "../../middleware/auth";
import * as ctrl from "./learn.controller";

/**
 * Mounted at /api/subjects. Learning is the person's own act, so a deck-scoped (AI) key is
 * refused here: the AI authors lessons and reads help requests but does not take them for you.
 */
export const learnRouter = Router();
learnRouter.use("/:id/learn", requireFullScope);

learnRouter.get("/:id/learn/outline", ctrl.outline);

learnRouter.post("/:id/learn/lessons/:slug/start", ctrl.start);
learnRouter.get("/:id/learn/lessons/:slug/step", ctrl.step);
learnRouter.post("/:id/learn/lessons/:slug/next", ctrl.next);
learnRouter.post("/:id/learn/lessons/:slug/back", ctrl.back);
learnRouter.post("/:id/learn/lessons/:slug/answer", ctrl.answer);
learnRouter.post("/:id/learn/lessons/:slug/continue", ctrl.carryOn);
learnRouter.post("/:id/learn/lessons/:slug/pause", ctrl.comeBackLater);
learnRouter.post("/:id/learn/lessons/:slug/resume", ctrl.resumeLater);
learnRouter.get("/:id/learn/lessons/:slug/screens", ctrl.screens);

learnRouter.get("/:id/learn/reviews", ctrl.dueReviews);
learnRouter.post("/:id/learn/reviews/:questionId/start", ctrl.startReview);
learnRouter.post("/:id/learn/reviews/:questionId/answer", ctrl.answerReview);
learnRouter.post(
  "/:id/learn/reviews/:questionId/continue",
  ctrl.continueReview,
);
learnRouter.post("/:id/learn/reviews/:questionId/pause", ctrl.pauseReview);

// Owner-only insight into which questions fail; the lesson's owner is checked in the service.
learnRouter.get("/:id/lessons/:slug/insights", ctrl.insights);

// Comments on screens: the owner writes them while learning; the owner's AI reads and resolves them.
learnRouter.post("/:id/learn/screens/:number/comments", ctrl.addComment);
learnRouter.get("/:id/lessons/:slug/comments", ctrl.listComments);
learnRouter.post("/:id/comments/:commentId/resolve", ctrl.resolveComment);
