# GDPR Audit Report — flashkarte

**Audit date:** 2026-07-19  
**Scope:** Repository and deployment documentation review  
**Assessment:** Technical/privacy gap analysis, not legal advice  
**Overall status:** Privacy governance needs remediation before claiming GDPR readiness.

## Executive summary

flashkarte has strong privacy-by-design controls: self-service data export and
deletion, hashed credentials, optional 2FA, encrypted Android storage, scoped
AI credentials, audit logging, and stated EU primary storage. Its largest risks
are transparency and operational-accountability gaps around analytics,
third-party disclosure, retention, transfers, and rights handling.

## Findings

| Priority | Finding | Repository evidence | Required action |
| --- | --- | --- | --- |
| P0 | Privacy policy contradicts analytics implementation. | `packages/web/index.html` loads Umami from `stats.christopherrehm.de`; the policy says no third-party analytics or tracking. | Correct the notice; document operator, data categories, cookies, legal basis/consent model, retention, and opt-out. |
| P0 | GitHub disclosure is absent. | `packages/server/src/github/issues.ts` sends email, user ID, report content, and app/device metadata to GitHub when configured. | Disclose GitHub; document recipient role, DPA, location, transfer safeguard, retention, and erasure path. |
| P0 | Article 13 notice is incomplete. | Policy lacks per-purpose legal bases, recipient categories, transfer safeguards, exact retention, complaint right, and data-provision consequences. | Replace generic copy with a reviewed processing table based on `gdpr-article-30-record.md`. |
| P1 | Deletion promise omits retained audit and backup data. | Audit policy retains pseudonymous audit data 12 months; Compose keeps backups up to three months. | Explain exceptions, lawful basis, retention, and eventual purge; implement the audit purge job. |
| P1 | Rights process is incomplete. | JSON export and self-service deletion exist; notice omits restriction, objection, complaint route, one-month response, and identity verification. Email change is not self-service. | Create DSAR workflow/register and add email change with re-verification. |
| P1 | AI/MCP transfer notice is insufficient. | User-selected AI providers receive deck content when users invoke MCP tools. | Explain user-initiated transfer, data categories, provider responsibility, possible third-country transfers, and sensitive-content caution. |
| P1 | Processor and transfer governance is undocumented. | VPS, SMTP, GitHub, Umami, and selected AI providers may process data; contracts and locations are not recorded. | Maintain a processor register, Article 28 DPAs, and Chapter V transfer assessments. |
| P1 | Retention is incomplete. | Logs, GitHub issues, analytics, and MCP token storage lack complete retention/deletion rules. | Configure and test retention, rotation, access controls, and deletion verification. |
| P2 | Diagnostics policy is stale. | Current app logging minimizes client-error content; policy still says error messages and stacks may be sent. | Align the public policy with the current implementation and disclose access-log/IP processing. |
| P2 | Children wording needs legal review. | “Not directed at children under 13” does not establish an EU/German online-consent approach. | Obtain counsel review; age-gate/obtain parental authorisation if required or revise wording. |
| P2 | No breach-response procedure was found. | Code has logging/audit controls but no documented incident response process. | Add a runbook for triage, 72-hour assessment, authority notification, user notice, and postmortem. |

## Existing strengths

- Structured JSON account export excludes raw API-key secrets.
- Account and individual deck deletion are available.
- Passwords, API keys, refresh tokens, and recovery tokens are hashed.
- 2FA secrets are encrypted and backup codes are hashed.
- Android local database/session material is encrypted.
- MCP uses scoped credentials and OAuth PKCE; telemetry avoids tool input bodies.
- Audit history has database-level append-only protection.

## Remediation plan

### First 30 days

1. Correct the analytics statement and disclose all recipients.
2. Publish legal bases, retention, rights, complaint route, and DSAR contact/process.
3. Confirm Umami cookies/device identifiers and implement consent if required.
4. Confirm provider roles, locations, contracts, and transfer safeguards.
5. Minimise or suspend any recipient without a documented compliance position.

### Days 31–60

1. Finalise and approve `gdpr-article-30-record.md`.
2. Execute/obtain Article 28 DPAs and document international-transfer safeguards.
3. Set retention for logs, GitHub issues, analytics, MCP tokens, and backups.
4. Create DSAR and incident-response runbooks.
5. Implement and monitor the audit-retention purge mechanism.

### Days 61–90

1. Review access to production, backups, logs, and third-party systems.
2. Run a breach tabletop exercise and a restore/deletion verification.
3. Assess whether free-text decks, AI transfers, or processing scale requires a DPIA.
4. Re-review privacy notice and processor register after every material integration change.

## Legal reference points

- Articles 5–6: principles and lawful bases.
- Article 13: privacy information at collection.
- Articles 15–22: data-subject rights.
- Articles 28 and 30: processor contracts and processing records.
- Articles 32–34: security and breach handling.
- Articles 44 onward: international transfers.

Official GDPR text: https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng
