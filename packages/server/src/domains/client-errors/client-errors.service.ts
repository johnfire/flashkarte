import { logger } from "../../utils/logger";

export interface ClientErrorReport {
  app: string;
  message: string;
  appVersion?: string;
  platform?: string;
  context?: string;
  url?: string;
  userAgent?: string;
  stack?: string;
  userId?: string;
}

/**
 * Records a client-side error to the master log so web/native failures are
 * visible and fixable server-side. Logging only (no DB table) for now.
 */
export function recordClientError(report: ClientErrorReport): void {
  logger.error("clientErrors.service", "client-error", {
    app: report.app,
    appVersion: report.appVersion,
    platform: report.platform,
    context: report.context,
    userId: report.userId,
    messageLength: report.message.length,
    hasStack: Boolean(report.stack),
    hasUrl: Boolean(report.url),
    hasUserAgent: Boolean(report.userAgent),
  });
}
