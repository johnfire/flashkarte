import crypto from "crypto";
import type { NextFunction, Request, Response } from "express";
import { AuthError } from "../../utils/errors";
import { getConfiguredSharedEmailTenants } from "./shared-email.config";
import type { SharedEmailTenant } from "./shared-email.types";

function secretsMatch(supplied: string, expected: string): boolean {
  const suppliedHash = crypto.createHash("sha256").update(supplied).digest();
  const expectedHash = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(suppliedHash, expectedHash);
}

export function requireSharedEmailTenant(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next(new AuthError("Shared email service authorization required"));
    return;
  }
  const suppliedSecret = header.slice("Bearer ".length);
  const tenant = getConfiguredSharedEmailTenants().find((candidate) =>
    secretsMatch(suppliedSecret, candidate.secret),
  );
  if (!tenant) {
    next(new AuthError("Invalid shared email service credential"));
    return;
  }
  req.sharedEmailTenant = {
    slug: tenant.slug,
    fromAddress: tenant.fromAddress,
    replyTo: tenant.replyTo,
  };
  next();
}

export function sharedEmailTenantFromRequest(req: Request): SharedEmailTenant {
  if (!req.sharedEmailTenant) {
    throw new AuthError("Shared email service authorization required");
  }
  return req.sharedEmailTenant;
}
