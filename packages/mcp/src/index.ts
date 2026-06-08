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
  const val = process.env[name];
  if (!val) throw new Error(`${name} environment variable is not set`);
  return val;
}

const PORT = parseInt(process.env.MCP_PORT ?? "3002", 10);
const MCP_BASE_URL = requireEnv("MCP_BASE_URL");
const MCP_OAUTH_CLIENT_ID = requireEnv("MCP_OAUTH_CLIENT_ID");
// Validated at startup so a misconfigured deploy fails fast.
requireEnv("MCP_JWT_SECRET");

function buildServer(): McpServer {
  const server = new McpServer({ name: "flashkarte", version: "0.1.0" });
  registerDeckTools(server);
  return server;
}

const app = express();
app.use(express.json());
// OAuth authorize form + token endpoint use form-encoded bodies.
app.use(express.urlencoded({ extended: false }));

app.get("/health", (_req, res) => {
  res.send("ok");
});

// OAuth 2.1 endpoints — public, no auth required.
app.use(createDiscoveryRouter(MCP_BASE_URL));
app.use(createAuthorizeRouter(MCP_OAUTH_CLIENT_ID));
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
