import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "../../config/env";
import { ValidationError, AuthError } from "../../utils/errors";
import { parse, emailSchema, passwordSchema } from "../../utils/validate";
import {
  getAppUrl,
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "../../email/mailer";
import * as repo from "./auth.repository";
import type { UserRow } from "./auth.repository";

const BCRYPT_ROUNDS = 12;
export const ACCESS_TOKEN_TTL_SEC = 15 * 60;
const REFRESH_TOKEN_TTL_DAYS = 30;
const VERIFICATION_TOKEN_TTL_HOURS = 24;
const PASSWORD_RESET_TOKEN_TTL_HOURS = 1;

export interface JwtPayload {
  sub: string;
  email: string;
}

export interface PublicUser {
  id: string;
  email: string;
  role: string;
  accountType: string;
  emailVerifiedAt: string | null;
  displayName: string | null;
}

function toUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    accountType: row.account_type,
    emailVerifiedAt: row.email_verified_at
      ? new Date(row.email_verified_at).toISOString()
      : null,
    displayName: row.display_name ?? null,
  };
}

// Create a fresh verification token (replacing any prior ones) and email the
// link. Best-effort at call sites: a mail failure must not break signup.
async function createAndSendVerification(
  userId: string,
  email: string,
): Promise<void> {
  await repo.deleteVerificationTokensForUser(userId);
  const rawToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(
    Date.now() + VERIFICATION_TOKEN_TTL_HOURS * 3600_000,
  );
  await repo.insertVerificationToken(userId, hashToken(rawToken), expiresAt);
  const link = `${getAppUrl()}/verify-email?token=${rawToken}`;
  await sendVerificationEmail(email, link);
}

