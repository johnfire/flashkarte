export function getSiteOrigin(): string {
  return (
    process.env.SITE_ORIGIN ?? "https://flashkarte.christopherrehm.de"
  ).replace(/\/$/, "");
}

/** The hosted MCP endpoint, as advertised to AI agents in /llms.txt. */
export function getMcpPublicUrl(): string {
  return (
    process.env.MCP_PUBLIC_URL ??
    "https://mcp.flashkarte.christopherrehm.de/mcp"
  );
}
