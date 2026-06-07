import bcrypt from "bcryptjs";
import { z } from "zod";
import { ValidationError, NotFoundError } from "../../utils/errors";
import { parse, emailSchema, passwordSchema } from "../../utils/validate";
import * as repo from "./admin.repository";
import type { AdminUserRow } from "./admin.repository";
import * as decksRepo from "../decks/decks.repository";

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

const accountTypeSchema = z.enum(ACCOUNT_TYPES, {
  error: `Account type must be one of: ${ACCOUNT_TYPES.join(", ")}`,
});

function validateAccountType(value: unknown): AccountType {
  return parse(accountTypeSchema, value);
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
  const email = parse(emailSchema, emailIn);
  const password = parse(passwordSchema, passwordIn);
  const accountType = validateAccountType(accountTypeIn ?? "free");

  if (await repo.findByEmail(email)) {
    throw new ValidationError("An account with this email already exists");
  }
  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
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

/** Moderation: remove any deck from the public library. */
export async function unpublishDeck(id: string): Promise<void> {
  const deck = await decksRepo.adminUnpublish(id);
  if (!deck) throw new NotFoundError("Deck not found");
}
