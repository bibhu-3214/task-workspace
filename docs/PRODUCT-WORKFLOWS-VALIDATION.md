# Product workflow validation — 31 October 2026

Local work on `feat/premium-workspace-polish` across five web apps. The earlier premium interface and performance/recovery changes remain in the working trees. No commit, push, merge or deployment was performed in this product pass.

| App | Frontend/domain tests | Changed API tests | Chrome cases | Desktop/mobile Safari cases |
| --- | ---: | ---: | ---: | ---: |
| BillFlow | 165 | 59 | 3 | 6 |
| Perqelle | 223 | Not rerun; API unchanged | 102 | 16 |
| Forma | 42 | Not rerun; API unchanged | 7 | 6 |
| Task Workspace | 22 | Not rerun; API unchanged | 6 | 6 |
| Film Journal | 24 | 21 | 6 | 6 |

**476 frontend/domain tests, 80 changed-backend API tests and 164 broad browser cases passed.** Perqelle's frontend total is 179 Vitest cases plus 44 Node domain cases. Two production offline cases also passed. Existing mobile keyboard-only conditions skipped two Perqelle cases in Chrome and two in Safari; skips are excluded. Focused reruns and an extra screenshot run are excluded from these totals. Task's search-counter refinement was checked by rerunning its product workflow in all three supported local browser projects after the broad run.

Strict type, lint and build checks passed in all five apps. BillFlow's style recipe coverage and both changed APIs' Ruff checks/formatting passed. Both BillFlow account-mode builds and Perqelle's public build passed the existing bundle limits. No runtime dependency, database schema migration or budget increase was introduced.

## Workflow coverage

- **BillFlow:** unchanged-item scan merging; edited-line preservation and line/quantity limits; month-end/leap-year/backlog dates; anchor preservation during plan edits; current catalogue pricing; paused/future/cancelled-source refusal; stale revisions and idempotent preparation; atomic failed writes; backup validation; prepare/resume draft without issuing another invoice. Browser checks use isolated fictional demo records. API tests use disposable PostgreSQL.
- **Perqelle:** recorded rule-date classification; deadline-clamped snooze and show-again; calendar alarm text/escaping; record navigation; light/dark accessibility and phone bounds. The broader suite includes wallet, planning, transfer and backup workflows. Production offline navigation and private API/auth cache exclusion passed.
- **Forma:** saved-view parsing, uniqueness and URL filters; selected-only immutable bulk changes; reviewed cancel/confirm behavior; view restoration and account isolation; phone bounds. Each browser suite now starts a fresh temporary database so tests retain the real registration throttle without exhausting one shared loopback window. Production authentication limits were not changed.
- **Task Workspace:** local-date focus excluding completed work; search-aware counters; current-project quick add; an Overdue addition appearing in Today; failed-save retention and explicit recovery/retry; phone bounds.
- **Film Journal:** quoted/escaped CSV round trips, formula-safe export, duplicate/invalid import handling, reviewed append preserving existing reviews, saved list membership, optional-field API compatibility, failed-write preservation and phone bounds.

The full BillFlow accessibility checks now switch appearance through the real app control and use reduced motion during scans. Safari exposed a portal tooltip outside the app's landmarks. Descriptions now remain associated with the control inside the app, the portal renders a visual copy, and Escape dismisses it. Both themes passed without disabling accessibility rules. Earlier selector, header-normalization, draft-fixture and test-isolation failures remain in the local logs; final verification supersedes them.

## Production script budgets

| Build | Initial scripts, bytes | Existing limit, bytes |
| --- | ---: | ---: |
| BillFlow local accounts | 464,702 | 490,000 |
| BillFlow connected accounts | 465,529 | 490,000 |
| Perqelle default | 563,356 | 575,000 |
| Perqelle public | 563,373 | 575,000 |
| Forma | 425,941 | 445,000 |
| Task Workspace | 473,550 | 490,000 |
| Film Journal | 472,928 | 490,000 |

These are checked initial-script sizes, including static script/preload entries where present; they are not real-user latency measurements. Existing advisory warnings for large deferred chunks remain. The earlier loading lab is retained in `PERFORMANCE-RELIABILITY-VALIDATION.md`; no new field Core Web Vitals result is claimed.

## Data, services and visual review

BillFlow and Film Journal passed fresh local PostgreSQL dump/restore rehearsals using disposable fixtures. The preceding reliability pass records the other three apps' restore checks. These are local rehearsals, not restores from a hosted backup provider.

The two managed development services that required API reloads were restarted against their existing persistent database directories. SHA-256 hashes and collection counts for the default local-account workspaces matched before and after. Those default workspaces were empty; this check does not establish the content of every user account. No business records were created in the running local accounts by this validation. Mutating workflow tests use disposable databases or browser-scoped fictional data.

A final read-only Chrome check found HTTP 200 frontend/API responses for all five existing local apps and zero observed entry-page browser exceptions. All five new phone workflow screenshots were visually inspected; automated document-width checks passed. Test screenshots are synthetic and saved under the ignored output directories and the local evidence directory.

**Firefox remains unverified locally.** Its installed runtime exits before page creation with `Could not find profile folder`, as recorded in the preceding reliability pass. Firefox stays configured in CI; there is no remote CI result for these unpushed changes. WebKit emulation is not physical iOS-device acceptance. Hosted staging, production monitoring, real scanner/device testing and hosted-provider restore verification remain release work.

## Evidence and reproduction

Local evidence: `/private/tmp/product-upgrades-20261031/`.

- Final source checks: `BillFlow-final-tooltip.json`, `source-final-checks.json`, `final-checks.json`, latest Forma type/lint and bundle logs, and the per-app unit/build/budget logs. The first `final-checks.json` includes two subsequently corrected failures; current logs record the passing result.
- Browser checks: `release-workflows.json` and `*-release-*.log` for the final billing/recruitment/task checks; `full-browser-checks.json` and `*-full-*.log` for the broader task/film/rewards runs. Early failures in that first broad record are superseded by the release checks.
- API and recovery: `BillFlow-api-final.log`, `film-journal-api.log`, `closeout-checks.json` and the restore logs.
- Live checks: `health-final.log`, `live-data-preservation.json`, `service-reloads.json`; private read-only account snapshots contain hashes and counts only.
- Visuals and final state: `screenshots/`, `screenshots.json`, `source-manifest-final.json` and `closeout-final.json`.

Commands: all apps use `npm run check`, `npm test`, `npm run build` and `npm run check:bundle`. Perqelle's `npm run check` includes its tests/build. BillFlow additionally uses `npm run build:connected`; Perqelle uses `npm run build:public` and `npm run check:bundle:public`. For browsers, use BillFlow `npm run test:a11y`, the other apps' `npm run test:e2e`, and `npm run test:e2e:cross -- --project=webkit --project=mobile-safari`. Set `PLAYWRIGHT_CHANNEL=chrome` locally for Chrome; leave it unset for Playwright-managed CI browsers. The three smaller apps' connected browser runners create temporary PostgreSQL; they do not use the running workspace database. Forma's wrapper also accepts individual `.spec.ts` filenames and keeps each suite's output separately.

See [PRODUCT-WORKFLOWS.md](PRODUCT-WORKFLOWS.md) for feature behavior and limits.
