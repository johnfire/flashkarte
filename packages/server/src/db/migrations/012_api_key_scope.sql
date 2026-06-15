-- API keys carry a scope. Keys minted by the MCP/OAuth flow are limited to
-- deck operations ('deck'); personal keys created from the web UI keep full
-- account access ('full'). Existing rows default to 'full' to preserve
-- current behavior.
ALTER TABLE user_api_keys
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'full';
