import path from "path";
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
import { bugReportsRouter } from "./domains/bug-reports/bug-reports.routes";
import { requireAuth, requireAdmin } from "./middleware/auth";
import { errorHandler } from "./middleware/errorHandler";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);

  app.use(helmet());
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

  // Public routes (no JWT)
  app.use("/api/auth", authRouter);
  app.use("/api/client-errors", clientErrorsRouter);

  // Everything below requires a valid JWT
  app.use("/api", requireAuth);
  app.use("/api/decks", decksRouter);
  app.use("/api/study", studyRouter);
  app.use("/api/keys", keysRouter);
  app.use("/api/library", libraryRouter);
  app.use("/api/bug-reports", bugReportsRouter);
  app.use("/api/admin", requireAdmin, adminRouter);

  // Serve the built web SPA in production (Dockerfile copies web/dist → public).
  if (process.env.NODE_ENV === "production") {
    const webDist = path.join(__dirname, "..", "public");
    app.use(express.static(webDist));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(webDist, "index.html"));
    });
  }

  app.use(errorHandler);
  return app;
}
