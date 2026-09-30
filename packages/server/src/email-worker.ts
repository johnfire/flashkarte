import "dotenv/config";
import { runMigrations } from "./db/migrate";
import { getPool } from "./db/client";
import { runEmailWorker } from "./domains/email/email.service";
import { logger } from "./utils/logger";

async function start(): Promise<void> {
  await getPool().query("SELECT 1");
  await runMigrations();
  logger.info("email-worker", "email delivery worker started");
  await runEmailWorker();
}

start().catch((error: unknown) => {
  logger.error("email-worker", "email delivery worker stopped", {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  process.exit(1);
});
