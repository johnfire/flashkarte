import fs from "fs";
import path from "path";

const LOG_DIR = process.env.LOG_DIR;
let fileStream: fs.WriteStream | null = null;
if (LOG_DIR) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    fileStream = fs.createWriteStream(path.join(LOG_DIR, "flashkarte.log"), {
      flags: "a",
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("logger: failed to open log file", err);
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
