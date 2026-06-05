import { Router } from "express";
import * as ctrl from "./library.controller";

export const libraryRouter = Router();
libraryRouter.get("/", ctrl.list);
libraryRouter.get("/:id", ctrl.get);
libraryRouter.post("/:id/clone", ctrl.clone);
