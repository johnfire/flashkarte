export function getSiteOrigin(): string {
  return (process.env.SITE_ORIGIN ?? "https://learnwohl.app").replace(
    /\/$/,
    "",
  );
}

/** Advertise MCP only after a public endpoint has been configured. */
export function getMcpPublicUrl(): string | undefined {
  return process.env.MCP_PUBLIC_URL?.trim() || undefined;
}
