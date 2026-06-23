import fs from "fs";
import path from "path";

const LOG_DIR = process.env.LOG_DIR;
let fileStream: fs.WriteStream | null = null;

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
function write(level: Level, msg: string, meta?: Record<string, unknown>) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    msg,
    ...(meta ?? {}),
  });
  // eslint-disable-next-line no-console -- this is the sanctioned log sink
  (level === "error" ? console.error : console.log)(line);
  fileStream?.write(line + "\n");
}

export const logger = {
  info: (m: string, meta?: Record<string, unknown>) => write("info", m, meta),
  warn: (m: string, meta?: Record<string, unknown>) => write("warn", m, meta),
  error: (m: string, meta?: Record<string, unknown>) => write("error", m, meta),
};
