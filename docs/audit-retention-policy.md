# Audit log retention policy

**Applies to:** the `audit_log` table (migration `014_audit_log.sql`).
**Since:** 2026-07-15 (standards remediation Phase 2, coding-standards §7.6).

## What is recorded

Every state-changing action by a user or an AI agent (deck-scoped MCP key):
decks, study reviews and syncs, API keys, admin actions, account lifecycle
(created / deleted / data exported), profile updates, password events, email
verification, bug-report submission, and every 2FA transition. Study audit
records are committed in the same database transaction as the progress write.
Each row carries actor type + id, action, target, outcome, correlation ID,
and optional before/after state. Failed AI deck mutations are also recorded
with a failure outcome. The account-deletion entry deliberately
contains **no PII** — who (user id) and when only.

## Immutability

The table is append-only, enforced at the database level: `BEFORE UPDATE`
and `BEFORE DELETE` triggers raise. The application cannot mutate history
even if its role is over-permissioned.

## Retention

- **Policy: 12 months.** Entries older than 12 months may be pruned.
- Pruning is done daily by the host-only `flashkarte-audit-retention` job. It
  temporarily bypasses only the delete trigger inside one transaction, deletes
  entries older than 12 months, and restores the trigger before commit.

## Access

No user-facing surface. Query directly (read-only) on the production DB
for investigations; the actor and action indexes support the common
"what did X do" and "who did action Y" queries.
