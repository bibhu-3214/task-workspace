# Validation record — 31 October 2026

Local, uncommitted `feat/premium-workspace-polish` work across five web apps. This supplements the earlier premium UI baseline. No commit, push, merge or production deployment was performed in this pass.

| App | Frontend/domain tests | Chrome browser cases | WebKit/mobile Safari cases | Local restore rehearsal |
| --- | ---: | ---: | ---: | --- |
| BillFlow | 160 | 2 | 4 | Passed |
| Perqelle | 219 | 18 | 16 | Passed |
| Forma | 39 | 6 | 4 | Passed |
| Task Workspace | 20 | 5 | 4 | Passed |
| Film Journal | 20 | 5 | 4 | Passed |

All **458 frontend/domain tests**, **68 selected browser cases** and **two production offline cases** passed. Two keyboard-only cases per Perqelle mobile run were skipped by the existing test definition; those skips are excluded. Focused reruns after fixes are also excluded from these case totals. Ten additional budget-tool regression tests passed. BillFlow's existing tooling suite passed. Type, lint, Python formatting/checks for the changed API tooling, and all five builds passed. Both BillFlow account modes and Perqelle's public build passed their bundle budgets.

The browser cases cover interrupted saves with no automatic retry, explicit draft recovery after refresh, restored dropdown values, successful-save cleanup, sign-out cleanup, deferred command loading, discard confirmation, setup progress, filter recovery, phone layout, focus and automated accessibility. The candidate unit regression confirms that an older draft cannot overwrite a candidate edited since that draft began; its text remains available for copying. Storage tests cover blocked storage, expiry, corruption, size bounds, credential/file exclusion and account isolation.

All five local PostgreSQL dump/restore rehearsals passed. The three new drills also refused direct execution outside the explicitly disposable runner. BillFlow's first rehearsal exposed a missing Python import path; it was fixed and the rehearsal passed. Earlier browser failures from an implicit textarea label and navigation before the prior route finished were corrected and rerun. Accessibility scans now wait for the route, fonts and repaint; the Safari/mobile Safari reruns passed without suppressing accessibility rules.

**Firefox is unverified locally.** Its installed binary exits before a page is created with `Could not find profile folder`. Repeating with a private canonical temporary profile path had the same result. The Firefox projects remain configured in CI; there is no remote CI result for these unpushed changes.

## Production artifact checks

BillFlow's local entry contains 460,794 bytes; its connected entry contains 461,621 bytes, both below 490,000. The deferred map now contains only workspace-only recipes. Perqelle's public entry contains 562,560 bytes, below 575,000. All five initial-script budgets include static preload and theme scripts and have a regression test for the selected production directory. Assets needed after sign-in or interaction remain deferred.

## Local loading baseline

| App | Median local LCP, ms | Median DOM content loaded, ms | Observed CLS |
| --- | ---: | ---: | ---: |
| BillFlow | 792 | 701 | 0 |
| perqelle | 1096 | 873 | 0 |
| forma | 664 | 565 | 0 |
| task-workspace | 672 | 571 | 0 |
| film-journal | 672 | 574 | 0 |

Conditions: three cold HTTP-cache Chrome runs per app at 390×844, simulated 40 ms latency, 10 Mbps and 4× CPU throttling. Local production static artifacts; signed-out session restoration is synthetic and service workers are blocked for the measurement. Each sample observes the visible heading/fonts for one second. These are a reproducible lab baseline from this pass, not field Core Web Vitals, an INP measurement, hosted performance or a before/after speed claim. A later final refinement removed duplicate workspace-only style data; the signed-out BillFlow entry changed by nine bytes.

The final read-only service check found all five existing frontend/API pairs healthy (HTTP 200), with zero observed entry-page browser exceptions. Test services and measurements used separate ports/contexts and disposable data. Phone recovery screens were visually reviewed. Real hosted staging, monitoring and hosted-provider restore verification remain outstanding.

## Evidence

Local artifacts are in `/private/tmp/portfolio-reliability-20261031/`: `final-checks.json`, `closeout.json`, `runtime-final.json`, `browser-final.json`, `BillFlow-latest-validation.json`, `loading-lab.json`, bundle measurements, restore logs and `health-final.log`. The initial `final-checks.json` records the first public-budget checker failure; `perqelle-public-budget-final.log` and the budget regression tests record the corrected result. Earlier failures remain in the evidence directory rather than being presented as passes. Browser screenshots/traces are also in each app's ignored test-output directory.

Implementation and commands: [PERFORMANCE-RELIABILITY.md](PERFORMANCE-RELIABILITY.md).
