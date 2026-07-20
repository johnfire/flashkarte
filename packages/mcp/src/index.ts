import "dotenv/config";
import crypto from "crypto";
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { registerDeckTools } from "./tools/decks";
import { createDiscoveryRouter } from "./oauth/discovery";
import { createAuthorizeRouter } from "./oauth/authorize";
import { createTokenRouter } from "./oauth/token";
import { createMcpAuthMiddleware } from "./oauth/middleware";
import { requestCorrelationStore } from "./api";
import { logger } from "./logger";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} environment variable is not set`);
  return value;
}

const PORT = parseInt(process.env.MCP_PORT ?? "3002", 10);
const MCP_BASE_URL = requireEnv("MCP_BASE_URL");
const MCP_OAUTH_CLIENT_ID = requireEnv("MCP_OAUTH_CLIENT_ID");
// Validated at startup so a misconfigured deploy fails fast.
if (requireEnv("MCP_JWT_SECRET").length < 32) {
  throw new Error("MCP_JWT_SECRET must be at least 32 characters");
}

// Exact-match allowlist of OAuth redirect URIs. Defaults to the known claude.ai
// connector callbacks; override with MCP_ALLOWED_REDIRECT_URIS (comma-separated)
// if the connector uses a different callback. NEVER widen this to a prefix/HTTPS
// check — that reintroduces the auth-code-theft open redirect.
const MCP_ALLOWED_REDIRECT_URIS = (
  process.env.MCP_ALLOWED_REDIRECT_URIS ??
  "https://claude.ai/api/mcp/auth_callback,https://claude.com/api/mcp/auth_callback"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function buildServer(): McpServer {
  const server = new McpServer({ name: "flashkarte", version: "0.1.0" });
  registerDeckTools(server);
  return server;
}

const app = express();
// Behind one reverse proxy (nginx) — trust it so req.ip is the real client for
// the login rate limiter.
app.set("trust proxy", 1);
// JSON allows up to the backend's deck-import size (create_deck forwards
// markdown); the OAuth form bodies are tiny, so cap them tightly.
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: false, limit: "64kb" }));
app.use((req, res, next) => {
  const suppliedId = req.headers["x-request-id"];
  const correlationId =
    typeof suppliedId === "string" && suppliedId.length <= 128
      ? suppliedId
      : crypto.randomUUID();
  res.setHeader("x-request-id", correlationId);
  requestCorrelationStore.run(correlationId, next);
});

app.get("/health", (_req, res) => {
  res.send("ok");
});

// OAuth 2.1 endpoints — public, no auth required.
app.use(createDiscoveryRouter(MCP_BASE_URL));
app.use(createAuthorizeRouter(MCP_OAUTH_CLIENT_ID, MCP_ALLOWED_REDIRECT_URIS));
app.use(createTokenRouter());

// Everything below requires a valid fk_ key or OAuth JWT.
app.use(createMcpAuthMiddleware());

// Stateless: a fresh server + transport per request.
app.all("/mcp", async (req, res, next) => {
  const startedAt = Date.now();
  logger.info("mcp.request", "received", { method: req.method });
  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    res.on("finish", () => {
      logger.info("mcp.request", "completed", {
        method: req.method,
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt,
      });
      void server.close();
    });
  } catch (error) {
    logger.error("mcp.request", "failed", {
      method: req.method,
      error: error instanceof Error ? error.message : String(error),
    });
    next(error);
  }
});

app.use(
  (
    _error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    if (res.headersSent) return;
    res.status(500).json({ error: "MCP request failed" });
  },
);

app.listen(PORT, () => {
  logger.info("mcp.server", "listening", { port: PORT });
});
