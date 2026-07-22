import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "../../config/env";
import { ValidationError, AuthError } from "../../utils/errors";
import { parse, emailSchema, passwordSchema } from "../../utils/validate";
import {
  getAppUrl,
  sendEmailChangeVerification,
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "../../email/mailer";
import { withTransaction } from "../../db/client";
import { logger } from "../../utils/logger";
import { record, userActor } from "../audit/audit.service";
import * as twoFactor from "../account/twoFactor.service";
import * as repo from "./auth.repository";
import type { UserRow } from "./auth.repository";

const BCRYPT_ROUNDS = 12;

// A real bcrypt hash (same cost) to compare against when an account doesn't
// exist, equalizing login timing. Computed lazily so it isn't paid at startup.
let cachedDummyHash: string | null = null;
function dummyPasswordHash(): string {
  if (!cachedDummyHash) {
    cachedDummyHash = bcrypt.hashSync(
      "flashkarte-no-such-account",
      BCRYPT_ROUNDS,
    );
  }
  return cachedDummyHash;
}
export const ACCESS_TOKEN_TTL_SEC = 15 * 60;
// Sliding window: every refresh (issueTokens) re-issues a token expiring this
// many days out from *now*, so an actively-used session never dies — only
// REFRESH_TOKEN_TTL_DAYS of total inactivity logs the user out.
export const REFRESH_TOKEN_TTL_DAYS = 90;
const VERIFICATION_TOKEN_TTL_HOURS = 24;
const PASSWORD_RESET_TOKEN_TTL_HOURS = 1;
const EMAIL_CHANGE_TOKEN_TTL_HOURS = 24;
const verificationTokenSchema = z
  .string({ error: "Verification token is required" })
  .min(1, "Verification token is required");
const resetTokenSchema = z
  .string({ error: "Reset token is required" })
  .min(1, "Reset token is required");
const twoFactorChallengeSchema = z
  .string({ error: "Invalid or expired two-factor challenge" })
  .min(1, "Invalid or expired two-factor challenge");
const currentPasswordSchema = z.string({
  error: "Current password is required",
});
const forgotPasswordEmailSchema = z.preprocess(
  (emailInput) =>
    typeof emailInput === "string" ? emailInput.toLowerCase() : null,
  z.string().nullable(),
);

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
  language: string | null;
  twoFactorEnabled: boolean;
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
    language: row.language ?? null,
    twoFactorEnabled: row.two_factor_enabled ?? false,
  };
}

const SUPPORTED_LANGUAGES = ["en", "de", "fr", "es"] as const;
const profileUpdateSchema = z.object({
  displayName: z
    .string({ error: "Display name must be text" })
    .trim()
    .max(60, "Display name must be 60 characters or fewer")
    .optional(),
  language: z
    .enum(SUPPORTED_LANGUAGES, { error: "Unsupported language" })
    .optional(),
});

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
  const validatedCredentials = parse(credentialsSchema, {
    email,
    password,
  });
  return [validatedCredentials.email, validatedCredentials.password];
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
    logger.error("auth.signup", "Failed to send verification email", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
  return { user: toUser(user), accessToken, rawRefresh, persistent };
}

/** Confirm an email address from a verification-link token. */
export async function verifyEmail(rawToken: unknown): Promise<string> {
  const token = parse(verificationTokenSchema, rawToken);
  const found = await repo.findVerificationToken(hashToken(token));
  if (!found || found.expires_at < new Date()) {
    throw new ValidationError("This verification link is invalid or expired");
  }
  await repo.markEmailVerified(found.user_id);
  await repo.deleteVerificationTokensForUser(found.user_id);
  return found.user_id;
}

/** Re-send a verification email to the logged-in user (no-op if verified). */
export async function resendVerification(userId: string): Promise<void> {
  const user = await repo.findById(userId);
  if (!user) throw new AuthError("Not found");
  if (user.email_verified_at) return; // already verified
  await createAndSendVerification(user.id, user.email);
}

export async function requestEmailChange(
  userId: string,
  currentPasswordIn: unknown,
  newEmailIn: unknown,
): Promise<void> {
  const user = await repo.findByIdWithHash(userId);
  if (!user) throw new AuthError("Not found");
  const currentPassword = parse(currentPasswordSchema, currentPasswordIn);
  if (!(await bcrypt.compare(currentPassword, user.password_hash))) {
    throw new ValidationError("Current password is incorrect");
  }
  const newEmail = parse(emailSchema, newEmailIn);
  if (newEmail === user.email) {
    throw new ValidationError(
      "New email must be different from the current email",
    );
  }
  if (await repo.findByEmailWithHash(newEmail)) {
    throw new ValidationError("An account with this email already exists");
  }
  const rawToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(
    Date.now() + EMAIL_CHANGE_TOKEN_TTL_HOURS * 3600_000,
  );
  await repo.deleteEmailChangeTokensForUser(userId);
  await repo.insertEmailChangeToken(
    userId,
    newEmail,
    hashToken(rawToken),
    expiresAt,
  );
  await sendEmailChangeVerification(
    newEmail,
    `${getAppUrl()}/verify-email?changeToken=${rawToken}`,
  );
}

