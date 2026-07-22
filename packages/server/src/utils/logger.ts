import fs from "fs";
import path from "path";
import { AsyncLocalStorage } from "async_hooks";

const LOG_DIR = process.env.LOG_DIR;
let fileStream: fs.WriteStream | null = null;
const asyncLocalStorage = new AsyncLocalStorage<string>();

// Open the log file, but never let a file/permission failure crash the process.
// createWriteStream opens the fd lazily on the libuv thread pool, so an EACCES/
// ENOENT surfaces as an async 'error' event (not a sync throw) — and an unhandled
// stream 'error' becomes an uncaughtException. mkdirSync, by contrast, can throw
// synchronously. Both paths fall back to console-only logging and keep serving.
function dropFileStream(reason: string, err: unknown): void {
  // eslint-disable-next-line no-console -- sanctioned: warn before degrading
  console.error(`logger: ${reason}; falling back to console logging`, err);
  fileStream = null;
}

if (LOG_DIR) {
  const logFile = path.join(LOG_DIR, "flashkarte.log");
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    const stream = fs.createWriteStream(logFile, { flags: "a" });
    // Catch the deferred open() EACCES/ENOENT and any later write error (ENOSPC,
    // etc.) so they degrade gracefully instead of escalating to uncaughtException.
    stream.on("error", (err) => dropFileStream("log file write failed", err));
    fileStream = stream;
  } catch (err) {
    dropFileStream("failed to open log file", err);
  }
}

type Level = "info" | "warn" | "error";

const SENSITIVE_FIELD = /authorization|cookie|password|secret|token|api.?key/i;
const SENSITIVE_TEXT =
  /(bearer\s+)[^\s,]+|(fk_[A-Za-z0-9_-]+)|([?&](?:token|code|key)=[^&\s]+)/gi;
const MAX_LOG_TEXT_LENGTH = 2_000;

function redactText(value: string): string {
  const redacted = value.replace(SENSITIVE_TEXT, "$1[REDACTED]");
  return redacted.slice(0, MAX_LOG_TEXT_LENGTH);
}

function sanitizeMeta(meta: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(meta).map(([key, value]) => {
      if (SENSITIVE_FIELD.test(key)) return [key, "[REDACTED]"];
      if (typeof value === "string") return [key, redactText(value)];
      return [key, value];
    }),
  );
}

function write(
  level: Level,
  source: string,
  msg: string,
  meta?: Record<string, unknown>,
): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    source,
    correlationId: asyncLocalStorage.getStore(),
    msg,
    ...(meta ? sanitizeMeta(meta) : {}),
  });
  // eslint-disable-next-line no-console -- this is the sanctioned log sink
  (level === "error" ? console.error : console.log)(line);
  fileStream?.write(line + "\n");
}

export const logger = {
  info: (source: string, m: string, meta?: Record<string, unknown>) =>
    write("info", source, m, meta),
  warn: (source: string, m: string, meta?: Record<string, unknown>) =>
    write("warn", source, m, meta),
  error: (source: string, m: string, meta?: Record<string, unknown>) =>
    write("error", source, m, meta),

  /**
   * Run `fn` with the given correlation ID bound to this async context.
   * Used by the request-ID middleware so every log line during a request is
   * tagged with the same ID, enabling end-to-end dataflow tracing.
   */
  withCorrelationId: <T>(correlationId: string, fn: () => T): T =>
    asyncLocalStorage.run(correlationId, fn),
};

/** Read the correlation ID bound to the current async context (if any). */
export function getCorrelationId(): string | undefined {
  return asyncLocalStorage.getStore();
}
