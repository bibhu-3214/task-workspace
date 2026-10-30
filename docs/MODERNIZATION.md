# TaskBox modernization

Scope: preserve the original tasks workflow while adding strict TypeScript, Tailwind CSS 4, accessible forms and dialogs, real Django sessions and owner-scoped PostgreSQL persistence.

The original repository remains in Git history. No request is made to the retired Heroku service, no JWT is stored in browser storage, and accounts/data are separate from the other projects. Repository archival is managed separately from the app's deployment configuration.

Local web: http://127.0.0.1:5183
API: loopback port 8103.

Production setup requires HTTPS, an explicit host list, a private secret, PostgreSQL and tested backups. Provider sign-in, email recovery, domain registration and hosted deployment are not configured by this change. Do not treat local validation as a hosted-release or compliance guarantee.


## Delivered local workflows

Tasks with priority, due dates, completion/reopening and saved-work metrics.

All five local projects use React 19, strict TypeScript, Tailwind CSS 4, Vite, Django and PostgreSQL. Form fields, buttons, custom option panels, calendars and application dialogs use Tailwind. Theme variables and animation/print rules remain stylesheet configuration; browser file and print dialogs remain system UI. Forma retains its original visual selectors through Tailwind `@apply` and its original demo storage format.

New accounts start empty. Existing external-service records and credentials are not silently copied. The explicit legacy JSON converter preserves its input and refuses to overwrite output; reviewed imports replace only the signed-in account's workspace. Local PostgreSQL data and secrets are ignored by Git. Each project now has its own actual Python virtual environment.

## Observed local validation — 30 October 2026

| Check | Result |
| --- | --- |
| TypeScript strict checks and ESLint with zero warnings | Passed |
| Frontend/unit and legacy conversion checks | 10 passed |
| Django tests against disposable PostgreSQL, including concurrent writes | 18 passed |
| Connected Chrome workflows at desktop, tablet and phone sizes | 3 passed |
| Production frontend build | Passed |
| Python Ruff checks and formatting | Passed |
| Django production system check, failing on warnings | Passed with generated example settings |
| Actual Argon2 hashing/checking in this project's environment | Passed |
| `npm run dev`: frontend, API, anonymous session and shutdown | Passed |
| Git diff whitespace and ignored private paths | Passed |

Connected browser coverage includes registration, saved records after reload, domain actions, unsaved-edit confirmation, JSON export, cancelled/confirmed import, light/dark appearance, sign-out and direct sign-in again. Task/order calendar selection is exercised. Screens were inspected at desktop and phone sizes. Browser fixtures are fictional and their PostgreSQL clusters are disposable.

The five projects total 74 frontend/unit checks, 90 PostgreSQL checks and 22 browser scenarios (including Forma's seven original demo regressions). Local startup was checked for all five. These are local results; consult GitHub Actions for the current remote CI status.

## Run and review

From this repository folder, use `npm run dev` (or `npm start`) and open the local URL listed above. `Ctrl+C` stops this project's services. Dependencies are already installed in this checkout. For a fresh clone use `yarn install --frozen-lockfile`; Node 22.13+ under 25 and Python 3.13 are required. The launcher creates an isolated Python environment when absent; this checkout's independent environments were installed and validated explicitly.

Development uses `feat/product-modernization`. Publication targets `master`, except Customer Dashboard, which uses `main`. The original source remains recoverable in Git history. Publishing source changes does not deploy the application.

## Remaining external setup

Production needs a host/domain, HTTPS ingress, a private PostgreSQL database and secret, migrations, monitoring and a backup/restore drill. Docker and remote CI are prepared but have not been executed here. Email verification/recovery, provider sign-in and provider credentials are not configured. Password changes work within an authenticated account. This delivery is locally testable software and deployment preparation, not a hosted public release or a full penetration-test claim.


## Prefilled local login follow-up — 30 October 2026

The persistent private development launcher now seeds one non-admin local owner account per app and prefills its editable login fields. Credentials are generated separately per app and stored only in ignored `api/.local/local-login.json` with mode `0600`. Signup starts blank. No existing account, password or workspace is overwritten; removed-account mismatches stop setup rather than silently attaching a different account.

Seeding requires the development settings module, debug mode, PostgreSQL over a private Unix socket and the persistent-local marker. Production, remote-database and ephemeral-test environments skip it. Vite injects prefill only when the local launcher explicitly enables it during development serving; production builds and previews receive no saved credentials. Browser prefill additionally requires a loopback hostname.

Observed checks: two new frontend regressions and five new database regressions pass per app. Real Chrome checks against each persistent `npm run dev` stack passed editable prefill, masked password, blank signup, actual sign-in, reload and sign-out. Builds succeeded with the local-prefill flag deliberately set, and all generated production files were scanned to confirm that neither saved email nor saved password was included. Credential-file permissions and reuse were verified without printing passwords.
