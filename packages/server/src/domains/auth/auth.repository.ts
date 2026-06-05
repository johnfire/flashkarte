import { query, queryOne } from "../../db/client";

export interface UserRow {
  id: string;
  email: string;
  role: string;
  email_verified_at: Date | null;
}

interface UserWithHash extends UserRow {
  password_hash: string;
}

export function findByEmailWithHash(email: string) {
  return queryOne<UserWithHash>(
    "SELECT id, email, role, email_verified_at, password_hash FROM users WHERE email = $1",
    [email],
  );
}

export function findById(id: string) {
  return queryOne<UserRow>(
    "SELECT id, email, role, email_verified_at FROM users WHERE id = $1",
    [id],
  );
}

export function createUser(email: string, passwordHash: string) {
  return queryOne<UserRow>(
    "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, role, email_verified_at",
    [email, passwordHash],
  );
}

// --- Email verification tokens (#4) ---

export function insertVerificationToken(
  userId: string,
  tokenHash: string,
  expiresAt: Date,
) {
  return query(
    "INSERT INTO email_verification_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
    [userId, tokenHash, expiresAt],
  );
}

export function findVerificationToken(tokenHash: string) {
  return queryOne<{ user_id: string; expires_at: Date }>(
    "SELECT user_id, expires_at FROM email_verification_tokens WHERE token_hash = $1",
    [tokenHash],
  );
}

export function deleteVerificationTokensForUser(userId: string) {
  return query("DELETE FROM email_verification_tokens WHERE user_id = $1", [
    userId,
  ]);
}

export function markEmailVerified(userId: string) {
  return query(
    "UPDATE users SET email_verified_at = now(), updated_at = now() WHERE id = $1 AND email_verified_at IS NULL",
    [userId],
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

export function deleteRefreshTokensForUser(userId: string) {
  return query("DELETE FROM refresh_tokens WHERE user_id = $1", [userId]);
}

// --- Password reset tokens (#5) ---

export function updatePasswordHash(userId: string, passwordHash: string) {
  return query(
    "UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1",
    [userId, passwordHash],
  );
}

export function insertPasswordResetToken(
  userId: string,
  tokenHash: string,
  expiresAt: Date,
) {
  return query(
    "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
    [userId, tokenHash, expiresAt],
  );
}

export function findPasswordResetToken(tokenHash: string) {
  return queryOne<{ user_id: string; expires_at: Date }>(
    "SELECT user_id, expires_at FROM password_reset_tokens WHERE token_hash = $1",
    [tokenHash],
  );
}

export function deletePasswordResetTokensForUser(userId: string) {
  return query("DELETE FROM password_reset_tokens WHERE user_id = $1", [
    userId,
  ]);
}
