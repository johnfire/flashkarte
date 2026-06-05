import { Router } from "express";
import * as ctrl from "./study.controller";

export const studyRouter = Router();
studyRouter.post("/review", ctrl.review);
studyRouter.post("/sync", ctrl.sync);
