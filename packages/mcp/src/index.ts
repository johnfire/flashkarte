import "dotenv/config";
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { registerDeckTools } from "./tools/decks";
import { requestKeyStore } from "./api";

const PORT = parseInt(process.env.MCP_PORT ?? "3002", 10);

function buildServer(): McpServer {
  const server = new McpServer({ name: "flashkarte", version: "0.1.0" });
  registerDeckTools(server);
  return server;
}

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.send("ok");
});

// Auth: the user's fk_ key (x-api-key or Bearer header) is threaded to every
// backend call so each tool acts as that user. Validation happens at the API.
// Header-only — never accept the key in the query string, where it would leak
// into access logs, proxies, and browser history.
app.use((req, res, next) => {
  const raw =
    (req.headers["x-api-key"] as string | undefined) ??
    req.headers.authorization?.replace(/^Bearer\s+/i, "");

  if (!raw) {
    res.status(401).json({ error: "API key required" });
    return;
  }
  requestKeyStore.run(raw, next);
});

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
