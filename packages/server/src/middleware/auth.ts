import { Request, Response, NextFunction } from "express";
import {
  verifyAccessToken,
  getCurrentUser,
} from "../domains/auth/auth.service";
import { resolveKey } from "../domains/keys/keys.service";
import { AuthError, ForbiddenError } from "../utils/errors";

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

  // API keys (fk_…). 'full' keys authenticate anywhere a JWT does; 'deck' keys
  // are restricted to deck data routes by requireFullScope.
  if (token.startsWith("fk_")) {
    resolveKey(token)
      .then((result) => {
        if (!result) return next(new AuthError("Invalid API key"));
        req.userId = result.userId;
        req.keyScope = result.scope;
        next();
      })
      .catch(next);
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.userId = payload.sub;
    req.keyScope = "full";
    next();
  } catch (err) {
    next(err);
  }
}

// Reject deck-scoped API keys (minted by the MCP/OAuth flow) from account-level
// routes — key management, bug reports, admin. Runs after requireAuth. JWTs and
// personal 'full' keys pass through.
export function requireFullScope(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (req.keyScope === "deck") {
    next(new ForbiddenError("This API key is limited to deck operations"));
    return;
  }
  next();
}

// Gate admin-only routes. Runs after requireAuth: looks up the authenticated
// user and requires account_type === 'admin'.
export function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (!req.userId) {
    next(new AuthError());
    return;
  }
  getCurrentUser(req.userId)
    .then((user) => {
      if (user.accountType !== "admin") {
        next(new ForbiddenError("Admin access required"));
        return;
      }
      next();
    })
    .catch(next);
}
