import { Router } from "express";
import * as ctrl from "./study.controller";

export const studyRouter = Router();
studyRouter.post("/review", ctrl.review);
studyRouter.post("/sync", ctrl.sync);
// Separate from /sync so a bad reads payload can never cost a learner their reviews.
studyRouter.post("/reads", ctrl.readLessons);
