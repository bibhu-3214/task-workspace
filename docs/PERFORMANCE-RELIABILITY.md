# Performance and recovery — 31 October 2026

This local web pass extends the premium interface work on `feat/premium-workspace-polish` in all five apps. It does not publish a release or change production data. Product-specific feature expansion is recorded in [PRODUCT-WORKFLOWS.md](PRODUCT-WORKFLOWS.md).

## Changes

- **BillFlow:** deferred the workspace recipe map from the public entry bundle. Public/shared Tailwind recipes are generated from source usage; `check:styles` fails if their coverage drifts. Workspace imports retain the complete recipe behavior without repeating public recipe strings in the deferred map. Fixed the restore rehearsal's Python import path.
- **Perqelle:** the command palette evaluates when opened; the service worker may still pre-cache its asset. Unsaved record editors ask before dismissal and warn before browser unload. Notes now have an explicit, unique label association. The production offline and private-route cache-exclusion checks passed.
- **Forma:** candidate intake and edit forms retain account/form-scoped text drafts in session storage. Recovery is explicit. Stale candidate drafts provide a read-only preview for copying rather than overwriting the current record.
- **Task Workspace:** task, project and note editors recover account-scoped drafts. Changed or removed originals recover as new entries for review; missing project references fall back to Inbox.
- **Film Journal:** the movie/review editor restores text, rating, genre, status and date fields. Changed originals recover as new entries for review.
- **The three connected workspaces:** a 15-second deadline covers both fetch and response-body reading. Network failures and timeouts do not replay writes. The error asks users to reload and check the saved result before retrying an uncertain write.
- **All five:** checked-in initial-JavaScript budgets and repeatable Chrome/WebKit/mobile Safari checks. Firefox projects are configured, but the installed local Firefox binary currently exits before navigation with `Could not find profile folder`.

## Draft behavior

Drafts are plaintext tab-scoped session storage, separate from saved server records. They survive refresh in that tab for up to 24 hours after the latest edit. Recovery never submits a record. Save success, explicit discard, sign-out, expired sessions and cross-tab account changes clear the relevant drafts. Authentication credentials and uploads are excluded; schema, field allowlists, size and age checks reject malformed snapshots. A blocked storage write leaves an explicit recovery-unavailable message and unload protection.

Forma keeps separate form keys per candidate/intake; Task Workspace and Film Journal keep one unfinished editor per account and require recovery/discard before another editor starts. BillFlow retains its existing invoice draft implementation. Perqelle has dismissal/unload protection, not refresh-persistent editor drafts.

## Production bundle baseline

| App            | Initial JavaScript, kB | Budget, kB |
| -------------- | ---------------------: | ---------: |
| BillFlow       |                 460.79 |        490 |
| perqelle       |                 562.54 |        575 |
| forma          |                 418.93 |        445 |
| task-workspace |                 466.61 |        490 |
| film-journal   |                 465.72 |        490 |

BillFlow's public entry is 8.8% smaller than the reconstructed pre-split build made with the same installed Vite CLI (505,235 → 460,794 bytes). Perqelle's entry fell from 571,051 to 562,543 bytes, about 1.5%. Workspace JavaScript still loads after sign-in/use; these figures are initial emitted JavaScript, including static preload/theme scripts, not total application download or measured page-load speed. No field Core Web Vitals claim is made. Perqelle retains its existing >500 kB build advisory.

## Repeatable checks

From each app root:

```sh
npm run check
npm test
npm run build
npm run check:bundle
npm run test:restore
```

BillFlow's Jest command can add `-- --runInBand`. BillFlow's public style coverage also has `npm run check:styles`; regenerate intentionally with `node scripts/check-style-recipes.cjs --write` after changing shared recipe usage.

Browser checks use disposable services/accounts (or browser-scoped demo data for BillFlow/Perqelle). They do not edit the running user's business records:

```sh
# BillFlow
PLAYWRIGHT_CHANNEL=chrome npm run test:a11y
npm run test:e2e:cross -- --project=webkit --project=mobile-safari

# Forma, Task Workspace and Film Journal
PLAYWRIGHT_CHANNEL=chrome npm run test:e2e
npm run test:e2e:cross -- --project=webkit --project=mobile-safari

# Perqelle
PLAYWRIGHT_CHANNEL=chrome npm run test:e2e -- --workers=1
npm run test:e2e:cross -- --workers=1
npm run test:offline
```

All restore commands start a private disposable PostgreSQL cluster, dump synthetic data, restore into a separate database and compare records/account state. The new three-app drills also compare JSON and revision continuity and reject non-ephemeral settings/socket paths before setup. They prove the local procedure, not a hosted backup policy.

## Release limits

Hosted staging, production error monitoring and a restore from the actual hosted backup provider still need environment-specific configuration and verification. No provider account, paid service, production deployment, remote commit or push is included. Firefox's local launch limitation is not an application test pass; its CI projects remain enabled for a supported runner. macOS WebKit emulation does not replace testing on physical iOS devices.

The saved verification results are in `PERFORMANCE-RELIABILITY-VALIDATION.md` beside this file. Local logs, bundle measurements and screenshots: `/private/tmp/portfolio-reliability-20261031/`.
