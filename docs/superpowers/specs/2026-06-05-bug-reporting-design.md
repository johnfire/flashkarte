# Bug Reporting (Issue #24) — Design

**Goal:** Let an authenticated user file a bug from the Android app; the server files it directly as a GitHub issue on `johnfire/flashkarte`.

**Delivery mechanism:** B — the server calls the GitHub REST API itself (`POST /repos/{owner}/{repo}/issues`). No mail-reading agent in the loop. Chosen because it deterministically lands the report in the Issues list and is testable end-to-end.

## Architecture

```
Android ReportBugScreen → POST /api/bug-reports (JWT)
  → bug-reports.controller (validate, look up reporter email)
  → bug-reports.service.submitBugReport (build title + body)
  → github/issues.createIssue (fetch → GitHub API)   ← no-op + log when GITHUB_TOKEN unset
  ← { issueUrl }
```

### Server

**`src/github/issues.ts`** — infra module, mirrors `email/mailer.ts`:

- `createIssue({ title, body, labels }): Promise<{ url: string | null }>`
- Reads `GITHUB_TOKEN` and `GITHUB_REPO` (default `johnfire/flashkarte`).
- Uses Node 18+ built-in `fetch` (Node 23 here) — no new dependency.
- When `GITHUB_TOKEN` is unset: logs the issue via `logger` and returns `{ url: null }` — so dev/CI/tests never call the network and reports are not lost.
- On a non-2xx response: logs the status/body and returns `{ url: null }` (best-effort; never throws into the request path beyond a generic failure the controller maps).

**`src/domains/bug-reports/`**

- `bug-reports.service.ts` — `submitBugReport(input): Promise<{ issueUrl: string | null }>`.
  - `input`: `{ title, description, appVersion?, device?, platform?, userId, email }`.
  - Pure helper `buildIssueBody(input)` assembles a Markdown body: reporter email + userId, app version, platform, device, then the user's description inside a fenced quote block (so user text cannot inject Markdown/headings). Exported for unit testing.
  - Labels: `["bug", "from-app"]`.
  - Title: `[app] <title>` trimmed.
- `bug-reports.controller.ts` — `wrapAsync`:
  - Clamp + validate: `title` required (≤140), `description` required (≤8000); `appVersion`/`platform`/`device` optional short fields.
  - Look up reporter email via `getCurrentUser(req.userId)`.
  - Call service, respond `201 { issueUrl }`.
- `bug-reports.routes.ts` — `Router`; rate-limit 5 / 10 min (skipped under `NODE_ENV==="test"`), `POST "/"`.

**`src/app.ts`** — register `app.use("/api/bug-reports", bugReportsRouter)` in the authenticated block (after `requireAuth`).

### Android

- **DTOs** (`Dtos.kt`): `BugReportRequest(title, description, appVersion?, platform?, device?)`, `BugReportResponse(issueUrl: String? = null)`.
- **API** (`FlashkarteApi.kt`): `@POST("api/bug-reports") suspend fun reportBug(@Body body: BugReportRequest): BugReportResponse`.
- **Repository** (`BugReportRepository.kt`): `submit(title, description): String?` → fills `appVersion` from `BuildConfig.VERSION_NAME`, `platform="android"`, `device` from `Build.MANUFACTURER + Build.MODEL` / `Build.VERSION.SDK_INT`; returns `issueUrl`.
- **Screen** (`ui/screens/reportbug/ReportBugScreen.kt` + `ReportBugViewModel.kt`): title field + multiline description + Submit. ViewModel backs state with plain `MutableStateFlow` (assertable `.value`). Submit disabled when title or description blank. Success → confirmation message + auto-pop; error → inline message.
- **Settings** (`SettingsScreen.kt`): a "Report a bug" `OutlinedButton` in a new "Feedback" section; `SettingsScreen` gains an `onReportBug: () -> Unit` param.
- **Nav** (`NavGraph.kt`): route `"report-bug"`; Settings tab navigates to it; `ReportBugScreen` has `onBack`.

## Error handling

- Server: missing title/description → 422 (`ValidationError`). GitHub failure / token unset → still 201 with `issueUrl: null` (report logged); the app shows "Thanks — your report was sent."
- Android: `ApiException` → inline error, Submit re-enabled.

## Testing

- **Server** `bug-reports.routes.test.ts`: mocks `./bug-reports.service` + `../auth/auth.service` (getCurrentUser) + db/client + auth middleware. Asserts 201, `submitBugReport` called with `objectContaining({ title, description, email })`, and 422 on missing title.
- **Server** service unit: `buildIssueBody` includes the reporter email and the description; `createIssue` returns `{url:null}` and does not throw when `GITHUB_TOKEN` unset.
- **Android** `ReportBugViewModelTest`: blank input keeps `canSubmit=false`; successful submit sets a success message; `ApiException` sets error and clears submitting.

## Out of scope

- No DB table for reports (issues live on GitHub).
- No attachments/screenshots.
- Web app entry (Android-only per the issue).
