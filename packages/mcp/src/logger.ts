import { requestCorrelationStore } from "./api";

type LogLevel = "info" | "warn" | "error";

function write(
  level: LogLevel,
  source: string,
  message: string,
  metadata: Record<string, unknown> = {},
): void {
  const entry = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    source,
    correlationId: requestCorrelationStore?.getStore?.(),
    msg: message,
    ...metadata,
  });
  // eslint-disable-next-line no-console -- the MCP process has no file sink
  (level === "error" ? console.error : console.log)(entry);
}

export const logger = {
  info: (source: string, message: string, metadata?: Record<string, unknown>) =>
    write("info", source, message, metadata),
  warn: (source: string, message: string, metadata?: Record<string, unknown>) =>
    write("warn", source, message, metadata),
  error: (
    source: string,
    message: string,
    metadata?: Record<string, unknown>,
  ) => write("error", source, message, metadata),
};
