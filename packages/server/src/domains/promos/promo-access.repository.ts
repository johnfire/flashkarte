import type { Queryable } from "../../db/queryable";

export async function findPromoAccessEnd(
  db: Queryable,
  userId: string,
): Promise<string | null> {
  const access = await db.query<{ access_expires_at: Date }>(
    `SELECT access_expires_at FROM signup_promo_activations
     WHERE user_id = $1 AND access_expires_at > now()`,
    [userId],
  );
  return access.rows[0]?.access_expires_at.toISOString() ?? null;
}
