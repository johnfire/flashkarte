# Bug Reporting (Issue #24) Implementation Plan

> **For agentic workers:** Inline execution. Steps use `- [ ]` tracking.

**Goal:** Authenticated users file bugs from Android; server files them as GitHub issues on `johnfire/flashkarte`, no-op-logging when `GITHUB_TOKEN` is unset.

**Architecture:** Android ReportBugScreen → `POST /api/bug-reports` → controller (validate + look up email) → service (build issue) → `github/issues.createIssue` (fetch).

**Tech Stack:** Express/TS + Jest/supertest; Kotlin/Compose + Hilt + Retrofit + JUnit/mockk.

---

## Task 1: Server GitHub issue client

**Files:** Create `packages/server/src/github/issues.ts`

- [ ] `createIssue({title, body, labels}): Promise<{url: string|null}>` reading `GITHUB_TOKEN` + `GITHUB_REPO` (default `johnfire/flashkarte`); built-in `fetch`; logs + returns `{url:null}` when token unset or non-2xx.

## Task 2: Server bug-reports domain

**Files:** Create `packages/server/src/domains/bug-reports/{bug-reports.service.ts,bug-reports.controller.ts,bug-reports.routes.ts}`; Modify `packages/server/src/app.ts`

- [ ] service: `buildIssueBody(input)` (exported) + `submitBugReport(input)` → `createIssue` with labels `["bug","from-app"]`, returns `{issueUrl}`.
- [ ] controller: clamp/validate title(≤140, required) + description(≤8000, required) + optional short fields; `getCurrentUser(req.userId)` for email; 201 `{issueUrl}`.
- [ ] routes: rate-limit 5/10min (skip under test), `POST "/"`.
- [ ] app.ts: `app.use("/api/bug-reports", bugReportsRouter)` after `requireAuth`.

## Task 3: Server tests

**Files:** Create `packages/server/src/domains/bug-reports/bug-reports.routes.test.ts`

- [ ] Mock service + `../auth/auth.service` + db/client + auth middleware. Assert 201 + `submitBugReport` called with `objectContaining({title, description, email})`; 422 on missing title.
- [ ] Run `npm test` in packages/server → green.

## Task 4: Android data layer

**Files:** Modify `Dtos.kt`, `FlashkarteApi.kt`; Create `data/repository/BugReportRepository.kt`

- [ ] DTOs `BugReportRequest`/`BugReportResponse`; api `reportBug`; repository `submit(title, description): String?` filling appVersion/platform/device.

## Task 5: Android screen + nav

**Files:** Create `ui/screens/reportbug/{ReportBugScreen.kt,ReportBugViewModel.kt}`; Modify `SettingsScreen.kt`, `ui/navigation/NavGraph.kt`

- [ ] ViewModel (`MutableStateFlow` state, `canSubmit`, `submit()`); screen (title + multiline + submit); Settings "Report a bug" button + `onReportBug` param; nav route `"report-bug"`.

## Task 6: Android test + full build

**Files:** Create `app/src/test/java/com/flashmd/ui/ReportBugViewModelTest.kt`

- [ ] blank → `canSubmit=false`; success → success message; `ApiException` → error + not submitting.
- [ ] Run all unit tests (compile gate) → green.

## Task 7: Commit

- [ ] `git add` + commit on `main` (do not push — batch with #2/#3).
