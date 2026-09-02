# Verzeichnis von Verarbeitungstätigkeiten — flashkarte

Art. 30 GDPR processing record. Code-derived columns are maintained by the
gdpr-audit skill; columns marked **(human)** are business decisions and must
be reviewed by the controller/lawyer.

**Controller:** Christopher Rehm (as stated in the public policy) — address
and contact details require human confirmation in the final record.
**Last code-derived update:** 2026-07-22 | **Last human review:** ⚠ TODO

## Processing activities

| # | Activity | Data categories | Data subjects | Purpose (human) | Legal basis (human) | Recipients | Third-country transfer | Retention | Security measures (Art. 32) |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Account and authentication | Email, password hash, account/profile fields, verification/reset/change token hashes, refresh tokens, optional encrypted 2FA secret and hashed backup codes | Registered users | ⚠ TODO | ⚠ TODO | IONOS VPS; self-hosted Postfix/Dovecot | Confirm | Account lifetime; auth tokens expire per service; mail logs 90d; backups ≤3 months | TLS, bcrypt, hashed tokens, HttpOnly secure cookies, rate limiting, optional 2FA encryption |
| 2 | Decks and study | Deck/card Markdown free text, title, filename, categories, public flag, progress and review history | Registered users; public-deck visitors | ⚠ TODO | ⚠ TODO | IONOS PostgreSQL; encrypted Android local storage | No code-derived external transfer | Account lifetime; backups ≤3 months | Authenticated ownership checks, TLS, encrypted Android storage |
| 3 | API keys and MCP OAuth | API-key hash/prefix/name/scope; OAuth session/refresh-token material; user-selected tool inputs | MCP users | ⚠ TODO | ⚠ TODO | IONOS MCP service; user-selected AI provider when invoked | Provider-dependent; confirm | Keys until revoked; MCP refresh records/tombstones 30d; access sessions 1h | Hashed/scoped keys, encrypted OAuth store, PKCE, rate limits, audit/correlation IDs |
| 4 | User-invoked AI | Selected deck/card content and MCP tool input/output | Users connecting an AI provider | ⚠ TODO | ⚠ TODO | User-selected AI provider | Provider-dependent; confirm Art. 44–49 mechanism | Provider-dependent; flashkarte telemetry excludes tool bodies | Scoped credentials and no tool-input bodies in MCP logs |
| 5 | Diagnostics, security and audit | Pseudonymous user/key IDs, path, status, duration, correlation ID, technical error metadata, Apache IP/access logs, limited audit state | Visitors and users | ⚠ TODO | ⚠ TODO | IONOS VPS | No code-derived external transfer | App/Apache/Postfix logs 90d; audit 12 months | Redaction/minimisation, restricted host access, append-only audit trigger, structured logs |
| 6 | Bug reports | Pseudonymous account ID, free-text report, app version and platform | Authenticated users | ⚠ TODO | ⚠ TODO | Private GitHub Issues | Confirm GitHub location/safeguards | 90d scheduled deletion; immediate verified-erasure path | Authenticated submission, length limits, safe rendering |
| 7 | Optional analytics | Page/referrer/browser/OS/device/country metrics; consent choice in browser storage | Visitors | ⚠ TODO | ⚠ TODO | Self-hosted Umami on IONOS Frankfurt | No code-derived external transfer | Analytics records 90d; browser consent expires 90d | Script loads only after opt-in; query-string routes excluded; easy reject/withdrawal |
| 8 | Backups | PostgreSQL contents, including the above account/content/credential-hash/audit data | Registered users | ⚠ TODO | ⚠ TODO | VPS-local backup sidecar/storage | Confirm | 7 daily, 4 weekly, 3 monthly backups | Restricted VPS access; encryption/restoration procedure requires human confirmation |

## Notes

- The live production database was read-only audited on 2026-07-22: 8 user
  rows, zero orphan refresh/verification-token rows, and zero audit rows older
  than 12 months.
- The live app and MCP image revision was `b3944b9`; migration
  `017_email_change.sql` was present and both services were healthy.
- Confirm processor roles, DPAs, hosting/subprocessor locations and transfer
  safeguards for IONOS, GitHub and every supported user-selected AI provider.
- Confirm backup encryption and the deletion-after-restore procedure before
  treating the backup row as human-reviewed.
