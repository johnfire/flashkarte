import fs from "fs";
import path from "path";
import { Pool } from "pg";
import { getPool } from "./client";

export async function runMigrations(pool: Pool = getPool()): Promise<void> {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS _migrations (
       name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`,
  );
  const dir = path.join(__dirname, "migrations");
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const done = await pool.query("SELECT 1 FROM _migrations WHERE name = $1", [
      file,
    ]);
    if (done.rowCount) continue;
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    await pool.query(sql);
    await pool.query("INSERT INTO _migrations(name) VALUES ($1)", [file]);
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error(err);
      process.exit(1);
    });
}
