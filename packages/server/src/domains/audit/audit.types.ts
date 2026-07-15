export interface AuditActor {
  type: "user" | "ai-agent";
  id: string;
}

export interface AuditRecordParams {
  actor: AuditActor;
  action: string;
  targetType?: string;
  targetId?: string;
  outcome?: "success" | "failure";
  beforeState?: Record<string, unknown> | unknown;
  afterState?: Record<string, unknown> | unknown;
}
