import { Request, Response } from "express";
import { wrapAsync } from "../../utils/wrapAsync";
import { record, userActor } from "../audit/audit.service";
import * as service from "./auth.service";

const REFRESH_COOKIE = "fk_refresh";

function cookieOpts(persistent: boolean) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    // Persistent sessions survive browser restarts; session cookies don't.
    // Matches the server-side refresh token TTL so the cookie doesn't die
    // client-side before the token it carries would.
    ...(persistent
      ? { maxAge: service.REFRESH_TOKEN_TTL_DAYS * 86400_000 }
      : {}),
    path: "/api/auth",
  };
}

export const signup = wrapAsync(async (req: Request, res: Response) => {
  const { user, accessToken, rawRefresh, persistent } = await service.signup(
    req.body.email,
    req.body.password,
  );
  await record({
    actor: userActor(user.id),
    action: "account.created",
    targetType: "user",
    targetId: user.id,
    afterState: { email: user.email },
  });
  res.cookie(REFRESH_COOKIE, rawRefresh, cookieOpts(persistent));
  res
    .status(201)
    .json({ user, accessToken, expiresIn: service.ACCESS_TOKEN_TTL_SEC });
});

export const login = wrapAsync(async (req: Request, res: Response) => {
  const result = await service.login(
    req.body.email,
    req.body.password,
    req.body.rememberMe,
  );
  if (result.requiresTwoFactor) {
    // Password verified but no session yet — the client must present a
    // TOTP/backup code with this challenge at /auth/2fa/verify.
    res.json({ requiresTwoFactor: true, challenge: result.challenge });
    return;
  }
  const { user, accessToken, rawRefresh, persistent } = result;
  res.cookie(REFRESH_COOKIE, rawRefresh, cookieOpts(persistent));
  res.json({ user, accessToken, expiresIn: service.ACCESS_TOKEN_TTL_SEC });
});

export const twoFactorLogin = wrapAsync(async (req: Request, res: Response) => {
  const { user, accessToken, rawRefresh, persistent, usedBackupCode } =
    await service.completeTwoFactorLogin(
      req.body.challenge,
      req.body.code,
      req.body.rememberMe,
    );
  if (usedBackupCode) {
    await record({
      actor: userActor(user.id),
      action: "2fa.backup_code_used",
      targetType: "user",
      targetId: user.id,
    });
  }
  res.cookie(REFRESH_COOKIE, rawRefresh, cookieOpts(persistent));
  res.json({ user, accessToken, expiresIn: service.ACCESS_TOKEN_TTL_SEC });
});

export const refresh = wrapAsync(async (req: Request, res: Response) => {
  const { accessToken, rawRefresh, persistent } = await service.refresh(
    req.cookies?.[REFRESH_COOKIE],
  );
  res.cookie(REFRESH_COOKIE, rawRefresh, cookieOpts(persistent));
  res.json({ accessToken, expiresIn: service.ACCESS_TOKEN_TTL_SEC });
});

export const logout = wrapAsync(async (req: Request, res: Response) => {
  await service.logout(req.cookies?.[REFRESH_COOKIE]);
  res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
  res.status(204).end();
});

export const verifyEmail = wrapAsync(async (req: Request, res: Response) => {
  const userId = await service.verifyEmail(req.body.token);
  await record({
    actor: userActor(userId),
    action: "email.verified",
    targetType: "user",
    targetId: userId,
  });
  res.json({ status: "verified" });
});

export const resendVerification = wrapAsync(
  async (req: Request, res: Response) => {
    await service.resendVerification(req.userId!);
    await record({
      actor: userActor(req.userId!),
      action: "email.verification_resent",
      targetType: "user",
      targetId: req.userId!,
    });
    res.status(202).json({ status: "sent" });
  },
);

export const requestEmailChange = wrapAsync(
  async (req: Request, res: Response) => {
    await service.requestEmailChange(
      req.userId!,
      req.body.currentPassword,
      req.body.newEmail,
    );
    await record({
      actor: userActor(req.userId!),
      action: "email.change_requested",
      targetType: "user",
      targetId: req.userId!,
    });
    res.status(202).json({ status: "sent" });
  },
);

export const confirmEmailChange = wrapAsync(
  async (req: Request, res: Response) => {
    const userId = await service.confirmEmailChange(req.body.token);
    await record({
      actor: userActor(userId),
      action: "email.changed",
      targetType: "user",
      targetId: userId,
    });
    res.json({ status: "changed" });
  },
);

export const me = wrapAsync(async (req: Request, res: Response) => {
  const user = await service.getCurrentUser(req.userId!);
  res.json({ user });
});

export const updateMe = wrapAsync(async (req: Request, res: Response) => {
  const user = await service.updateProfile(req.userId!, {
    displayName: req.body.displayName,
    language: req.body.language,
    speechEnabled: req.body.speechEnabled,
    speechLang: req.body.speechLang,
    speechAutoplay: req.body.speechAutoplay,
    speechRate: req.body.speechRate,
  });
  await record({
    actor: userActor(req.userId!),
    action: "profile.updated",
    targetType: "user",
    targetId: req.userId!,
    afterState: {
      displayName: user.displayName,
      language: user.language,
      speechEnabled: user.speechEnabled,
      speechLang: user.speechLang,
      speechAutoplay: user.speechAutoplay,
      speechRate: user.speechRate,
    },
  });
  res.json({ user });
});

export const changePassword = wrapAsync(async (req: Request, res: Response) => {
  const { user, accessToken, rawRefresh, persistent } =
    await service.changePassword(
      req.userId!,
      req.body.currentPassword,
      req.body.newPassword,
    );
  await record({
    actor: userActor(req.userId!),
    action: "password.changed",
    targetType: "user",
    targetId: req.userId!,
  });
  // Re-issued session for the acting device (all others were invalidated).
  res.cookie(REFRESH_COOKIE, rawRefresh, cookieOpts(persistent));
  res.json({ user, accessToken, expiresIn: service.ACCESS_TOKEN_TTL_SEC });
});

export const forgotPassword = wrapAsync(async (req: Request, res: Response) => {
  await service.forgotPassword(req.body.email);
  // Always the same response — never reveal whether the email exists.
  res.json({
    status: "ok",
    message: "If that email has an account, a reset link is on its way.",
  });
});

export const resetPassword = wrapAsync(async (req: Request, res: Response) => {
  const userId = await service.resetPassword(req.body.token, req.body.password);
  await record({
    actor: userActor(userId),
    action: "password.reset",
    targetType: "user",
    targetId: userId,
  });
  res.json({ status: "reset" });
});

export const deleteAccount = wrapAsync(async (req: Request, res: Response) => {
  await service.deleteAccount(req.userId!, req.body.currentPassword);
  res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
  res.status(204).end();
});
