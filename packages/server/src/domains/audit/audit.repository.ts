import type { PoolClient } from "pg";
import { query } from "../../db/client";

export interface AuditLogRow {
  id: string;
  actor_type: string;
  actor_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  correlation_id: string | null;
  outcome: string;
  before_state: object | null;
  after_state: object | null;
  created_at: string;
}

export function insertAuditLog(
  record: {
    actorType: string;
    actorId: string;
    action: string;
    targetType?: string;
    targetId?: string;
    correlationId?: string;
    outcome: string;
    beforeState?: unknown;
    afterState?: unknown;
  },
  client?: PoolClient,
): Promise<AuditLogRow[]> {
  const sql = `
    INSERT INTO audit_log
      (actor_type, actor_id, action, target_type, target_id, correlation_id, outcome, before_state, after_state)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `;
  const params = [
    record.actorType,
    record.actorId,
    record.action,
    record.targetType ?? null,
    record.targetId ?? null,
    record.correlationId ?? null,
    record.outcome,
    record.beforeState ? JSON.stringify(record.beforeState) : null,
    record.afterState ? JSON.stringify(record.afterState) : null,
  ];
  if (client) {
    return client.query<AuditLogRow>(sql, params).then((res) => res.rows);
  }
  return query<AuditLogRow>(sql, params);
}
