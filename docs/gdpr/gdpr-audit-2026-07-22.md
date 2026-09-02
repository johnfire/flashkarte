# GDPR technical audit — flashkarte — 2026-07-22

> **This is not legal advice.** This report lists technical findings from a
> code, database, and deployment review against GDPR / BDSG / TDDDG. Legal
> conclusions — legal basis, contract status, purposes — require a human
> (lawyer/DPO) and are explicitly flagged as judgment calls below.

**Scope:** Monorepo (`web`, `server`, `mcp`, Android deployment configuration),
the live IONOS VPS, and its production PostgreSQL schema/data were audited
read-only. Live checks confirmed production image `b3944b9`, healthy app/MCP
containers, migration `017_email_change.sql`, retention jobs, and backups.
**Auditor:** Codex, gdpr-audit skill v1.1
**Previous audit:** [2026-07-19 repository audit](../gdpr-audit-report-2026-07-19.md)

## Summary

The technical controls are substantially stronger than in the previous audit:
the application has self-service export, deletion, rectification and verified
email changes; production log, analytics, audit, mail and backup retention is
configured; and analytics is consent-gated. Production database checks found
no orphan refresh/verification tokens and no audit records older than 12
months.

No violation indicator was demonstrated by the reviewed technical state. One
technical gap remains: consent is stored only in the visitor's browser, so the
controller cannot presently evidence a specific consent record. Three matters
require legal/operational confirmation: processor/transfer arrangements,
backup encryption/restoration practice, and child/age handling. The Google
Play data-safety declaration also needs a manual consistency review.

## Findings

### Violation indicators

None demonstrated in this technical audit.

### Gaps

#### F-01 — Analytics consent is not demonstrably recorded by the controller (Art. 7(1), TDDDG §25)

- **Evidence:** `packages/web/src/components/AnalyticsConsentBanner.tsx:47-52`
  records the accept/reject decision and expiry only in browser `localStorage`.
  `:20-27` loads self-hosted Umami only after an accepted decision.
- **Why it's a problem:** The gate itself prevents analytics before consent,
  but no server-side or otherwise controller-controlled record can demonstrate
  who/when/scope of a consent if that proof is required.
- **Suggested fix:** Obtain counsel's view on a privacy-preserving consent log
  for anonymous visitors; if required, record a consent event with minimal
  pseudonymous evidence, purpose/version and withdrawal.

#### F-02 — Store privacy disclosures need a release-time consistency check (Art. 13/14; Google Play policy obligation)

- **Evidence:** Android is built and released by
  `.github/workflows/android-release.yml:1-69`, while the repository contains
  no copy of the Google Play Data safety declaration or configured privacy
  policy URL.
- **Why it's a problem:** The mobile app processes account, deck/study,
  diagnostics and optional analytics data described in this report. The store
  declaration is not verifiable from code and can drift from the live policy.
- **Suggested fix:** Before each material data-flow release, manually verify
  the Play privacy-policy URL and Data safety answers against this report and
  the public policy.

### Needs legal judgment

#### F-03 — Processor and third-country-transfer arrangements (Art. 28, 44–49)

- **Context:** IONOS-hosted app/PostgreSQL/Postfix/Umami data stays in
  Frankfurt, Germany. Private GitHub Issues receive pseudonymous app bug
  reports (`packages/server/src/domains/bug-reports/bug-reports.service.ts`)
  and users can send selected deck content through their own AI provider via
  the MCP service (`packages/web/src/pages/PrivacyPage.tsx:80-88`).
- **Question for Chris/lawyer:** For IONOS, GitHub and each supported AI
  provider, confirm controller/processor role, DPA, hosting/subprocessors and
  any Chapter V transfer safeguard. The user-selected provider flow needs
  wording that accurately assigns responsibility without obscuring flashkarte's
  own disclosure duties.

#### F-04 — Backup encryption and deletion-after-restore procedure (Art. 5(1)(e), 32)

- **Context:** `docker-compose.prod.yml:110-125` retains 7 daily, 4 weekly and
  3 monthly database backups on the VPS. Live configuration confirmed those
  limits; the code/config does not demonstrate encryption of backup files or a
  restoration procedure that preserves their three-month expiry.
- **Question for Chris/lawyer:** Confirm that VPS/volume encryption and access
  controls are proportionate, document where backups reside, and approve the
  restore/deletion procedure.

#### F-05 — Minors and age of consent in Germany (Art. 8 GDPR)

- **Context:** The public policy says the service is not directed to children
  under 13 (`packages/web/src/i18n/locales/en.json`, `privacy.childrenBody`),
  but there is no age gate or parental-consent flow. Flashcard study can
  plausibly be used by minors.
- **Question for Chris/lawyer:** Decide the intended age audience and whether
  the policy/registration flow needs an Art. 8 Germany (age 16) mechanism.

#### F-06 — Purposes and lawful bases (Art. 6, 13)

- **Context:** The technical record identifies account, study, security,
  analytics, bug-report and MCP processing. Code cannot establish the actual
  purpose or lawful basis of each activity.
- **Question for Chris/lawyer:** Approve each Art. 6 basis, legitimate-interest
  balancing assessment where used, and the completed controller-facing privacy
  notice.

## Recipients & transfers table

