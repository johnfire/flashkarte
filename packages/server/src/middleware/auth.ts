import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../domains/auth/auth.service";
import { resolveKey } from "../domains/keys/keys.service";
import { AuthError } from "../utils/errors";

export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next(new AuthError("Authorization header required"));
    return;
  }
  const token = header.slice(7);

  // Personal API keys (fk_…) authenticate anywhere a JWT does.
  if (token.startsWith("fk_")) {
    resolveKey(token)
      .then((userId) => {
        if (!userId) return next(new AuthError("Invalid API key"));
        req.userId = userId;
        next();
      })
      .catch(next);
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.userId = payload.sub;
    next();
  } catch (err) {
    next(err);
  }
}
