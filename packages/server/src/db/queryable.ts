import type { QueryResultRow } from "pg";

/**
 * Anything that can run a query: the pool, or a client inside a transaction.
 * Repository functions take one so the same function works inside or outside
 * a transaction.
 */
export interface Queryable {
  query<T extends QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<{ rows: T[]; rowCount: number | null }>;
}
