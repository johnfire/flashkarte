import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as ctrl from "./bug-reports.controller";

export const bugReportsRouter = Router();

// Filing an issue per request is expensive; cap submissions so a misbehaving
// client can't spam the tracker. Disabled under test so suites don't trip it.
if (process.env.NODE_ENV !== "test") {
  bugReportsRouter.use(
    rateLimit({
      windowMs: 10 * 60_000,
      limit: 5,
      standardHeaders: "draft-7",
      legacyHeaders: false,
      message: {
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many bug reports, please try again later",
        },
      },
    }),
  );
}

bugReportsRouter.post("/", ctrl.submitBugReport);
