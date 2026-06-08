# flashkarte — claude.ai-ready MCP (OAuth) Design

**Date:** 2026-06-08
**Status:** Approved — building
**Scope:** Add an OAuth 2.1 authorization layer to the existing `packages/mcp`
server so a user can connect it to **claude.ai** as a custom connector, log in
with their own flashkarte account, and have their AI generate decks into that
account. Plus two smaller bundled items: verify the end-to-end flow (and fix the
Settings connect-URL bug) and improve the authoring UX.

## Context

Phase 2 already shipped the MCP server (`create_deck(markdown)` → cards,
`add_cards`, `list_decks`, `get_deck`, `delete_deck`), per-user `fk_` API keys
(backend `keys` domain, migration `002_api_keys.sql`), a Settings page to
generate/revoke keys, and deployment at `mcp.flashkarte.christopherrehm.de`
(docker-compose.prod `mcp` service, port 8091).

What's missing: **claude.ai** custom connectors expect an OAuth 2.1 + PKCE flow,
not a static URL + Bearer key the way Claude Desktop's config does. notes-world
already solved this with an `oauth/` module in its MCP package — but its flow
**auto-approves to a single shared key** ("safe for a single-user personal
app"). flashkarte is multi-user, so the authorize step must identify _which_
flashkarte user is connecting and bind the issued token to that user's account.

## Decisions (approved)

- **Approach A — login-on-authorize.** `/oauth/authorize` serves a small
  flashkarte-branded login page (email + password). On submit, the MCP server
  authenticates against the backend and mints that user's `fk_` key, binding the
  OAuth code to it. Self-contained in `packages/mcp`; reuses existing HTTP
  endpoints; no backend internals imported.
- Mirror notes-world's `oauth/` structure (discovery, authorize, token, store,
  tokens, middleware), renaming its `nw_key` concept to `fk_key`. The only
  materially new code is the authorize login page + its backend calls.
- Token carries the user's `fk_` key; the backend already accepts an `fk_` key
  as a Bearer token anywhere (`middleware/auth.ts`), and already mints per-user
  keys (`keys.service.createKey`). No backend changes required for auth.

## Connect flow

1. User adds `https://mcp.flashkarte.christopherrehm.de/mcp` as a custom
   connector in claude.ai.
2. claude.ai reads discovery metadata, begins OAuth + PKCE, redirects the user
   to `/oauth/authorize`.
3. `/oauth/authorize` (GET) serves a flashkarte login form (email + password),
   preserving the OAuth params (`client_id`, `redirect_uri`, `code_challenge`,
   `code_challenge_method`, `state`).
4. Form POST → MCP server calls `POST /api/auth/login` (→ JWT), then
   `POST /api/keys` with `name: "claude.ai"` (→ raw `fk_` key). It creates an
   auth code bound to that `fk_` key and redirects back to `redirect_uri` with
   `code` + `state`.
5. claude.ai exchanges the code at `/oauth/token` (PKCE S256 verified) for a
   short-lived access JWT (carrying the `fk_` key) + a rotating refresh token.
6. Each `/mcp` tool call carries the access JWT; middleware verifies it and
   threads the `fk_` key to the backend, so tools act as that user. The deck
   tools themselves are unchanged.

## Components

### MCP server (`packages/mcp/src`)

- `oauth/discovery.ts` — RFC 9728 (`/.well-known/oauth-protected-resource`,
  match subpaths) + RFC 8414 (`/.well-known/oauth-authorization-server`).
  `code_challenge_methods_supported` MUST include `S256`. Copy from notes-world,
  swap base URL.
- `oauth/authorize.ts` — **the changed piece.**
  - `GET /oauth/authorize`: validate `response_type=code`, `client_id`,
    HTTPS `redirect_uri`, `code_challenge_method=S256` + `code_challenge`
    present (same guards as notes-world). On success, render a minimal
    flashkarte-branded HTML login form that re-submits the OAuth params plus
    email + password.
  - `POST /oauth/authorize`: call `POST /api/auth/login {email, password}`. On
    failure, re-render the form with an error. On success, use the returned JWT
    to `POST /api/keys {name: "claude.ai"}`, then `createAuthCode` bound to the
    raw `fk_` key and redirect to `redirect_uri?code=…&state=…`.
