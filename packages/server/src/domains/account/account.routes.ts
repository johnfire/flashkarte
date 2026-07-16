import { Router } from "express";
import * as ctrl from "./account.controller";

export const accountRouter = Router();
accountRouter.get("/export", ctrl.exportData);
