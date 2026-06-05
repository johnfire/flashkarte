import { query, queryOne } from "../../db/client";

export interface AdminUserRow {
  id: string;
  email: string;
  role: string;
  account_type: string;
  email_verified_at: Date | null;
  created_at: Date;
}

const COLS = "id, email, role, account_type, email_verified_at, created_at";

export function listUsers() {
  return query<AdminUserRow>(
    `SELECT ${COLS} FROM users ORDER BY created_at DESC`,
  );
}

export function findByEmail(email: string) {
  return queryOne<{ id: string }>("SELECT id FROM users WHERE email = $1", [
    email,
  ]);
}

export function createUser(
  email: string,
  passwordHash: string,
  accountType: string,
  verified: boolean,
) {
  return queryOne<AdminUserRow>(
    `INSERT INTO users (email, password_hash, account_type, email_verified_at)
     VALUES ($1, $2, $3, $4) RETURNING ${COLS}`,
    [email, passwordHash, accountType, verified ? new Date() : null],
  );
}

export function updateAccountType(id: string, accountType: string) {
  return queryOne<AdminUserRow>(
    `UPDATE users SET account_type = $2, updated_at = now() WHERE id = $1 RETURNING ${COLS}`,
    [id, accountType],
  );
}
