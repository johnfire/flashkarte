import { Request, Response } from "express";
import { AuthError, ValidationError } from "../../utils/errors";
import { wrapAsync } from "../../utils/wrapAsync";
import { getCurrentUser } from "../auth/auth.service";
import * as service from "./bug-reports.service";

const TITLE_MAX = 140;
const DESC_MAX = 8_000;
const SHORT_MAX = 80;

function clamp(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

export const submitBugReport = wrapAsync(
  async (req: Request, res: Response) => {
    if (!req.userId) throw new AuthError();

    const title = clamp(req.body.title, TITLE_MAX);
    if (!title) throw new ValidationError("title is required");

    const description = clamp(req.body.description, DESC_MAX);
    if (!description) throw new ValidationError("description is required");

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
