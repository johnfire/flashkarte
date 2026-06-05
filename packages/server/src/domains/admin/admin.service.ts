import bcrypt from "bcryptjs";
import { ValidationError, NotFoundError } from "../../utils/errors";
import * as repo from "./admin.repository";
import type { AdminUserRow } from "./admin.repository";

const BCRYPT_ROUNDS = 12;

export const ACCOUNT_TYPES = ["free", "paid", "admin-gifted", "admin"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  accountType: string;
  emailVerifiedAt: string | null;
  createdAt: string;
}

function toAdminUser(row: AdminUserRow): AdminUser {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    accountType: row.account_type,
    emailVerifiedAt: row.email_verified_at
      ? new Date(row.email_verified_at).toISOString()
      : null,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

function validateAccountType(value: unknown): AccountType {
  if (
    typeof value !== "string" ||
    !ACCOUNT_TYPES.includes(value as AccountType)
  ) {
    throw new ValidationError(
      `Account type must be one of: ${ACCOUNT_TYPES.join(", ")}`,
    );
  }
  return value as AccountType;
}

export async function listUsers(): Promise<AdminUser[]> {
  const rows = await repo.listUsers();
  return rows.map(toAdminUser);
}

/** Create a user directly. Admin-created accounts are auto-verified. */
export async function createUser(
  emailIn: unknown,
  passwordIn: unknown,
  accountTypeIn: unknown,
): Promise<AdminUser> {
  if (
    typeof emailIn !== "string" ||
    !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailIn)
  ) {
    throw new ValidationError("A valid email is required");
  }
  if (typeof passwordIn !== "string" || passwordIn.length < 8) {
    throw new ValidationError("Password must be at least 8 characters");
  }
  const accountType = validateAccountType(accountTypeIn ?? "free");
  const email = emailIn.toLowerCase();

  if (await repo.findByEmail(email)) {
    throw new ValidationError("An account with this email already exists");
  }
  const hash = await bcrypt.hash(passwordIn, BCRYPT_ROUNDS);
  const user = await repo.createUser(email, hash, accountType, true);
  if (!user) throw new Error("Failed to create user");
  return toAdminUser(user);
}

export async function setAccountType(
  id: string,
  accountTypeIn: unknown,
): Promise<AdminUser> {
  const accountType = validateAccountType(accountTypeIn);
  const user = await repo.updateAccountType(id, accountType);
  if (!user) throw new NotFoundError("User not found");
  return toAdminUser(user);
}
