import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as ctrl from "./client-errors.controller";

export const clientErrorsRouter = Router();

// Modest cap on top of the global limiter — a crash-looping client could
// otherwise flood the log. Disabled under test so suites don't trip it.
if (process.env.NODE_ENV !== "test") {
  clientErrorsRouter.use(
    rateLimit({
      windowMs: 10 * 60_000,
      limit: 30,
      standardHeaders: "draft-7",
      legacyHeaders: false,
      message: {
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many error reports, please try again later",
        },
      },
    }),
  );
}

clientErrorsRouter.post("/", ctrl.reportClientError);
