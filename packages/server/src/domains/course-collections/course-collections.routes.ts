import { Router } from "express";
import * as controller from "./course-collections.controller";

export const courseCollectionsRouter = Router();
courseCollectionsRouter.get("/", controller.listCatalog);
courseCollectionsRouter.get("/:id", controller.getCatalog);
