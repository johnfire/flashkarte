# Dependabot remediation — 6 October 2026

The four open Flashkarte alerts were addressed on `main` with transitive dependency overrides and a regenerated npm lockfile. No alert was dismissed and no test was skipped or removed.

| Alert                                                                | Dependency                | Change                                                                                                                                                                      |
| -------------------------------------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#72](https://github.com/johnfire/flashkarte/security/dependabot/72) | `proxy-addr`              | 2.0.7 → 2.0.8 for both Express 4 and the MCP SDK's Express 5 dependency.                                                                                                    |
| [#73](https://github.com/johnfire/flashkarte/security/dependabot/73) | `source-map-js`           | 1.2.1 → 1.2.2.                                                                                                                                                              |
| [#71](https://github.com/johnfire/flashkarte/security/dependabot/71) | `postcss-selector-parser` | 6.1.4 → 7.1.6 for Tailwind and `postcss-nested`.                                                                                                                            |
| [#74](https://github.com/johnfire/flashkarte/security/dependabot/74) | `sprintf-js`              | Removed from the tree by overriding only `@istanbuljs/load-nyc-config`'s `js-yaml` dependency to 4.3.2. The new parser uses `argparse` 2 and does not require `sprintf-js`. |

The YAML override is scoped to the coverage loader rather than replacing arbitrary consumers of the older API. The loader calls `js-yaml.load`, which remains available. Actual YAML configuration inheritance and list handling were tested. The CSS parser's major upgrade was checked with the complete web build and browser suite; Tailwind's generated CSS bundle hash remained `index-C8FU9Wt9.css`.

The application currently sets Express `trust proxy` to numeric hop count `1`, not the malformed IPv6 subnet from the advisory. The vulnerable dependency was upgraded regardless. Regression checks exercise the malformed mapped subnet and broad IPv6 subnet, preserve valid IPv4/mapped subnet behaviour, and confirm that an untrusted client cannot supply its own trusted forwarded address.

## Validation

`scripts/security/dependency-remediation.test.cjs` adds five checks to the root `npm test` command, so CI executes them automatically:

- Proxy subnet trust and forwarded-address handling.
- Prompt rejection of oversized indexed source-map offsets in an isolated worker.
- Correct ordinary source-map reconstruction and original source lookup.
- Parsing a 400 KB flat selector within a five-second worker deadline, preserving its content.
- Coverage YAML config inheritance plus absence of `sprintf-js` from the lockfile.

Completed locally:

- 1,391 unit/regression tests across all workspaces and the five new checks.
- 257 server integration tests in 35 suites against isolated Postgres 16.
- 27 Playwright browser tests against the built server and SPA, using the isolated database.
- All workspace typechecks, root lint and formatting checks.
- Shared, server, MCP and web builds.
- `npm ci --ignore-scripts --dry-run --offline --audit=false --fund=false` accepted the lockfile.
- `npm audit --omit=dev --audit-level=high`: **zero vulnerabilities**.
- `git diff --check` and formatting of the changed package manifests and regression file.

The first sandboxed workspace test run failed on HTTP listeners with `listen EPERM: operation not permitted 0.0.0.0`. The same full suite passed when allowed to open its local test listeners. The first oversized source-map test expected reconstruction; the patched consumer instead correctly rejected the invalid offset with `Section offset line must not exceed 10000000.` The assertion was corrected to require that explicit rejection. No vulnerable behaviour is accepted to make the suite pass.

## Remaining audit finding

The full npm audit still reports the separate **development-only** `braces` stack-exhaustion advisory [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). It propagates to 33 audit entries through Jest, Tailwind, development file watching and their parents. npm reports `fixAvailable: false`; `braces` 3.0.3 was already present in the previous committed lockfile. It is outside the four original GitHub alerts and was not introduced by these overrides. This report does not claim a clean full development audit.

The previous GitHub CI run for `1404b7f` failed at **Audit production dependencies (fail on High/Critical CVEs)**. Its e2e, secret scan, Android and Python jobs passed, while image build/deploy were skipped. The production audit now passes locally. GitHub's post-push alert rescan and CI/deployment remain separate live checks; local tests alone do not prove deployment or alert closure.
