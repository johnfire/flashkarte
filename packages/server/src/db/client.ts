import { Pool, PoolClient, QueryResultRow } from "pg";

let pool: Pool | null = null;

function dbPassword(): string | undefined {
  const pw = process.env.POSTGRES_PASSWORD;
  if (pw) return pw;
  // Never silently connect with a well-known default password in production —
  // fail closed. (server.ts also requires POSTGRES_PASSWORD via validateEnv.)
  if ((process.env.NODE_ENV ?? "development") === "production") {
    throw new Error("POSTGRES_PASSWORD must be set in production");
  }
  return "flashkarte"; // local dev default only
}

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.POSTGRES_HOST ?? "localhost",
      port: parseInt(process.env.POSTGRES_PORT ?? "5432", 10),
      database: process.env.POSTGRES_DB ?? "flashkarte",
      user: process.env.POSTGRES_USER ?? "flashkarte",
      password: dbPassword(),
    });
  }
  return pool;
}

export async function query<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const res = await getPool().query<T>(text, params);
  return res.rows;
}

export async function queryOne<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/**
 * Run `fn` inside a single transaction on one pooled client. Commits on success,
 * rolls back on any throw, and always releases the client.
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
