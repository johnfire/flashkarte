import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors";
import { logger } from "../utils/logger";
import { auditFromRequest } from "../domains/audit/audit.service";

function failedAiAction(req: Request): string | undefined {
  if (req.keyScope !== "deck") return undefined;
  if (req.method === "POST" && req.path === "/api/decks") return "deck.created";
  if (req.method === "POST" && /\/cards$/.test(req.path)) {
    return "deck.cards_added";
  }
  if (req.method === "PATCH" && req.path.startsWith("/api/decks/")) {
    return "deck.updated";
  }
  if (req.method === "DELETE" && req.path.startsWith("/api/decks/")) {
    return "deck.deleted";
  }
  return undefined;
}

function recordAiFailure(req: Request): void {
  const action = failedAiAction(req);
  if (!action) return;
  void auditFromRequest(req, action, "deck", undefined, "failure");
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  recordAiFailure(req);
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
  logger.error("middleware.errorHandler", "Unhandled error", {
    method: req.method,
    path: req.path,
    userId: req.userId,
    message: err.message,
    stack: err.stack,
  });
  res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
  });
}
