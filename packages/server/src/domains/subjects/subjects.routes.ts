import { Router } from "express";
import * as ctrl from "./subjects.controller";

export const subjectsRouter = Router();
subjectsRouter.get("/", ctrl.list);
subjectsRouter.post("/", ctrl.create);
// Before "/:id" so "import" is never read as a subject id.
subjectsRouter.post("/import", ctrl.importFromJson);
subjectsRouter.get("/:id", ctrl.get);
subjectsRouter.patch("/:id", ctrl.update);
subjectsRouter.delete("/:id", ctrl.remove);
subjectsRouter.get("/:id/progress", ctrl.progress);
subjectsRouter.get("/:id/lint", ctrl.lint);
subjectsRouter.post("/:id/concepts", ctrl.addConcept);
subjectsRouter.patch("/:id/concepts/:slug", ctrl.updateConcept);
subjectsRouter.delete("/:id/concepts/:slug", ctrl.removeConcept);
subjectsRouter.put("/:id/concepts/:slug/cards", ctrl.linkCards);
subjectsRouter.put("/:id/edges", ctrl.setEdge);
subjectsRouter.delete("/:id/edges/:from/:to", ctrl.removeEdge);
