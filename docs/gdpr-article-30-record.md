# Record of Processing Activities (GDPR Article 30)

**Controller:** Christopher Rehm, Alpenstr. 3, 86836 Klosterlechfeld, Germany  
**Privacy contact:** car2187bus@pm.me  
**Product:** flashkarte  
**Prepared:** 2026-07-19  
**Status:** Draft — validate actual providers, locations, contracts, and legal bases before relying on it.

## Scope

This record covers processing evidenced in the repository and deployment
documentation. It must be reconciled with the live production configuration.

## Data subjects

- Registered web and Android users.
- Users who connect an AI client through the hosted MCP service.
- Users who submit bug reports.
- Website visitors where analytics or access logs apply.

## Processing activities

| Activity                   | Purpose and proposed legal basis                                                                                               | Personal data                                                                                                                          | Recipients / processors                                                      | Retention                                                                                                                                                                     | Main controls                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Account and authentication | Provide accounts and prevent abuse. Proposed basis: contract, Art. 6(1)(b); security: legitimate interests, Art. 6(1)(f).      | Email, account ID, password hash, refresh/verification/reset-token hashes, 2FA state and encrypted TOTP seed.                          | IONOS VPS in Frankfurt, Germany: PostgreSQL and self-hosted Postfix/Dovecot. | Account lifetime; token expiry per application policy; erase on account deletion except stated audit/backup exceptions. Postfix delivery/error logs are retained for 90 days. | TLS, bcrypt hashes, rate limits, HttpOnly cookies, optional TOTP.                        |
| Decks and study            | Store user content and schedule study. Proposed basis: contract, Art. 6(1)(b).                                                 | Deck/card free text, filenames, categories, review history, scheduling/progress, sharing preference.                                   | IONOS VPS in Frankfurt; encrypted Android local database.                    | Account lifetime; individual deck or full account deletion; backups expire within three months.                                                                                | Authenticated ownership checks; encrypted Android storage.                               |
| API keys and MCP           | Connect a user-selected AI client. Proposed basis: contract, Art. 6(1)(b).                                                     | API-key hash/prefix/name/scope, OAuth session/refresh-token material, audit actor ID, request metadata.                                | Hosted MCP service; user-selected AI provider when invoked.                  | Keys until revoked/deleted; encrypted MCP refresh-token records and tombstones expire after 30 days; access sessions expire after one hour.                                  | Hashed/scoped keys, OAuth PKCE, encrypted MCP store, correlation IDs.                    |
| User-invoked AI            | Let an AI client create/manage decks at the user’s request. Proposed basis: explicit user action / requested service; confirm. | Deck/card content and tool input/output transmitted through MCP.                                                                       | User-selected AI provider; may involve third-country transfer.               | Determined by the AI provider; disclose to users.                                                                                                                             | Scoped credentials; no tool input bodies in MCP telemetry.                               |
| Diagnostics and logs       | Debug errors, security, and reliability. Proposed basis: legitimate interests, Art. 6(1)(f).                                   | Client-error metadata, app/version/platform/context, request IDs; infrastructure may process IP/access logs.                           | IONOS VPS: application, Apache proxy, and Postfix logs.                      | 90 days; dedicated daily rotation policies enforce the limit.                                                                                                                 | Redaction/minimisation, rate limiting, and restricted host access.                       |
| Audit history              | Security, accountability, and incident investigation. Proposed basis: legitimate interests and/or legal obligation; confirm.   | Pseudonymous actor ID, action, target ID, correlation ID, limited state, timestamp, outcome.                                           | PostgreSQL.                                                                  | 12 months; a host-only daily purge temporarily disables the delete-prevention trigger in one transaction, purges expired rows, then re-enables it.                           | Append-only triggers; transactional study audit writes.                                  |
| Bug reports                | Receive and resolve defects. Proposed basis: legitimate interests or requested service; confirm.                               | Pseudonymous account ID, report text, app version, and platform.                                                                       | Private GitHub Issues repository.                                            | 90 days from creation; daily scheduled deletion and immediate deletion for verified erasure requests.                                                                         | Authenticated submission; length limits; safe GitHub rendering.                          |
| Analytics                  | Understand site use. Basis: consent, Art. 6(1)(a).                                                                             | Umami page, referrer, browser, operating-system, device, and country metrics. Query-string routes are excluded from analytics loading. | Self-hosted Umami on the IONOS VPS in Frankfurt, Germany.                    | 90 days; a daily purge job enforces the limit.                                                                                                                                | Loaded only after opt-in; configuration must remain free of personal-data events.        |
| Backups                    | Recover availability and integrity. Proposed basis: legitimate interests, Art. 6(1)(f).                                        | PostgreSQL contents, including accounts, content, progress, hashed credentials, and audit records.                                     | Backup container and VPS storage.                                            | 7 daily, 4 weekly, 3 monthly backups.                                                                                                                                         | Access, encryption, and restore testing need operational confirmation.                   |

## Recipient and transfer register

Confirm for each recipient whether it is a processor or independent controller,
its hosting location, its Article 28 DPA (if required), subprocessors, and any
Chapter V transfer safeguard:

- VPS/infrastructure provider.
- SMTP provider.
- GitHub.
- Umami operator.
- AI providers selected by users.

## Retention controls implemented

| Category                 | Control                                                              |
| ------------------------ | -------------------------------------------------------------------- |
| Account/content/progress | Backups expire within three months; restoration must preserve expiry.|
| Audit records            | Daily privileged 12-month purge is installed and must be monitored.  |
| Logs and proxy logs      | Dedicated daily 90-day rotation policies are installed.              |
| GitHub tickets           | Daily 90-day deletion workflow and verified-erasure path are defined.|
| MCP OAuth store          | Refresh-token and tombstone expiry is 30 days; access sessions 1 hour.|
| Analytics                | Consent gate and daily 90-day Umami purge are installed.             |

## Evidence of technical and organisational measures

- TLS at the reverse proxy and certificate pinning in Android.
- Bcrypt passwords, hashed API keys/tokens, encrypted TOTP secret, and hashed backup codes.
- Encrypted Android local database/session material.
- Scoped MCP credentials, OAuth PKCE, rate limits, security headers, and CORS controls.
- Self-service JSON export and account deletion.
- Correlation IDs, structured logs, audit trails, and database backups.

## Controller confirmations

1. Confirm a lawful basis for every activity.
2. Confirm provider roles, locations, DPAs, and transfer safeguards.
3. Approve exact retention and deletion procedures.
4. Record authorised access to production, backups, logs, and GitHub.
5. Make the completed record available to the supervisory authority on request.
