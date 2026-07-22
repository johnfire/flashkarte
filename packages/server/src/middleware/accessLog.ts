import type { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";
import { recordHttpMetric } from "../observability/httpMetrics";

/**
 * Structured HTTP access log. Emits a single JSON line on response finish,
 * including the correlation ID, method, path, status, and duration. Mounted
 * in production; dev uses morgan("dev") for human readability (per logging
 * standards: structured in production, plain text locally).
 */
export function accessLog(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const start = Date.now();
  const correlationId = req.correlationId ?? "unknown";
  res.on("finish", () => {
    const duration = Date.now() - start;
    recordHttpMetric(req.method, res.statusCode, duration);
    logger.withCorrelationId(correlationId, () => {
      logger.info("http.access", "request", {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs: duration,
        userId: req.userId,
        keyScope: req.keyScope,
        keyPrefix: req.keyPrefix,
      });
    });
  });
  next();
}