function signAccessToken(userId: string, email: string): string {
  return jwt.sign({ sub: userId, email } satisfies JwtPayload, getJwtSecret(), {
    algorithm: "HS256",
    expiresIn: ACCESS_TOKEN_TTL_SEC,
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  try {
    // Pin the algorithm so a token can't be verified under a different scheme
    // (defense against algorithm-confusion attacks).
    return jwt.verify(token, getJwtSecret(), {
      algorithms: ["HS256"],
    }) as JwtPayload;
  } catch {
    throw new AuthError("Invalid or expired token");
  }
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function issueTokens(userId: string, email: string, persistent: boolean) {
  const accessToken = signAccessToken(userId, email);
  const rawRefresh = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 86400_000);
  await repo.storeRefreshToken(
    userId,
    hashToken(rawRefresh),
    expiresAt,
    persistent,
  );
  return { accessToken, rawRefresh, persistent };
}

const credentialsSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

function validateCredentials(
  email: unknown,
  password: unknown,
): [string, string] {
  const { email: e, password: p } = parse(credentialsSchema, {
    email,
    password,
  });
  return [e, p];
}

export async function signup(emailIn: unknown, passwordIn: unknown) {
  const [email, password] = validateCredentials(emailIn, passwordIn);
  const existing = await repo.findByEmailWithHash(email);
  if (existing) {
    throw new ValidationError("An account with this email already exists");
  }
  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await repo.createUser(email, hash);
  if (!user) throw new Error("Failed to create user");
  const { accessToken, rawRefresh, persistent } = await issueTokens(
    user.id,
    user.email,
    true,
  );
  // Best-effort: don't fail signup if the verification email can't be sent.
  try {
    await createAndSendVerification(user.id, user.email);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to send verification email on signup:", err);
  }
  return { user: toUser(user), accessToken, rawRefresh, persistent };
}

/** Confirm an email address from a verification-link token. */
export async function verifyEmail(rawToken: unknown): Promise<void> {
  if (typeof rawToken !== "string" || !rawToken) {
    throw new ValidationError("Verification token is required");
  }
  const found = await repo.findVerificationToken(hashToken(rawToken));
  if (!found || found.expires_at < new Date()) {
    throw new ValidationError("This verification link is invalid or expired");
  }
  await repo.markEmailVerified(found.user_id);
  await repo.deleteVerificationTokensForUser(found.user_id);
}

/** Re-send a verification email to the logged-in user (no-op if verified). */
export async function resendVerification(userId: string): Promise<void> {
  const user = await repo.findById(userId);
  if (!user) throw new AuthError("Not found");
  if (user.email_verified_at) return; // already verified
  await createAndSendVerification(user.id, user.email);
}

export async function login(
  emailIn: unknown,
  passwordIn: unknown,
  rememberMeIn: unknown,
) {
  const [email, password] = validateCredentials(emailIn, passwordIn);
  const persistent = rememberMeIn === true;
  const row = await repo.findByEmailWithHash(email);
  if (!row || !(await bcrypt.compare(password, row.password_hash))) {
    throw new AuthError("Invalid email or password");
  }
  const {
    accessToken,
    rawRefresh,
    persistent: p,
  } = await issueTokens(row.id, row.email, persistent);
  return { user: toUser(row), accessToken, rawRefresh, persistent: p };
}

export async function refresh(oldRawRefresh: string | undefined) {
  if (!oldRawRefresh) throw new AuthError("No refresh token");
  const found = await repo.findRefreshToken(hashToken(oldRawRefresh));
  if (!found || found.expires_at < new Date()) {
    throw new AuthError("Invalid refresh token");
  }
  // Rotate: delete the consumed token before issuing a new one.
  // A replayed rotated-away token will fail findRefreshToken above.
  await repo.deleteRefreshToken(hashToken(oldRawRefresh));
  const user = await repo.findById(found.user_id);
  if (!user) throw new AuthError("Invalid refresh token");
  const { accessToken, rawRefresh, persistent } = await issueTokens(
    user.id,
    user.email,
    found.persistent,
  );
  return { accessToken, rawRefresh, persistent };
}

export async function logout(rawRefresh: string | undefined) {
  if (rawRefresh) await repo.deleteRefreshToken(hashToken(rawRefresh));
}

/** The current user's public profile (for restoring session state). */
export async function getCurrentUser(userId: string): Promise<PublicUser> {
  const user = await repo.findById(userId);
  if (!user) throw new AuthError("Not found");
  return toUser(user);
}

/** Update the caller's editable profile fields (currently display name). */
export async function updateProfile(
  userId: string,
  displayNameIn: unknown,
): Promise<PublicUser> {
  if (displayNameIn !== undefined && typeof displayNameIn !== "string") {
    throw new ValidationError("Display name must be text");
  }
  const trimmed = typeof displayNameIn === "string" ? displayNameIn.trim() : "";
  if (trimmed.length > 60) {
    throw new ValidationError("Display name must be 60 characters or fewer");
  }
  const user = await repo.updateDisplayName(userId, trimmed || null);
  if (!user) throw new AuthError("Not found");
  return toUser(user);
}

/**
 * Start a password reset. Always resolves the same way whether or not the
 * email belongs to an account (no account enumeration).
 */
export async function forgotPassword(emailIn: unknown): Promise<void> {
  // Generate token upfront so both paths do equivalent crypto work — partial
  // normalization against account-enumeration via response-time oracle.
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(
    Date.now() + PASSWORD_RESET_TOKEN_TTL_HOURS * 3600_000,
  );

  if (typeof emailIn !== "string") return;
  const email = emailIn.toLowerCase();
  const user = await repo.findByEmailWithHash(email);
  if (!user) return; // unknown email — succeed silently

  try {
    await repo.deletePasswordResetTokensForUser(user.id);
    await repo.insertPasswordResetToken(user.id, tokenHash, expiresAt);
    const link = `${getAppUrl()}/reset-password?token=${rawToken}`;
    await sendPasswordResetEmail(user.email, link);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to send password reset email:", err);
  }
}

/** Complete a password reset from a reset-link token. Single-use. */
export async function resetPassword(
  rawToken: unknown,
  passwordIn: unknown,
): Promise<void> {
  if (typeof rawToken !== "string" || !rawToken) {
    throw new ValidationError("Reset token is required");
  }
  const password = parse(passwordSchema, passwordIn);
  const found = await repo.findPasswordResetToken(hashToken(rawToken));
  if (!found || found.expires_at < new Date()) {
    throw new ValidationError("This reset link is invalid or expired");
  }
  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await repo.updatePasswordHash(found.user_id, hash);
  await repo.deletePasswordResetTokensForUser(found.user_id); // single-use
  await repo.deleteRefreshTokensForUser(found.user_id); // invalidate sessions
}
