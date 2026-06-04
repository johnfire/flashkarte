import "dotenv/config";
import { validateEnv } from "./config/env";
import { createApp } from "./app";
import { getPool } from "./db/client";
import { runMigrations } from "./db/migrate";
import { logger } from "./utils/logger";

const env = validateEnv();

process.on("uncaughtException", (err) => {
  logger.error("uncaughtException", { message: err.message, stack: err.stack });
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  const err = reason instanceof Error ? reason : undefined;
  logger.error("unhandledRejection", {
    message: err?.message ?? String(reason),
    stack: err?.stack,
  });
});

async function start() {
  const pool = getPool();
  await pool.query("SELECT 1");
  await runMigrations(pool);
  createApp().listen(env.PORT, () =>
    logger.info(`flashkarte server on ${env.PORT} (${env.NODE_ENV})`),
  );
}

start();
