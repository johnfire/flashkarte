import { Pool, QueryResultRow } from "pg";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.POSTGRES_HOST ?? "localhost",
      port: parseInt(process.env.POSTGRES_PORT ?? "5432", 10),
      database: process.env.POSTGRES_DB ?? "flashkarte",
      user: process.env.POSTGRES_USER ?? "flashkarte",
      password: process.env.POSTGRES_PASSWORD ?? "flashkarte",
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

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
