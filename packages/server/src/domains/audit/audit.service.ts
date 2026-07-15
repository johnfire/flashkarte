import type { Request } from "express";
import type { PoolClient } from "pg";
import { insertAuditLog } from "./audit.repository";
import { logger, getCorrelationId } from "../../utils/logger";
import type { AuditActor, AuditRecordParams } from "./audit.types";

export function userActor(userId: string): AuditActor {
  return { type: "user", id: userId };
}

export function actorFromRequest(req: Request): AuditActor {
  if (req.keyScope === "deck" && req.keyPrefix) {
    return { type: "ai-agent", id: `ai-agent:${req.keyPrefix}` };
  }
  if (req.userId) {
    return { type: "user", id: req.userId };
  }
  throw new Error("Cannot derive audit actor from unauthenticated request");
}

export function auditFromRequest(
  req: Request,
  action: string,
  targetType?: string,
  targetId?: string,
  outcome: "success" | "failure" = "success",
  beforeState?: unknown,
  afterState?: unknown,
): Promise<void> {
  return record(
    {
      actor: actorFromRequest(req),
      action,
      targetType,
      targetId,
      outcome,
      beforeState,
      afterState,
    },
    undefined,
  );
}

/**
 * Append an audit log entry. Best-effort: a failure here is logged and swallowed
 * so an audit-write problem never breaks the primary operation. Destructive
 * operations that need atomicity (e.g. account deletion) should pass a
 * transaction `client` so the audit row is committed with the mutation.
 */
export async function record(
  params: AuditRecordParams,
  client?: PoolClient,
): Promise<void> {
  const correlationId = getCorrelationId();
  const beforeState = params.beforeState
    ? (params.beforeState as Record<string, unknown>)
    : undefined;
  const afterState = params.afterState
    ? (params.afterState as Record<string, unknown>)
    : undefined;
  try {
    await insertAuditLog(
      {
        actorType: params.actor.type,
        actorId: params.actor.id,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        correlationId,
        outcome: params.outcome ?? "success",
        beforeState,
        afterState,
      },
      client,
    );
  } catch (err) {
    logger.error(
      "audit.service",
      "audit write failed",
      {
        action: params.action,
        targetId: params.targetId,
        correlationId,
        error: err instanceof Error ? err.message : String(err),
      },
    );
  }
}
