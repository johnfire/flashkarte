import { query, queryOne } from "../../db/client";

export interface UserRow {
  id: string;
  email: string;
  role: string;
}

interface UserWithHash extends UserRow {
  password_hash: string;
}

export function findByEmailWithHash(email: string) {
  return queryOne<UserWithHash>(
    "SELECT id, email, role, password_hash FROM users WHERE email = $1",
    [email],
  );
}

export function createUser(email: string, passwordHash: string) {
  return queryOne<UserRow>(
    "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, role",
    [email, passwordHash],
  );
}

export function storeRefreshToken(
  userId: string,
  tokenHash: string,
  expiresAt: Date,
) {
  return query(
    "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
    [userId, tokenHash, expiresAt],
  );
}

export function findRefreshToken(tokenHash: string) {
  return queryOne<{ user_id: string; expires_at: Date }>(
    "SELECT user_id, expires_at FROM refresh_tokens WHERE token_hash = $1",
    [tokenHash],
  );
}

export function deleteRefreshToken(tokenHash: string) {
  return query("DELETE FROM refresh_tokens WHERE token_hash = $1", [tokenHash]);
}