- `oauth/token.ts` — `POST /oauth/token`: `authorization_code` (verify PKCE
  S256, `redirect_uri`, `client_id`) and `refresh_token` (rotate) grants. Copy
  from notes-world.
- `oauth/store.ts` — in-memory auth-code (10-min TTL, single-use) and
  refresh-token (30-day TTL, rotating) maps with expiry pruning. Copy, rename
  `nw_key`→`fk_key`.
- `oauth/tokens.ts` — HS256 sign/verify of the access JWT (1-hour TTL),
  payload `{ sub: "mcp-service", fk_key }`. Copy, rename.
- `oauth/middleware.ts` — accept a raw `fk_` key (dev/CLI) or an OAuth JWT;
  thread the resolved `fk_` key via `requestKeyStore` (AsyncLocalStorage).
  Adapt notes-world's `nw_`-prefix check to `fk_`.
- `index.ts` — wire the routers (discovery + authorize + token are public; the
  auth middleware guards `/mcp`); add `express.urlencoded` for the form/token
  bodies; require env `MCP_BASE_URL`, `MCP_OAUTH_CLIENT_ID`, `MCP_JWT_SECRET`
  (mirror notes-world's `requireEnv`).

### Deploy / env

- Add `MCP_BASE_URL=https://mcp.flashkarte.christopherrehm.de`,
  `MCP_OAUTH_CLIENT_ID`, and `MCP_JWT_SECRET` to the `mcp` service env in
  `docker-compose.prod.yml` and `.env.example`. No new service or subdomain —
  the existing `mcp.` host already proxies to it.

### Frontend (`packages/web`)

- Fix the Settings connect URL: `SettingsPage.tsx` currently shows
  `${location.origin}/mcp` (→ wrong host). Point it at the `mcp.` subdomain via
  a build-time value (Vite env, e.g. `VITE_MCP_URL`) defaulting to
  `https://mcp.flashkarte.christopherrehm.de/mcp`.
- Add a short "Connect to claude.ai" blurb: the connector URL + a copy-paste
  starter prompt (e.g. _"Turn this into a flashkarte deck: …"_).

### Authoring UX

- Tighten the `create_deck` / `add_cards` tool descriptions and the shared
  markdown-format help so the AI reliably emits a valid deck (clear `# Title`,
  optional `## Category`, `**N. front**` + answer lines). No new tools (YAGNI).

## Security

- PKCE S256 mandatory; auth codes single-use with a 10-min TTL; refresh tokens
  rotate on each use with a 30-day TTL; access JWT HS256 with a 1-hour TTL
  (consistent with the backend's existing HS256 pinning).
- The user's password is POSTed only to `/oauth/authorize` over HTTPS, used once
  to mint the `fk_` key, and never stored. The connector persists only the
  `fk_` key, which is revocable from Settings.
- `redirect_uri` must be HTTPS; `client_id` must match `MCP_OAUTH_CLIENT_ID`.
- OAuth stores are in-memory: fine for the single MCP instance; a restart forces
  re-auth (claude.ai re-runs the flow), same trade-off as notes-world.

## Testing

- **Unit (adapt notes-world's oauth tests):**
  - discovery metadata shape (S256 advertised, correct endpoints/base URL);
  - authorize GET rejects non-`code` response type, wrong `client_id`,
    non-HTTPS `redirect_uri`, missing/non-S256 PKCE;
  - authorize POST: bad credentials re-render with error; good credentials mint
    an `fk_` key and bind it into the code (backend calls mocked);
  - token: `authorization_code` verifies PKCE + `redirect_uri` + `client_id`;
    `refresh_token` rotates; bad verifier / reused code rejected;
  - middleware: accepts a raw `fk_` key and a valid OAuth JWT, rejects garbage.
- **Smoke (scripted):** a curl script that walks the full OAuth dance
  (authorize → login → code → token) and calls `create_deck`, confirming a deck
  appears via the API against the real DB.
- The final claude.ai click-through is manual and not automatable.

## Deferred

- Dynamic Client Registration (rely on a fixed `MCP_OAUTH_CLIENT_ID`, mirroring
  notes-world).
- Persisting OAuth stores across restarts (Redis/DB) — only needed for
  multi-instance scaling.
- Consent/scope screens beyond login; per-connector key naming/management UI.