export async function confirmEmailChange(rawToken: unknown): Promise<string> {
  const token = parse(verificationTokenSchema, rawToken);
  const found = await repo.findEmailChangeToken(hashToken(token));
  if (!found || found.expires_at < new Date()) {
    throw new ValidationError("This email-change link is invalid or expired");
  }
  const user = await repo.updateEmail(found.user_id, found.new_email);
  if (!user) throw new AuthError("Not found");
  await repo.deleteEmailChangeTokensForUser(found.user_id);
  await repo.deleteRefreshTokensForUser(found.user_id);
  return found.user_id;
}

// Short-lived signed challenge binding the password step of a 2FA login to
// the code step. 90s is enough to type a code, short enough to be useless
// if it leaks.
const TWO_FACTOR_CHALLENGE_TTL_SEC = 90;
const TWO_FACTOR_CHALLENGE_PURPOSE = "2fa-challenge";

interface TwoFactorChallengePayload {
  sub: string;
  purpose: string;
}

function signTwoFactorChallenge(userId: string): string {
  return jwt.sign(
    {
      sub: userId,
      purpose: TWO_FACTOR_CHALLENGE_PURPOSE,
    } satisfies TwoFactorChallengePayload,
    getJwtSecret(),
    { algorithm: "HS256", expiresIn: TWO_FACTOR_CHALLENGE_TTL_SEC },
  );
}

function verifyTwoFactorChallenge(challenge: string): string {
  try {
    const payload = jwt.verify(challenge, getJwtSecret(), {
      algorithms: ["HS256"],
    }) as TwoFactorChallengePayload;
    if (payload.purpose !== TWO_FACTOR_CHALLENGE_PURPOSE) {
      throw new Error("wrong purpose");
    }
    return payload.sub;
  } catch {
    throw new AuthError("Invalid or expired two-factor challenge");
  }
}

export type LoginResult =
  | {
      requiresTwoFactor: true;
      challenge: string;
    }
  | {
      requiresTwoFactor?: false;
      user: PublicUser;
      accessToken: string;
      rawRefresh: string;
      persistent: boolean;
    };

export async function login(
  emailIn: unknown,
  passwordIn: unknown,
  rememberMeIn: unknown,
): Promise<LoginResult> {
  const [email, password] = validateCredentials(emailIn, passwordIn);
  const persistent = rememberMeIn === true;
  const row = await repo.findByEmailWithHash(email);
  // Always run a bcrypt comparison — against a real dummy hash when the account
  // doesn't exist — so login takes ~equal time whether or not the email is
  // registered. Short-circuiting on `!row` leaks account existence via response
  // timing (AUTH-004).
  const passwordOk = await bcrypt.compare(
    password,
    row?.password_hash ?? dummyPasswordHash(),
  );
  if (!row || !passwordOk) {
    throw new AuthError("Invalid email or password");
  }
  if (row.two_factor_enabled) {
    // Don't issue tokens yet — the password step only earns a short-lived
    // challenge; tokens come from completeTwoFactorLogin.
    return {
      requiresTwoFactor: true,
      challenge: signTwoFactorChallenge(row.id),
    };
  }
  const {
    accessToken,
    rawRefresh,
    persistent: p,
  } = await issueTokens(row.id, row.email, persistent);
  return { user: toUser(row), accessToken, rawRefresh, persistent: p };
}

/**
 * Second step of a 2FA login: exchange the challenge + a TOTP or one-time
 * backup code for real tokens.
 */
export async function completeTwoFactorLogin(
  challengeIn: unknown,
  codeIn: unknown,
  rememberMeIn: unknown,
) {
  let challenge: string;
  try {
    challenge = parse(twoFactorChallengeSchema, challengeIn);
  } catch {
    throw new AuthError("Invalid or expired two-factor challenge");
  }
  const userId = verifyTwoFactorChallenge(challenge);
  const kind = await twoFactor.verifyCode(userId, codeIn);
  if (!kind) throw new AuthError("Invalid two-factor code");
  const row = await repo.findById(userId);
  if (!row) throw new AuthError("Invalid or expired two-factor challenge");
  const persistent = rememberMeIn === true;
  const { accessToken, rawRefresh } = await issueTokens(
    row.id,
    row.email,
    persistent,
  );
  return {
    user: toUser(row),
    accessToken,
    rawRefresh,
    persistent,
    usedBackupCode: kind === "backup",
  };
}

