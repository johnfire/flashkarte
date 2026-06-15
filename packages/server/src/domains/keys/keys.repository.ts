import { query, queryOne } from "../../db/client";

export interface ApiKeyRow {
  name: string;
  key_prefix: string;
  created_at: string;
}

export function insertApiKey(
  keyHash: string,
  userId: string,
  name: string,
  keyPrefix: string,
  scope: string,
) {
  return queryOne<ApiKeyRow>(
    `INSERT INTO user_api_keys (key_hash, user_id, name, key_prefix, scope)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING name, key_prefix, created_at`,
    [keyHash, userId, name, keyPrefix, scope],
  );
}

export function listApiKeys(userId: string) {
  return query<ApiKeyRow>(
    `SELECT name, key_prefix, created_at FROM user_api_keys
     WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId],
  );
}

export function deleteApiKey(userId: string, keyPrefix: string) {
  return queryOne<{ key_prefix: string }>(
    `DELETE FROM user_api_keys WHERE user_id = $1 AND key_prefix = $2
     RETURNING key_prefix`,
    [userId, keyPrefix],
  );
}

export function findUserByKeyHash(keyHash: string) {
  return queryOne<{ user_id: string; scope: string }>(
    "SELECT user_id, scope FROM user_api_keys WHERE key_hash = $1",
    [keyHash],
  );
}
