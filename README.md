# Task Workspace

A considered space to plan, prioritise and finish your next important thing.

React 19 · strict TypeScript · Tailwind CSS 4 · Vite · Django · PostgreSQL.

Repository and local folder: `task-workspace`.

## Run locally

Use Node 22.13+ (under 25), Python 3.13 and Yarn 1.22.22. From this project folder:

```sh
yarn install --frozen-lockfile
npm run dev
```

Open **http://127.0.0.1:5183**. The launcher prepares a Python environment when needed, starts a private local PostgreSQL cluster and runs the API on loopback port 8103. A private local owner account is created and its login fields are prefilled; click **Sign in** to begin, or create another account. No external email, OAuth, payment or legacy service is contacted. No default account/password is published.

The five products have separate databases, cookie names and local ports. Closing this command stops only this project's services. Its local records remain in ignored `api/.local/postgres/`; do not delete that folder to clear a build cache.

## Prefilled local login

`npm run dev` creates a separate non-admin local account for this app and stores its generated credentials privately in the ignored `api/.local/local-login.json` file (owner-only permissions). The same account and workspace are reused on restart. The email and masked password are editable; signup fields stay blank. No BillFlow credentials are reused.

Prefill is available only in the loopback development launcher. Production builds, previews and remote databases do not enable it; no public credential endpoint is added. Restart an already-running development command to load the new setup. Manually changing an account password does not reset it on restart; update the private local-login file if you want its prefill to match the new password.

## Product workflow

Create tasks with descriptions, priority and optional due dates. Filter by workflow state, mark work complete or reopen it, search and paginate the list. Overview counts come from saved tasks.

Mutations update the displayed records after the server accepts them. Stale revisions are rejected instead of overwriting another editor's work. Passwords are hashed on the server; sessions use HttpOnly cookies and CSRF verification. The browser does not persist a login JWT or password in local/session storage. Account settings support password changes. Email recovery/social providers are not configured for this local release.

Appearance has light/dark support. Shared fields, option panels, calendars and dialogs use Tailwind utilities, with keyboard focus and reduced-motion behavior. Charts and statistics use actual saved records. Empty accounts start empty.

## Validation

```sh
npm run check
npm test
npm run test:api
npm run test:runner
npm run build
PLAYWRIGHT_CHANNEL=chrome npm run test:e2e
```

The API tests and browser fixtures create disposable PostgreSQL databases. Browser tests use fictional accounts and separate test settings; they refuse a non-temporary acceptance database. Omit `PLAYWRIGHT_CHANNEL` after `yarn playwright install chromium` to use the installed test Chromium instead of Chrome. Browser artifacts are ignored under `output/`.

## Existing data

The original code remains in Git history and its README is retained in `docs/legacy-project.md`. The old external API is not used as an implicit migration source. Existing tokens are not forwarded to a new service. Convert an explicitly supplied legacy JSON array locally:

```sh
node scripts/convert-legacy-data.mjs old-export.json converted.json
```

Review the output and use the application's Import control. Conversion never overwrites its input or an existing output file. Missing creation timestamps use the conversion time, and unknown film release years stay blank. No import is performed automatically. JSON exports are plaintext; retain them privately. Importing replaces the current account workspace only after confirmation.

## Deployment preparation

`Dockerfile` builds the SPA and serves it with Django/WhiteNoise and Gunicorn. Configure a private `SECRET_KEY` (50+ characters), PostgreSQL `DATABASE_URL` and explicit `ALLOWED_HOSTS`. Set `TRUSTED_PROXY_TLS=1` only behind an ingress that strips untrusted forwarded-protocol headers and terminates HTTPS. Run migrations as a separate release command:

```sh
python manage.py migrate --settings=config.settings.production
```

Production settings reject missing secrets, wildcard/empty hosts and non-PostgreSQL databases, enable secure cookies and HTTPS/HSTS, and add response security headers. Back up and restore-test PostgreSQL before relying on the service. Hosting, provider/email delivery, operational monitoring, external ingress and recovery drills require their own deployment validation; no public launch is claimed. Publishing source changes does not deploy the application.

## Project naming and compatibility

This project is now **Task Workspace**, with the repository, folder and package named `task-workspace`. The previous repository was `TaskBox-App`. Standard entry/configuration filenames retain their conventional names. TypeScript React components use PascalCase, utility modules use camelCase, Python modules use snake_case, and scripts/docs use descriptive kebab-case.

`product.json` separates the current app identity from its stable storage namespace. Existing account sessions, CSRF cookies and appearance preferences retain their original keys. Previously exported files remain importable through explicit legacy identifiers. The private database, secret and generated local credentials were moved with the project and were not reset. Existing local email addresses remain valid. Newly generated test accounts use the current project name.
