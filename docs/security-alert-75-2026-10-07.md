# Sharp alert 75 remediation

Date: 2026-10-07. Status: fixed locally; GitHub closure requires a push and rescan.

## Change

[Dependabot alert 75](https://github.com/johnfire/flashkarte/security/dependabot/75)
reports [GHSA-wq5f-xc86-pv6w](https://github.com/lovell/sharp/security/advisories/GHSA-wq5f-xc86-pv6w)
in Sharp's bundled SVG renderer. Upgrade the web development dependency from
Sharp 0.35.4 to 0.35.5 and update its optional platform binaries in the lockfile.
The installed Linux binary reports librsvg 2.63.2, the patched renderer.

The affected project operation is social-preview SVG-to-PNG generation in
`packages/web/scripts/make-og.mjs`. A regression test verifies the minimum fixed
Sharp/librsvg versions and checks PNG dimensions and pixel output.

CI now audits development dependencies as well as production dependencies, so
vulnerabilities in build and asset-generation tools are included in the gate.

## Verification

- Dependency-security regression suite: passed.
- Web tests: 51 files, 251 tests passed.
- Web build, including TypeScript checks: passed.
- Root lint, formatting of changed files, and whitespace checks: passed.
- Full dependency audit: **failed**, exit 1, with 34 high-severity affected package
  entries arising from the two separate advisories below. Sharp is absent from
  the audit results after the upgrade.

## Remaining audit findings

These packages were not changed by this Sharp upgrade:

- `@modelcontextprotocol/sdk` 1.29.0:
  [GHSA-6qxp-vccf-f47h](https://github.com/advisories/GHSA-6qxp-vccf-f47h), an OAuth
  credential-disclosure issue. The audit reports a fix is available.
- `braces` 3.0.3:
  [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), stack
  exhaustion through deeply nested patterns. The audit reports no available fix;
  its affected dependency chains account for most of the 34 package entries.

The expanded CI audit will fail while these high-severity findings remain.
They are recorded as follow-up remediation work; no advisory has been dismissed
or excluded to make the audit pass.
