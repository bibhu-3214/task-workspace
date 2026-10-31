# Product workflows — 31 October 2026

This pass extends the local performance and draft-recovery work across the five web apps on `feat/premium-workspace-polish`. New component styling uses Tailwind, types remain strict, and no runtime dependency or database schema migration was added. Changes are local and uncommitted.

| App | New workflow | Where to try it |
| --- | --- | --- |
| BillFlow | Repeated item entry and reviewed recurring invoice drafts | Sales → Recurring plans; invoice item search |
| Perqelle | Recorded rule freshness and deadline reminders | Rules & reminders (`/review`) |
| Forma | Saved candidate views and reviewed bulk status changes | Candidates |
| Task Workspace | Today/overdue focus and recoverable quick add | Task board |
| Film Journal | Personal film lists and reviewed CSV transfer | Journal; add/edit a movie |

## BillFlow

Repeated scans merge into the existing line only when product, name, price, discount and tax metadata still match the current catalogue defaults. Edited prices or discounts remain separate. The 100-line and 10,000-unit limits still apply; a matching scan can increase quantity at the line limit.

Create a weekly or monthly plan from an issued invoice, choose its next review date, and pause/resume it as needed. **Prepare next draft** requires confirmation and opens the existing invoice studio. It uses current catalogue prices and customer details, and copies the source quantities, discounts and payment-term offset for review. It does not issue an invoice, allocate a number, record a payment or send anything. Supplier tax fields and place of supply must still be reviewed before issuance.

Draft preparation and plan advancement are one transaction. Revision checks reject stale plans, and connected requests retain the existing idempotency behavior. A successful preparation records the draft in the plan history and advances the next review date beyond today. Missed periods are skipped rather than billed automatically. Monthly dates clamp to the last available day while retaining the original anchor; editing other plan details keeps that anchor. **Resume latest draft** reopens the existing draft without advancing the schedule. Cancelled or credited source invoices, missing products and unavailable customers require correction before preparation.

## Perqelle

Rules & reminders shows recorded catalogue check dates, marks missing/invalid/future dates as unknown, and highlights records older than the 90-day review window. These are existing metadata and source links; this pass does not recheck issuer websites or certify the current rules.

Choose a 7/14/30/60-day horizon, review the underlying expiry or milestone record, and snooze a future reminder for up to seven days without crossing its deadline. Snoozed reminders remain available under Show snoozed. Calendar export offers an optional seven-day alarm. Notifications depend on importing the file into a calendar client and its settings. Existing email-reminder configuration remains opt-in under Account; this pass does not turn it on or send messages.

## Forma

Save the candidate query, role, status and ordering as a named view. Views are scoped to the verified account in this browser, with a limit of 12, and survive refresh. They are not cloud-synced. Storage errors are displayed; unreadable saved preferences are preserved instead of silently overwritten.

Select visible candidates, choose a status, and review the names and count before confirming. Cancel leaves records unchanged. Up to 100 selected candidates can be updated through the existing account-scoped revision check. Changing the current page or filters clears selection so hidden candidates are not accidentally included. A failed save retains the current review context.

## Task Workspace

All tasks, Due today and Overdue combine with project/search filters and exclude completed tasks from the date-focused views. Counts reflect those same filters. Dates follow the local calendar and refresh when the window regains focus and at regular intervals.

Quick task accepts Enter or Quick add, uses the current project, and creates a normal-priority task in To do. In a date-focused view it is due today; adding from Overdue opens Today so the new task is visible. Failed saves retain text. Account/tab-scoped session drafts require explicit recovery after refresh and are cleared after success or sign-out.

## Film Journal

Add comma-separated list names while saving a movie; one film can belong to several lists. Membership is saved with the account records and included in JSON/CSV transfers. A film can have up to 12 unique list names, each at most 40 characters. Lists exist through film membership; separate empty lists, global list renaming and collaboration are outside this pass.

Export CSV or import this app's column format. Import validates the file and previews the append before confirmation; matching title/year entries are skipped and existing ratings/reviews are preserved. Revision checks reject a preview if the workspace changed. Limits are 1.5 MB and 10,000 rows/records. Quoted commas, quotes and line breaks round-trip. Export escapes spreadsheet formula prefixes, and its format marker allows that escaping to be reversed safely on reimport. Import does not execute spreadsheet formulas. This is an app CSV format, not an integration with external film services.

## Local testing and release boundary

All five existing development apps remain available at their normal local URLs. BillFlow and Film Journal required a managed API reload to activate backend validation changes; their persistent database directories were retained. Before/after hashes for the existing default local-account workspaces matched. Mutating workflow tests use isolated demo storage or temporary PostgreSQL databases.

Strict types, unit/domain tests, browser workflows, phone layouts, automated accessibility and bundle budgets are covered in the companion validation record. Firefox is still unverified on this Mac because its installed runtime cannot create a profile; the configured CI project remains enabled. Hosted staging, monitoring, physical-device/scanner acceptance and provider-backed restore verification remain environment-specific release work.

See [PRODUCT-WORKFLOWS-VALIDATION.md](PRODUCT-WORKFLOWS-VALIDATION.md) for the verified results and [PERFORMANCE-RELIABILITY.md](PERFORMANCE-RELIABILITY.md) for the preceding baseline.
