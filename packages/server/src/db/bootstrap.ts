import { Pool } from "pg";
import { logger } from "../utils/logger";

/**
 * Promote any accounts listed in ADMIN_EMAILS (comma-separated) to
 * account_type='admin'. Idempotent and safe: no-ops for emails without an
 * account and for accounts that are already admins. Runs on every startup so
 * the owner account always retains admin even after a DB restore.
 */
export async function bootstrapAdmins(pool: Pool): Promise<void> {
  const raw = process.env.ADMIN_EMAILS;
  if (!raw) return;
  const emails = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  for (const email of emails) {
    const res = await pool.query(
      "UPDATE users SET account_type = 'admin', updated_at = now() WHERE email = $1 AND account_type <> 'admin' RETURNING id",
      [email],
    );
    if (res.rowCount && res.rowCount > 0) {
      logger.info("db.bootstrap", `Bootstrapped admin: ${email}`);
    }
  }
}
