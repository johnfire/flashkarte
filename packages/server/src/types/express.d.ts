import "express";
import type { SharedEmailTenant } from "../domains/shared-email/shared-email.types";

declare module "express-serve-static-core" {
  interface Request {
    userId?: string;
    keyScope?: "full" | "deck";
    keyPrefix?: string;
    correlationId?: string;
    sharedEmailTenant?: SharedEmailTenant;
  }
}
