import net from "net";
import type { Request } from "express";

export interface LoginSecurityContext {
  sourceIp: string | null;
  browser: string;
  platform: string;
}

function browserFromUserAgent(userAgent: string): string {
  const normalizedUserAgent = userAgent.toLowerCase();
  if (normalizedUserAgent.includes("edg/")) return "edge";
  if (normalizedUserAgent.includes("firefox/")) return "firefox";
  if (normalizedUserAgent.includes("chrome/")) return "chrome";
  if (normalizedUserAgent.includes("safari/")) return "safari";
  return "other";
}

function platformFromUserAgent(userAgent: string): string {
  const normalizedUserAgent = userAgent.toLowerCase();
  if (normalizedUserAgent.includes("android")) return "android";
  if (/(iphone|ipad|ipod)/.test(normalizedUserAgent)) return "ios";
  if (normalizedUserAgent.includes("windows")) return "windows";
  if (normalizedUserAgent.includes("macintosh")) return "macos";
  if (normalizedUserAgent.includes("linux")) return "linux";
  return "other";
}

function validSourceIp(ipAddress: string | undefined): string | null {
  return ipAddress && net.isIP(ipAddress) ? ipAddress : null;
}

/** Extract a privacy-minimised, stable security description from a login request. */
export function loginSecurityContext(req: Request): LoginSecurityContext {
  const userAgent = req.get("user-agent") ?? "";
  return {
    sourceIp: validSourceIp(req.ip),
    browser: browserFromUserAgent(userAgent),
    platform: platformFromUserAgent(userAgent),
  };
}
