import { Router } from "express";
import * as ctrl from "./library.controller";
import * as coursesCtrl from "../courses/courses.controller";

export const libraryRouter = Router();
// Must come before "/:id" or "courses" would be parsed as a deck id.
libraryRouter.get("/courses", coursesCtrl.listPublic);
libraryRouter.get("/courses/:id", coursesCtrl.getPublicPreview);
libraryRouter.post("/courses/:id/clone", coursesCtrl.clone);
libraryRouter.get("/", ctrl.list);
libraryRouter.get("/:id", ctrl.get);
libraryRouter.post("/:id/clone", ctrl.clone);
