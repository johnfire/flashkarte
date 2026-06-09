import path from "path";
import net from "net";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import { authRouter } from "./domains/auth/auth.routes";
import { decksRouter } from "./domains/decks/decks.routes";
import { studyRouter } from "./domains/study/study.routes";
import { keysRouter } from "./domains/keys/keys.routes";
import { clientErrorsRouter } from "./domains/client-errors/client-errors.routes";
import { adminRouter } from "./domains/admin/admin.routes";
import { libraryRouter } from "./domains/library/library.routes";
import { publicLibraryRouter } from "./domains/library/public.routes";
import { bugReportsRouter } from "./domains/bug-reports/bug-reports.routes";
import { requireAuth, requireAdmin } from "./middleware/auth";
import { errorHandler } from "./middleware/errorHandler";
import { mountSeo } from "./seo/mount";
import { loadTemplate } from "./seo/template";
import { getSiteOrigin } from "./seo/siteOrigin";
import { SitemapUrl } from "./seo/sitemap";
import * as libraryService from "./domains/library/library.service";
import { deckPath } from "@flashkarte/shared";

// For IPv6, bucket by the /64 prefix so a client can't trivially bypass rate
// limits by rotating through addresses within their allocated /64 block.
function normalizeIp(ip: string): string {
  if (!net.isIPv6(ip)) return ip;
  const parts = ip.split("::");
  const left = parts[0].split(":").filter(Boolean);
  if (left.length >= 4) return left.slice(0, 4).join(":");
  const right = parts[1] ? parts[1].split(":").filter(Boolean) : [];
  const missing = 8 - left.length - right.length;
  return [...left, ...Array(missing).fill("0"), ...right].slice(0, 4).join(":");
}

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);

  // Allowlist the Umami analytics origin in the CSP: it serves script.js
  // (script-src) and receives event POSTs (connect-src). Mirrors the
  // <script> tag in web/index.html. Everything else keeps helmet defaults.
  const umamiOrigin = "https://stats.christopherrehm.de";
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          "script-src": ["'self'", umamiOrigin],
          "connect-src": ["'self'", umamiOrigin],
        },
      },
    }),
  );
  if (!process.env.CORS_ORIGIN && process.env.NODE_ENV === "production") {
    throw new Error("CORS_ORIGIN must be set in production");
  }
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "5mb" }));
  app.use(cookieParser());

  if (process.env.NODE_ENV !== "test") {
    app.use(morgan("dev"));
    app.use(
      "/api",
      rateLimit({
        windowMs: 60_000,
        limit: 200,
        standardHeaders: "draft-7",
        legacyHeaders: false,
      }),
    );
    app.use(
      "/api/auth",
      rateLimit({
        windowMs: 15 * 60_000,
        limit: 20,
        standardHeaders: "draft-7",
        legacyHeaders: false,
        message: {
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many auth attempts, please try again later",
          },
        },
      }),
    );
  }

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  // No-store on API responses (stale 304s break refresh after mutations)
  app.use("/api", (_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });

  const isTest = () => process.env.NODE_ENV === "test";

  // Public, unauthenticated error sink — cap per IP so it can't be used to
  // flood the log/disk.
  const clientErrorsLimiter = rateLimit({
    windowMs: 60_000,
    limit: 30,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: (req) =>
      normalizeIp(req.ip ?? req.socket.remoteAddress ?? "unknown"),
    skip: isTest,
  });

  // Each bug report files a GitHub issue; cap per authenticated user so the
  // tracker can't be spammed.
  const bugReportLimiter = rateLimit({
    windowMs: 60 * 60_000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: (req) =>
      req.userId ?? normalizeIp(req.ip ?? req.socket.remoteAddress ?? "anon"),
    skip: isTest,
    message: {
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many bug reports — please try again later",
      },
    },
  });

  // Public routes (no JWT)
  app.use("/api/auth", authRouter);
  app.use("/api/client-errors", clientErrorsLimiter, clientErrorsRouter);
  app.use("/api/public/library", publicLibraryRouter);

  // Everything below requires a valid JWT
  app.use("/api", requireAuth);
  app.use("/api/decks", decksRouter);
  app.use("/api/study", studyRouter);
  app.use("/api/keys", keysRouter);
  app.use("/api/library", libraryRouter);
  app.use("/api/bug-reports", bugReportLimiter, bugReportsRouter);
  app.use("/api/admin", requireAdmin, adminRouter);

  // Serve the built web SPA in production (Dockerfile copies web/dist → public).
  if (process.env.NODE_ENV === "production") {
    configureProductionWeb(app, path.join(__dirname, "..", "public"));
  }

  app.use(errorHandler);
  return app;
}

// Serve the built SPA + SEO routes. Exported so tests can point it at a
// fixture web dir. Registers SEO HTML routes BEFORE static so "/" gets
// injected meta rather than the raw index.html.
export function configureProductionWeb(
  app: import("express").Express,
  webDist: string,
): void {
  const template = loadTemplate(webDist);
  const sitemapUrls = async (): Promise<SitemapUrl[]> => {
    const origin = getSiteOrigin();
    const base: SitemapUrl[] = [
      { loc: `${origin}/`, changefreq: "weekly", priority: "1.0" },
      { loc: `${origin}/explore`, changefreq: "daily", priority: "0.8" },
      { loc: `${origin}/privacy` },
      { loc: `${origin}/impressum` },
    ];
    const decks = await libraryService.list(undefined);
    for (const d of decks) {
      base.push({
        loc: `${origin}${deckPath(d.title, d.id)}`,
        changefreq: "weekly",
      });
    }
    return base;
  };

  if (template) {
    mountSeo(app, {
      template,
      sitemapUrls,
      getDeckPreview: (id) => libraryService.getPreview(id),
    });
  }
  app.use(express.static(webDist, { index: false }));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(webDist, "index.html"));
  });
}
