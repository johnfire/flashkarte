import { Request, Response } from "express";
import { wrapAsync } from "../../utils/wrapAsync";
import * as service from "./auth.service";

const REFRESH_COOKIE = "fk_refresh";
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: 30 * 86400_000,
  path: "/api/auth",
};

export const signup = wrapAsync(async (req: Request, res: Response) => {
  const { user, accessToken, rawRefresh } = await service.signup(
    req.body.email,
    req.body.password,
  );
  res.cookie(REFRESH_COOKIE, rawRefresh, COOKIE_OPTS);
  res
    .status(201)
    .json({ user, accessToken, expiresIn: service.ACCESS_TOKEN_TTL_SEC });
});

export const login = wrapAsync(async (req: Request, res: Response) => {
  const { user, accessToken, rawRefresh } = await service.login(
    req.body.email,
    req.body.password,
  );
  res.cookie(REFRESH_COOKIE, rawRefresh, COOKIE_OPTS);
  res.json({ user, accessToken, expiresIn: service.ACCESS_TOKEN_TTL_SEC });
});

export const refresh = wrapAsync(async (req: Request, res: Response) => {
  const { accessToken } = await service.refresh(req.cookies?.[REFRESH_COOKIE]);
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
