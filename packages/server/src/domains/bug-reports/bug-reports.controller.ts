import { Request, Response } from "express";
import { z } from "zod";
import { AuthError } from "../../utils/errors";
import { wrapAsync } from "../../utils/wrapAsync";
import { parse } from "../../utils/validate";
import { clampString as clamp } from "../../utils/clampString";
import { getCurrentUser } from "../auth/auth.service";
import * as service from "./bug-reports.service";

const TITLE_MAX = 140;
const DESC_MAX = 8_000;
const SHORT_MAX = 80;
const bugReportTitleSchema = z.string({ error: "title is required" });
const bugReportDescriptionSchema = z.string({
  error: "description is required",
});

export const submitBugReport = wrapAsync(
  async (req: Request, res: Response) => {
    if (!req.userId) throw new AuthError();

    const title = parse(bugReportTitleSchema, clamp(req.body.title, TITLE_MAX));
    const description = parse(
      bugReportDescriptionSchema,
      clamp(req.body.description, DESC_MAX),
    );

    const user = await getCurrentUser(req.userId);

    const result = await service.submitBugReport({
      title,
      description,
      appVersion: clamp(req.body.appVersion, SHORT_MAX),
      platform: clamp(req.body.platform, SHORT_MAX),
      device: clamp(req.body.device, SHORT_MAX),
      userId: req.userId,
      email: user.email,
    });

    res.status(201).json(result);
  },
);
