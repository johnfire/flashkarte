import { Router } from "express";
import * as ctrl from "./subjects.controller";
import { requireFullScope } from "../../middleware/auth";

export const subjectsRouter = Router();
subjectsRouter.get("/", ctrl.list);
subjectsRouter.get("/catalog", ctrl.listCatalog);
// Before "/:id" so "shared" is never read as a subject id.
subjectsRouter.get("/shared", ctrl.listShared);
subjectsRouter.post("/", ctrl.create);
// Before "/:id" so "import" is never read as a subject id.
subjectsRouter.post("/import", ctrl.importFromJson);
subjectsRouter.get("/:id", ctrl.get);
subjectsRouter.post("/:id/enroll", ctrl.enroll);
// Who a course reaches is an account decision: deck-scoped (MCP) keys may
// not change it.
subjectsRouter.get("/:id/shares", requireFullScope, ctrl.getShares);
subjectsRouter.put("/:id/shares", requireFullScope, ctrl.setShares);
subjectsRouter.patch("/:id", ctrl.update);
subjectsRouter.delete("/:id", ctrl.remove);
subjectsRouter.get("/:id/progress", ctrl.progress);
subjectsRouter.get("/:id/lint", ctrl.lint);
subjectsRouter.post("/:id/course-family", ctrl.createCourseFamily);
subjectsRouter.get("/:id/editions", ctrl.listEditions);
subjectsRouter.post("/:id/editions", ctrl.createEdition);
subjectsRouter.post("/:id/concepts", ctrl.addConcept);
subjectsRouter.patch("/:id/concepts/:slug", ctrl.updateConcept);
subjectsRouter.delete("/:id/concepts/:slug", ctrl.removeConcept);
subjectsRouter.put("/:id/concepts/:slug/cards", ctrl.linkCards);
subjectsRouter.put("/:id/edges", ctrl.setEdge);
subjectsRouter.delete("/:id/edges/:from/:to", ctrl.removeEdge);
