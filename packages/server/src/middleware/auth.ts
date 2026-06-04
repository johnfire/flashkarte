import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../domains/auth/auth.service";
import { AuthError } from "../utils/errors";

export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new AuthError("Authorization header required");
  }
  const payload = verifyAccessToken(header.slice(7));
  req.userId = payload.sub;
  next();
}
