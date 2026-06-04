# flashkarte — Phase 2 (MCP Server) Design

**Date:** 2026-06-04
**Status:** Approved — building
**Scope:** Per-user API keys + a hosted MCP server so a user's own AI generates decks and pushes them into their flashkarte account. Zero LLM cost to us.

## Context

Phase 1 shipped the platform (accounts, decks, cards, study). Phase 2 adds the
AI on-ramp: an MCP server, hosted over HTTP, that a user connects their own AI
client to (Claude Desktop, etc.) using a personal API key. Their AI calls MCP
tools that create/manage decks in their account. Mirrors notes-world's MCP.

## Decisions (approved)

- **Transport:** hosted HTTP (StreamableHTTP), so users just add a URL + key —
  no local install.
- **Auth:** per-user API keys, prefix `fk_`, stored sha256-hashed (shown once).
  A `fk_` key works as a Bearer token anywhere a JWT does.
- **Tool scope (v1):** content creation — `create_deck`, `add_cards`,
  `list_decks`, `get_deck`, `delete_deck`.

## Components

### 2A — Backend: API keys (`packages/server`)

- Migration `002_api_keys.sql`: `user_api_keys (key_hash PK, user_id FK, name,
key_prefix, created_at)`.
- `keys` domain: generate (`fk_` + 32 random bytes hex; return raw ONCE, store
  hash + 12-char prefix), list (prefix + name + created_at, never the key),
  revoke (by prefix).
- Routes behind `requireAuth`: `POST /api/keys`, `GET /api/keys`,
  `DELETE /api/keys/:prefix`.
- Extend `requireAuth`: if the Bearer token starts with `fk_`, sha256-hash it,
  look it up, set `req.userId`; otherwise verify as JWT. (Now async.)

### 2B — MCP server (`packages/mcp`)

- `@modelcontextprotocol/sdk` over `StreamableHTTPServerTransport`, Express,
  stateless per request.
- Auth middleware: read the key from `Authorization: Bearer` / `x-api-key` /
  `?key=`; thread it via `AsyncLocalStorage` to backend calls (as Bearer).
- Tools call the flashkarte API (`FLASHKARTE_API_URL`, default app:3001):
  - `create_deck(title?, markdown)` → `POST /api/decks`
  - `add_cards(deck_id, markdown)` → appends (see note)
  - `list_decks()` → `GET /api/decks`
  - `get_deck(deck_id)` → `GET /api/decks/:id`
  - `delete_deck(deck_id)` → `DELETE /api/decks/:id`
- `add_cards` needs a backend endpoint `POST /api/decks/:id/cards` that parses
  Markdown and appends cards to an existing deck (added in 2A).

### 2C — Frontend: API-key settings (`packages/web`)

- `/settings` page: generate a key (show the raw value once with a copy button +
  "save it now" warning), list existing keys (prefix + created date), revoke.
- Short "Connect your AI" blurb: the MCP URL + how to add the key in a client.
- Link to `/settings` from the deck-list header.

### 2D — Deploy

- Add an `mcp` service to `docker-compose.yml` (same image, runs the MCP entry,
  `FLASHKARTE_API_URL=http://app:3001`, its own published localhost port). The
  VPS reverse proxy maps `mcp.flashkarte.christopherrehm.de` (or a path) to it.

## Testing

- Backend: contract tests for key create (201, raw shown once) / list (no raw) /
  revoke (204), and `requireAuth` accepting an `fk_` key. `add_cards` endpoint
  contract test (append + zero-card 422).
- MCP: a unit test that each tool calls the right API path with the threaded key.
- Frontend: settings page generates + displays a key, revoke removes it.
- Smoke: real-DB end-to-end — create a key, call the MCP `create_deck` tool with
  it, confirm the deck appears via the API.

## Deferred

- Scoped/expiring keys, key usage metrics, rate-limiting per key (v1 relies on
  the global limiter), richer AI tools (#"more complex AI help").
