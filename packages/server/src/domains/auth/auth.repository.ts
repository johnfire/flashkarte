import type { PoolClient } from "pg";
import { query, queryOne } from "../../db/client";

export interface UserRow {
  id: string;
  email: string;
  role: string;
  account_type: string;
  email_verified_at: Date | null;
  display_name: string | null;
  language: string | null;
  two_factor_enabled: boolean;
  speech_enabled: boolean;
  speech_lang: string | null;
  speech_autoplay: string;
  speech_rate: number;
}

interface UserWithHash extends UserRow {
  password_hash: string;
}

const USER_COLS =
  "id, email, role, account_type, email_verified_at, display_name, language, two_factor_enabled, " +
  "speech_enabled, speech_lang, speech_autoplay, speech_rate";

export function findByEmailWithHash(email: string) {
  return queryOne<UserWithHash>(
    `SELECT ${USER_COLS}, password_hash FROM users WHERE email = $1`,
    [email],
  );
}

export function findById(id: string) {
  return queryOne<UserRow>(`SELECT ${USER_COLS} FROM users WHERE id = $1`, [
    id,
  ]);
}

export function findByIdWithHash(id: string) {
  return queryOne<UserWithHash>(
    `SELECT ${USER_COLS}, password_hash FROM users WHERE id = $1`,
    [id],
  );
}

export function createUser(email: string, passwordHash: string) {
  return queryOne<UserRow>(
    `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING ${USER_COLS}`,
    [email, passwordHash],
  );
}

/** Editable profile columns. Absent keys are left untouched by the UPDATE. */
export interface ProfilePatch {
  display_name?: string | null;
  language?: string | null;
  speech_enabled?: boolean;
  speech_lang?: string | null;
  speech_autoplay?: string;
  speech_rate?: number;
}

const PROFILE_PATCH_COLS = [
  "display_name",
  "language",
  "speech_enabled",
  "speech_lang",
  "speech_autoplay",
  "speech_rate",
] as const;

/**
 * Update only the profile columns the caller actually sent.
 *
 * Whitelist-driven rather than a fixed column list: the previous fixed form
 * always wrote `display_name`, so a language-only PATCH (which is what the UI
 * language switcher sends) silently cleared the user's display name. Absent
 * now means "leave alone"; only an explicit null clears a field.
 */
export function updateProfileFields(userId: string, patch: ProfilePatch) {
  const columns = PROFILE_PATCH_COLS.filter((col) => patch[col] !== undefined);
  if (columns.length === 0) return findById(userId);
  const assignments = columns.map((col, idx) => `${col} = $${idx + 2}`);
  return queryOne<UserRow>(
    `UPDATE users SET ${assignments.join(", ")}, updated_at = now()
     WHERE id = $1 RETURNING ${USER_COLS}`,
    [userId, ...columns.map((col) => patch[col] ?? null)],
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

// --- Verified email changes ---

export function insertEmailChangeToken(
  userId: string,
  newEmail: string,
  tokenHash: string,
  expiresAt: Date,
) {
  return query(
    `INSERT INTO email_change_tokens (user_id, new_email, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [userId, newEmail, tokenHash, expiresAt],
  );
}

export function findEmailChangeToken(tokenHash: string) {
  return queryOne<{ user_id: string; new_email: string; expires_at: Date }>(
    "SELECT user_id, new_email, expires_at FROM email_change_tokens WHERE token_hash = $1",
    [tokenHash],
  );
}

export function deleteEmailChangeTokensForUser(userId: string) {
  return query("DELETE FROM email_change_tokens WHERE user_id = $1", [userId]);
}

export function updateEmail(userId: string, email: string) {
  return queryOne<UserRow>(
    `UPDATE users
     SET email = $2, email_verified_at = now(), updated_at = now()
     WHERE id = $1
     RETURNING ${USER_COLS}`,
    [userId, email],
  );
}

export function storeRefreshToken(
  userId: string,
  tokenHash: string,
  expiresAt: Date,
  persistent: boolean,
) {
  return query(
    "INSERT INTO refresh_tokens (user_id, token_hash, expires_at, persistent) VALUES ($1, $2, $3, $4)",
    [userId, tokenHash, expiresAt, persistent],
  );
}

/**
 * Atomically delete a refresh token and return its row. Used for rotation:
 * doing the lookup and delete in one statement means two concurrent refreshes
 * can't both consume the same token (only one DELETE returns a row).
 */
export function consumeRefreshToken(tokenHash: string) {
  return queryOne<{ user_id: string; expires_at: Date; persistent: boolean }>(
    `DELETE FROM refresh_tokens WHERE token_hash = $1
     RETURNING user_id, expires_at, persistent`,
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

// Two separate statements: pg runs parameterized queries as prepared
// statements, which allow exactly one command each — a multi-statement
// string with $1 throws at runtime. review_events has no FK to users
// (see 008), so it must be cleaned up explicitly before the user row.
export async function deleteUserAccount(
  userId: string,
  client?: PoolClient,
): Promise<void> {
  const run = client
    ? (sql: string) => client.query(sql, [userId])
    : (sql: string) => query(sql, [userId]);
  await run("DELETE FROM review_events WHERE user_id = $1");
  await run("DELETE FROM users WHERE id = $1");
}
