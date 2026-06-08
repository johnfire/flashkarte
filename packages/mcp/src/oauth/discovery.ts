import { Router } from "express";

export function createDiscoveryRouter(baseUrl: string): Router {
  const router = Router();

  // RFC 9728: tells MCP clients which authorization server handles this resource.
  // Clients may append the resource path (e.g. /mcp) per RFC 9728 §3 — match any subpath.
  router.get(/^\/\.well-known\/oauth-protected-resource/, (_req, res) => {
    res.json({
      resource: `${baseUrl}/mcp`,
      authorization_servers: [baseUrl],
    });
  });

  // RFC 8414: authorization server metadata.
  // code_challenge_methods_supported MUST include S256 or MCP clients refuse.
  router.get("/.well-known/oauth-authorization-server", (_req, res) => {
    res.json({
      issuer: baseUrl,
      authorization_endpoint: `${baseUrl}/oauth/authorize`,
      token_endpoint: `${baseUrl}/oauth/token`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
    });
  });

  return router;
}
