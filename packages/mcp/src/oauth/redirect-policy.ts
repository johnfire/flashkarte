import { getRegisteredClient } from "./store";

// Where an authorization code may be sent. This is the main guard against a
// phishing link that lets someone log in on the real page but delivers the
// code (and so their account) to an attacker.
//
// - The pre-configured client (MCP_OAUTH_CLIENT_ID) may only redirect to an
//   explicit allowlist — Claude's connector callbacks by default — plus Claude
//   Code's loopback callback. NEVER widen this to a prefix or "any https".
// - A self-registered client may only redirect to a URI it registered.
// - Loopback http URIs (an app on the person's own machine, e.g. Claude Code)
//   match on any port, per RFC 8252 §7.3, when the path matches.

const DEFAULT_STATIC_REDIRECTS = [
  "https://claude.ai/api/mcp/auth_callback",
  "https://claude.com/api/mcp/auth_callback",
];
const CLAUDE_CODE_CALLBACKS = [
  "http://localhost/callback",
  "http://127.0.0.1/callback",
];
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const MAX_URI_LENGTH = 2000;

function parse(uri: string): URL | null {
  try {
    return new URL(uri);
  } catch {
    return null;
  }
}

function isLoopbackHttp(url: URL): boolean {
  return url.protocol === "http:" && LOOPBACK_HOSTS.has(url.hostname);
}

/** A client may register https URIs, or http on a loopback host. */
export function isRegistrableRedirect(uri: string): boolean {
  if (uri.length > MAX_URI_LENGTH) return false;
  const url = parse(uri);
  if (!url || url.hash || url.username || url.password) return false;
  return url.protocol === "https:" || isLoopbackHttp(url);
}

function withoutPort(url: URL): string {
  const copy = new URL(url.toString());
  copy.port = "";
  return copy.toString();
}

export function matchesRegistered(
  requested: string,
  registered: readonly string[],
): boolean {
  const url = parse(requested);
  if (!url || !isRegistrableRedirect(requested)) return false;
  if (registered.includes(requested)) return true;
  if (!isLoopbackHttp(url)) return false;
  return registered.some((entry) => {
    const candidate = parse(entry);
    return (
      candidate !== null &&
      isLoopbackHttp(candidate) &&
      withoutPort(candidate) === withoutPort(url)
    );
  });
}

export function staticClientRedirects(): string[] {
  const configured = (process.env.MCP_ALLOWED_REDIRECT_URIS ?? "")
    .split(",")
    .map((uri) => uri.trim())
    .filter(Boolean);
  return [
    ...(configured.length > 0 ? configured : DEFAULT_STATIC_REDIRECTS),
    ...CLAUDE_CODE_CALLBACKS,
  ];
}

export interface ClientInfo {
  /** Shown on the login page; a self-registered name is the app's own claim. */
  name: string;
  isSelfRegistered: boolean;
  redirectUris: string[];
}

/** The client's display name and allowed redirects, or null if unknown. */
export function lookupClient(
  clientId: string,
  staticClientId: string,
): ClientInfo | null {
  if (clientId === staticClientId) {
    return {
      name: "Claude",
      isSelfRegistered: false,
      redirectUris: staticClientRedirects(),
    };
  }
  const client = getRegisteredClient(clientId);
  if (!client) return null;
  return {
    name: client.client_name?.trim().slice(0, 100) || "An AI app",
    isSelfRegistered: true,
    redirectUris: client.redirect_uris,
  };
}