| Recipient | Data sent | Country | Adequacy/mechanism | DPA status |
|---|---|---|---|---|
| IONOS VPS / self-hosted services | Account, content, study, logs, backups, analytics | Germany | EU processing; confirm hosting terms | Needs legal confirmation |
| GitHub private Issues | Pseudonymous account ID, bug-report text, app version/platform | Confirm with GitHub | Confirm transfer mechanism | Needs legal confirmation |
| User-selected AI provider | Deck/card content and tool input selected by user | Provider-dependent | Provider-dependent; may be Chapter V | User/provider terms do not replace confirmation |
| Self-hosted Postfix/Dovecot | Account email and delivery metadata | Germany | EU processing | Self-operated; confirm infrastructure terms |

## Checklist appendix

| Item | Status | Note |
|---|---|---|
| 1.1 Schema sweep | OK | Live schema inventory covers users, authentication tokens, decks/cards, review history, API keys and audit data. |
| 1.2 Special categories | N/A | No dedicated Art. 9 fields; deck/card free text can contain user-provided sensitive material. |
| 1.3 Uploads & media | N/A | Reviewed application exposes Markdown/deck import, not media/document storage. |
| 1.4 Derived/imported data | N/A | No enrichment, OCR or scraping flow found. |
| 1.5 Identifiers in URLs | OK | Analytics refuses query-string routes; verification/reset tokens are not sent to analytics. |
| 2.1 Access/export | OK | Authenticated JSON export in `account.service.ts:65-136`. |
| 2.2 Erasure | OK | Password-confirmed account deletion is transactional; documented backup/audit exceptions expire. |
| 2.3 Rectification | OK | Settings profile update and verified email-change flow exist. |
| 2.4 Restriction/objection | N/A | No automated marketing/profiling; DSAR runbook covers requests. |
| 2.5 Automated decisions | N/A | Spaced-repetition scheduling has no legal/significant decision effect. |
| 2.6 Identity + deadline plumbing | OK | `docs/dsar-runbook.md` specifies identity verification and request tracking; legal deadline remains operational. |
| 3.1 Outbound inventory | FINDING → F-03 | IONOS, GitHub, self-hosted Umami/Postfix and user-selected AI identified. |
| 3.2 LLM/AI APIs | FINDING → F-03 | Provider/country safeguards are not provable from repository. |
| 3.3 Frontend loads | OK | Only same-origin theme script plus consent-gated self-hosted analytics script found. |
| 3.4 Analytics & tracking | OK / FINDING → F-01 | Umami loads after consent and purges at 90 days; evidence record is local-only. |
| 3.5 Email/SMS providers | OK | Self-hosted Postfix/Dovecot on VPS; 90-day mail-log retention. |
| 3.6 Payment providers | N/A | No payment flow found. |
| 3.7 Error reporting / APM | OK | Diagnostics stay in application/server logs; no external APM found. |
| 4.1 Storage-access inventory | OK | Necessary theme/language/session state plus optional analytics-consent localStorage identified. |
| 4.2 Consent gating | OK | Umami script appended only after accepted decision. |
| 4.3 Consent quality | FINDING → F-01 | Equal accept/reject, expiry and withdrawal exist; controller-held proof absent. |
| 4.4 Dark patterns | OK | Equal-size accept/reject controls; E2E axe checks pass. |
| 5.1 PII in logs | OK | Structured app access log records path, pseudonymous IDs and timing, not email/body/token. |
| 5.2 Web-server logs | OK | Live dedicated Apache/application/mail log rotation is daily with 90-day maximum. |
| 5.3 Retention mechanism exists | OK | Live daily jobs purge Umami (90d), audit (12m), GitHub bug reports (90d); OAuth store uses shorter TTLs. |
| 5.4 Backups | FINDING → F-04 | Three-month retention is configured; encryption/restore handling needs confirmation. |
| 5.5 Data minimization | OK | Bug reports are pseudonymous and omit reporter email/device data. |
| 6.1 | OK | bcrypt password hashing. |
| 6.2 | OK | TLS reverse proxy and HTTPS-only public URLs; live health verified behind proxy. |
| 6.3 | OK | Authenticated routes and ownership checks are exercised by CI; spot-check only. |
| 6.4 | OK | Append-only audit log records user actions with correlation IDs. |
| 6.5 | OK / judgment | TOTP secret is encrypted; proportionality of volume/backup encryption is F-04. |
| 6.6 | OK | Structured logs, audit trail, health checks and `docs/incident-response-runbook.md` exist. |
| 7.1 | OK | Live schema matches migrations reviewed. |
| 7.2 | OK | Live queries found zero orphan refresh and email-verification tokens. |
| 7.3 | OK | Live query found zero audit rows older than 12 months. |
| 7.4 | OK | Test/CI credentials are fixture values; no production-data fixture found. |
| 8.1 | OK | Live deployment is IONOS Frankfurt, Germany per deployment evidence. |
| 8.2 | FINDING → F-04 | Backups are VPS-local and retained three months; encryption confirmation missing. |
| 8.3 | OK | Database/MCP stores are Docker volumes; no application media volume found. |
| 8.4 | OK | Production secrets are environment-injected; CI secret scan passed. |
| 8.5 | OK | CI uses synthetic Postgres and redacted security artifacts. |
| 9.1 §26 BDSG | N/A | No employee/HR data processing feature found. |
| 9.2 Art. 8 | FINDING → F-05 | Audience/age decision required. |
| 9.3 Impressum | OK | Public Impressum route exists. |
| 9.4 Privacy policy | OK / FINDING → F-06 | Public policy names identified recipients/retention; legal accuracy needs approval. |
| 9.5 App-store obligations | FINDING → F-02 | Store listing/declaration cannot be verified in repository. |
