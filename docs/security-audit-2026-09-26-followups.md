# Follow-ups — security audit 2026-09-26

Status of the fixes: see the "Remediation" section of
`security-audit-2026-09-26.md`. All fixes are on branch
`claude/security-bug-audit-3ottue` (not on `main`, not deployed).

## 1. Get the fixes live

- [ ] Merge `claude/security-bug-audit-3ottue` into `main`. Only a push to
      `main` deploys; the branch alone never reaches
      `flashkarte.christopherrehm.de`.
- [ ] Watch the GitHub Actions run (build → tests → GHCR → VPS restart). See
      `deployment.md` for logs and rollback.

## 2. Live checks after deploy

- [ ] **Existing sessions survive.** Stay logged in across the deploy (web
      and Android). Old access tokens are refused once and should be
      silently refreshed. If you get logged out or see errors, that is a bug.
- [ ] **2FA login works.** Log in to a 2FA account: password → code → in.
      Also test a backup code; the same backup code must fail the second time.
- [ ] **Password reset works once.** Request a reset, use the link, then
      open the same link again: it must say invalid or expired.
- [ ] **Feedback controls (web).** As the course owner, "Comment on screen"
      and "I need more on this" are visible and work. As a second account
      enrolled in that public course, they are hidden and a short note says
      they are for the course author.

## 3. Open work

- [x] **Android: finding 4.** Fixed: the lesson screen reads `lesson.is_owner`
      and shows the comment / "I need more on this" controls only to the
      course author; enrolled learners see a short note. Unit tests pass; the
      new Compose UI test compiles but needs an emulator to run.
- [ ] **Android: confirm refresh on 401.** Confirm the app refreshes its
      access token after a 401, not only at expiry. If it doesn't, the
      one-time token rejection from fix 1 logs Android users out once.
- [ ] **Not run in this session:** Playwright browser/accessibility suite and
      Android tests. Run them before or after merging.
- [ ] **Later (product decision):** if learners should ever give feedback on
      shared courses, it needs per-learner privacy, owner-only replies and
      resolving, a per-learner help cap (the cap of 5 open requests is
      currently per course), and a rule on whether a learner's request may
      make the owner's AI change a shared course.
