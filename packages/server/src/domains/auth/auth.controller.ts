import { Request, Response } from "express";
import { wrapAsync } from "../../utils/wrapAsync";
import * as service from "./auth.service";

const REFRESH_COOKIE = "fk_refresh";

function cookieOpts(persistent: boolean) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    // Persistent sessions survive browser restarts; session cookies don't.
    ...(persistent ? { maxAge: 30 * 86400_000 } : {}),
    path: "/api/auth",
  };
}

export const signup = wrapAsync(async (req: Request, res: Response) => {
  const { user, accessToken, rawRefresh, persistent } = await service.signup(
    req.body.email,
    req.body.password,
  );
  res.cookie(REFRESH_COOKIE, rawRefresh, cookieOpts(persistent));
  res
    .status(201)
    .json({ user, accessToken, expiresIn: service.ACCESS_TOKEN_TTL_SEC });
});

export const login = wrapAsync(async (req: Request, res: Response) => {
  const { user, accessToken, rawRefresh, persistent } = await service.login(
    req.body.email,
    req.body.password,
    req.body.rememberMe,
  );
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
  await service.verifyEmail(req.body.token);
  res.json({ status: "verified" });
});

export const resendVerification = wrapAsync(
  async (req: Request, res: Response) => {
    await service.resendVerification(req.userId!);
    res.status(202).json({ status: "sent" });
  },
);

export const me = wrapAsync(async (req: Request, res: Response) => {
  const user = await service.getCurrentUser(req.userId!);
  res.json({ user });
});

export const updateMe = wrapAsync(async (req: Request, res: Response) => {
  const user = await service.updateProfile(req.userId!, req.body.displayName);
  res.json({ user });
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
  await service.resetPassword(req.body.token, req.body.password);
  res.json({ status: "reset" });
});
