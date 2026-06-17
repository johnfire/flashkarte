import jwt from "jsonwebtoken";

export const ACCESS_TOKEN_TTL_SEC = 3600;
const JWT_ALGORITHM = "HS256" as const;
// Bind tokens to this resource so one minted for the MCP can't be replayed at a
// future service that happens to share MCP_JWT_SECRET (MCP-005).
const JWT_AUDIENCE = "flashkarte-mcp" as const;

interface McpTokenPayload {
  sub: "mcp-service";
  // Opaque access-session id. The long-lived fk_ key is held server-side and
  // resolved from this id — it must never travel inside the (readable) JWT.
  sid: string;
}

function getMcpJwtSecret(): string {
  const secret = process.env.MCP_JWT_SECRET;
  if (!secret)
    throw new Error("MCP_JWT_SECRET environment variable is not set");
  return secret;
}

export function signMcpAccessToken(sid: string): string {
  return jwt.sign(
    { sub: "mcp-service", sid } satisfies McpTokenPayload,
    getMcpJwtSecret(),
    {
      expiresIn: ACCESS_TOKEN_TTL_SEC,
      algorithm: JWT_ALGORITHM,
      audience: JWT_AUDIENCE,
    },
  );
}

export function verifyMcpAccessToken(token: string): McpTokenPayload | null {
  try {
    return jwt.verify(token, getMcpJwtSecret(), {
      algorithms: [JWT_ALGORITHM],
      audience: JWT_AUDIENCE,
    }) as McpTokenPayload;
  } catch {
    return null;
  }
}
