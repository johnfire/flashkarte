import { Request, Response } from "express";
import { z } from "zod";
import { wrapAsync } from "../../utils/wrapAsync";
import { parse } from "../../utils/validate";
import { clampString as clamp } from "../../utils/clampString";
import * as service from "./client-errors.service";

const MSG_MAX = 2_000;
const STACK_MAX = 8_000;
const CONTEXT_MAX = 500;
const UA_MAX = 500;
const SHORT_MAX = 50;
const clientErrorMessageSchema = z.string({ error: "message is required" });

export const reportClientError = wrapAsync(
  async (req: Request, res: Response) => {
    const message = parse(
      clientErrorMessageSchema,
      clamp(req.body.message, MSG_MAX),
    );

    service.recordClientError({
      app: clamp(req.body.app, SHORT_MAX) ?? "unknown",
      message,
      appVersion: clamp(req.body.appVersion, SHORT_MAX),
      platform: clamp(req.body.platform, SHORT_MAX),
      context: clamp(req.body.context, CONTEXT_MAX),
      url: clamp(req.body.url, CONTEXT_MAX),
      userAgent: clamp(req.body.userAgent, UA_MAX),
      stack: clamp(req.body.stack, STACK_MAX),
      // Public route — usually undefined.
      userId: req.userId,
    });

    res.status(202).json({ status: "accepted" });
  },
);
