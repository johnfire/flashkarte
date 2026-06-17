import jwt from "jsonwebtoken";

export const ACCESS_TOKEN_TTL_SEC = 3600;
const JWT_ALGORITHM = "HS256" as const;

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
    { expiresIn: ACCESS_TOKEN_TTL_SEC, algorithm: JWT_ALGORITHM },
  );
}

export function verifyMcpAccessToken(token: string): McpTokenPayload | null {
  try {
    return jwt.verify(token, getMcpJwtSecret(), {
      algorithms: [JWT_ALGORITHM],
    }) as McpTokenPayload;
  } catch {
    return null;
  }
}
