import "dotenv/config";
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { registerDeckTools } from "./tools/decks";
import { createDiscoveryRouter } from "./oauth/discovery";
import { createAuthorizeRouter } from "./oauth/authorize";
import { createTokenRouter } from "./oauth/token";
import { createMcpAuthMiddleware } from "./oauth/middleware";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} environment variable is not set`);
  return value;
}

const PORT = parseInt(process.env.MCP_PORT ?? "3002", 10);
const MCP_BASE_URL = requireEnv("MCP_BASE_URL");
const MCP_OAUTH_CLIENT_ID = requireEnv("MCP_OAUTH_CLIENT_ID");
// Validated at startup so a misconfigured deploy fails fast.
requireEnv("MCP_JWT_SECRET");

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
app.all("/mcp", async (req, res) => {
  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
  res.on("finish", () => server.close());
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`flashkarte MCP server listening on :${PORT}`);
});
