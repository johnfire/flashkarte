# Audit log retention policy

**Applies to:** the `audit_log` table (migration `014_audit_log.sql`).
**Since:** 2026-07-15 (standards remediation Phase 2, coding-standards §7.6).

## What is recorded

Every state-changing action by a user or an AI agent (deck-scoped MCP key):
decks, API keys, admin actions, account lifecycle (created / deleted / data
exported), password events, email verification, and every 2FA transition.
Each row carries actor type + id, action, target, outcome, correlation ID,
and optional before/after state. The account-deletion entry deliberately
contains **no PII** — who (user id) and when only.

## Immutability

The table is append-only, enforced at the database level: `BEFORE UPDATE`
and `BEFORE DELETE` triggers raise. The application cannot mutate history
even if its role is over-permissioned.

## Retention

- **Policy: 12 months.** Entries older than 12 months may be pruned.
- Pruning is done by a **separate, tightly-scoped job** (per §7.6 the
  triggers stay; the job runs as a role with trigger-bypass, or the trigger
  is temporarily disabled inside the job's transaction). This job is **not
  yet built** — until it exists, the log simply grows, which at current
  volume is fine.
- TODO (tracked here): implement the prune job once the table approaches a
  size that matters (revisit at ~1M rows or 12 months after launch,
  whichever comes first).

## Access

No user-facing surface. Query directly (read-only) on the production DB
for investigations; the actor and action indexes support the common
"what did X do" and "who did action Y" queries.
