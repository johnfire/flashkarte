import { Router } from "express";
import * as ctrl from "./lessons.controller";

/** Mounted at /api/subjects, next to the subjects router; every path starts with the subject id. */
export const lessonsRouter = Router();

lessonsRouter.get("/:id/outline", ctrl.outline);

lessonsRouter.post("/:id/modules", ctrl.createModule);
lessonsRouter.patch("/:id/modules/:moduleId", ctrl.updateModule);
lessonsRouter.delete("/:id/modules/:moduleId", ctrl.deleteModule);

lessonsRouter.post("/:id/lessons", ctrl.createLesson);
// Before "/:id/lessons/:slug" so "import" is never read as a lesson slug.
lessonsRouter.post("/:id/lessons/import", ctrl.importFromJson);
lessonsRouter.get("/:id/lessons/:slug", ctrl.getLesson);
lessonsRouter.patch("/:id/lessons/:slug", ctrl.updateLesson);
lessonsRouter.delete("/:id/lessons/:slug", ctrl.deleteLesson);
lessonsRouter.post("/:id/lessons/:slug/finish", ctrl.finishLesson);
lessonsRouter.get("/:id/lessons/:slug/lint", ctrl.lintLesson);
lessonsRouter.put("/:id/lessons/:slug/prerequisites", ctrl.setPrerequisite);
lessonsRouter.delete(
  "/:id/lessons/:slug/prerequisites/:from",
  ctrl.removePrerequisite,
);

lessonsRouter.post("/:id/lessons/:slug/screens", ctrl.addScreen);
lessonsRouter.patch("/:id/screens/:number", ctrl.updateScreen);
lessonsRouter.post("/:id/screens/:number/retire", ctrl.retireScreen);
lessonsRouter.delete("/:id/screens/:number", ctrl.deleteScreen);
lessonsRouter.get("/:id/screens/:number/revisions", ctrl.screenRevisions);

lessonsRouter.post("/:id/lessons/:slug/questions", ctrl.addQuestion);
lessonsRouter.patch(
  "/:id/lessons/:slug/questions/:questionId",
  ctrl.updateQuestion,
);
lessonsRouter.post(
  "/:id/lessons/:slug/questions/:questionId/variants",
  ctrl.addVariant,
);
lessonsRouter.post(
  "/:id/lessons/:slug/questions/:questionId/retire",
  ctrl.retireQuestion,
);
lessonsRouter.delete(
  "/:id/lessons/:slug/questions/:questionId",
  ctrl.deleteQuestion,
);
