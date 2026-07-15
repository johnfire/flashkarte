import "dotenv/config";
import { validateEnv } from "./config/env";
import { createApp } from "./app";
import { getPool } from "./db/client";
import { runMigrations } from "./db/migrate";
import { bootstrapAdmins } from "./db/bootstrap";
import { logger } from "./utils/logger";

const env = validateEnv();

// Filesystem errors from the logging layer (e.g. an unwritable LOG_DIR) must
// never take the service down — the logger degrades to console on its own, so
// here we log and keep running instead of exiting.
const LOGGING_FS_ERROR_CODES = new Set(["EACCES", "ENOENT", "ENOSPC", "EROFS"]);
function isLoggingFsError(err: Error): boolean {
  return LOGGING_FS_ERROR_CODES.has((err as { code?: string }).code ?? "");
}

process.on("uncaughtException", (err) => {
  logger.error("server", "uncaughtException", {
    message: err.message,
    stack: err.stack,
  });
  if (isLoggingFsError(err)) return;
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  const err = reason instanceof Error ? reason : undefined;
  logger.error("server", "unhandledRejection", {
    message: err?.message ?? String(reason),
    stack: err?.stack,
  });
});

async function start() {
  const pool = getPool();
  await pool.query("SELECT 1");
  await runMigrations(pool);
  await bootstrapAdmins(pool);
  createApp().listen(env.PORT, () =>
    logger.info("server", `flashkarte server on ${env.PORT} (${env.NODE_ENV})`),
  );
}

start().catch((err) => {
  logger.error("server", "startup failed", {
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });
  process.exit(1);
});
