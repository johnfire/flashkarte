import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { logger } from "../utils/logger";

const REQUEST_ID_HEADER = "x-request-id";

/**
 * Attach a correlation ID to every request so the full path of a unit of work can
 * be traced through the logs. Honors an upstream `x-request-id` header when
 * present; otherwise generates a fresh UUID. The ID is propagated on the
 * response header, attached to `req.correlationId`, and bound to the async local
 * storage so subsequent log lines automatically include it.
 */
export function requestId(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const correlationId =
    typeof req.headers[REQUEST_ID_HEADER] === "string"
      ? req.headers[REQUEST_ID_HEADER]
      : crypto.randomUUID();
  req.correlationId = correlationId;
  res.setHeader(REQUEST_ID_HEADER, correlationId);
  logger.withCorrelationId(correlationId, () => {
    next();
  });
}
