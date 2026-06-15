import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors";
import { logger } from "../utils/logger";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.httpStatus).json({
      error: { code: err.code, message: err.message, context: err.context },
    });
    return;
  }
  // Postgres "invalid text representation" (22P02) — almost always a malformed
  // :id route param hitting a ::uuid cast. Treat as not-found rather than a 500.
  if ((err as { code?: string }).code === "22P02") {
    res.status(404).json({
      error: { code: "NOT_FOUND", message: "Resource not found" },
    });
    return;
  }
  logger.error("Unhandled error", {
    method: req.method,
    path: req.originalUrl,
    userId: req.userId,
    message: err.message,
    stack: err.stack,
  });
  res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
  });
}