export async function refresh(oldRawRefresh: string | undefined) {
  if (!oldRawRefresh) throw new AuthError("No refresh token");
  // Rotate atomically: the consumed token is deleted and returned in one
  // statement, so two concurrent refreshes (app + tab, or retried request)
  // can't both succeed off the same token. The loser gets zero rows here.
  const found = await repo.consumeRefreshToken(hashToken(oldRawRefresh));
  if (!found || found.expires_at < new Date()) {
    throw new AuthError("Invalid refresh token");
  }
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
  languageIn?: unknown,
): Promise<PublicUser> {
  const profile = parse(profileUpdateSchema, {
    displayName: displayNameIn,
    language: languageIn,
  });
  const user = await repo.updateProfileFields(
    userId,
    profile.displayName || null,
    profile.language,
  );
  if (!user) throw new AuthError("Not found");
  return toUser(user);
}

/**
 * Change the password of a logged-in user. Verifies the current password,
 * sets the new one, and terminates every other session while re-issuing a
 * fresh session for the acting device (so the caller stays signed in here but
 * anyone holding a stolen session elsewhere is kicked out).
 */
export async function changePassword(
  userId: string,
  currentPasswordIn: unknown,
  newPasswordIn: unknown,
) {
  const row = await repo.findByIdWithHash(userId);
  if (!row) throw new AuthError("Not found");

  const currentPassword = parse(currentPasswordSchema, currentPasswordIn);
  const currentOk = await bcrypt.compare(currentPassword, row.password_hash);
  if (!currentOk) {
    throw new ValidationError("Current password is incorrect");
  }

  const newPassword = parse(passwordSchema, newPasswordIn);
  if (newPassword === currentPassword) {
    throw new ValidationError(
      "New password must be different from the current one",
    );
  }

  const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await repo.updatePasswordHash(userId, hash);
  // Invalidate every existing session, then mint a fresh one for this device.
  await repo.deleteRefreshTokensForUser(userId);
  const { accessToken, rawRefresh, persistent } = await issueTokens(
    row.id,
    row.email,
    true,
  );
  return { user: toUser(row), accessToken, rawRefresh, persistent };
}

/**
 * Delete the calling user's account. Re-authenticates with the current
 * password, writes an audit entry inside the same transaction, then deletes
 * the user row (FK cascades clean up all owned data except review_events,
 * which has no FK). The audit row survives — it's append-only — so a record
 * of who/when remains without PII (before_state is null).
 */
export async function deleteAccount(
  userId: string,
  currentPasswordIn: unknown,
): Promise<void> {
  const row = await repo.findByIdWithHash(userId);
  if (!row) throw new AuthError("Not found");

  const currentPassword = parse(currentPasswordSchema, currentPasswordIn);
  const currentOk = await bcrypt.compare(currentPassword, row.password_hash);
  if (!currentOk) {
    throw new ValidationError("Current password is incorrect");
  }

  await withTransaction(async (client) => {
    await record(
      {
        actor: userActor(userId),
        action: "account.deleted",
        targetType: "user",
        targetId: userId,
      },
      client,
    );
    await repo.deleteUserAccount(userId, client);
  });
}

function sendPasswordResetInBackground(email: string, link: string): void {
  void sendPasswordResetEmail(email, link).catch((error) => {
    logger.error("auth.forgotPassword", "Failed to send password reset email", {
      error: error instanceof Error ? error.message : String(error),
    });
  });
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

  const email = parse(forgotPasswordEmailSchema, emailIn);
  if (email === null) return;
  const user = await repo.findByEmailWithHash(email);
  if (!user) return; // unknown email — succeed silently

  try {
    await repo.deletePasswordResetTokensForUser(user.id);
    await repo.insertPasswordResetToken(user.id, tokenHash, expiresAt);
    const link = `${getAppUrl()}/reset-password?token=${rawToken}`;
    sendPasswordResetInBackground(user.email, link);
  } catch (error) {
    logger.error("auth.forgotPassword", "Failed to prepare password reset", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/** Complete a password reset from a reset-link token. Single-use. */
export async function resetPassword(
  rawToken: unknown,
  passwordIn: unknown,
): Promise<string> {
  const token = parse(resetTokenSchema, rawToken);
  const password = parse(passwordSchema, passwordIn);
  const found = await repo.findPasswordResetToken(hashToken(token));
  if (!found || found.expires_at < new Date()) {
    throw new ValidationError("This reset link is invalid or expired");
  }
  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await repo.updatePasswordHash(found.user_id, hash);
  await repo.deletePasswordResetTokensForUser(found.user_id); // single-use
  await repo.deleteRefreshTokensForUser(found.user_id); // invalidate sessions
  return found.user_id;
}
