# Design

## Context

- `srv/service.js` exports one function that returns early unless `this.name === 'LogMonitorReport'`; `LogMonitorCockpit` has no handlers.
- In `db/schema.cds`, `Integrations.fields` and `Integrations.logs` are compositions (CAP already cascades them on DELETE), while `UserGroups` and `IntegrationGroups` are associations on both ends (no cascade, no uniqueness).
- `LogMonitorCockpit` is a set of plain projections restricted to `administrator`; the db-level `@restrict` on `Integrations`/`IntegrationLogs` grants `administrator` everything.
- The existing custom function (`matchingLogIds`) returns a JSON string; this change uses typed CDS return types instead, since the UI consumes structured data.

## Goals / Non-Goals

**Goals:**
- Fix consistency and metrics without touching `db/schema.cds` (no HDI redeploy of tables).
- One aggregate query per `logMetrics` call, identical on SQLite and HANA.

**Non-Goals:**
- Cleaning links that are already orphaned in existing databases.
- DB-level unique constraints or FK cascades (possible follow-up; see Decision 1).
- Any change to `LogMonitorReport` / `LogMonitorIntegration`.

## Decisions

1. **Link cleanup and duplicate check as `LogMonitorCockpit` handlers, not schema changes.**
   Services are split into one file pair per service (`srv/report-service.{cds,js}`, `srv/cockpit-service.{cds,js}`, `srv/integration-service.cds`), so the cockpit handlers live in `srv/cockpit-service.js` with no `this.name` guard.
   - `before('DELETE', 'Users')` → `cds.run(DELETE.from(db.UserGroups).where({ user_ID: req.data.ID }))` on the **db** entities (a service-level bulk DELETE that matches no rows is rejected by CAP 10 with 404, which would break deleting an unlinked user/group/integration); `Groups` → delete from both link entities by `group_ID`; `Integrations` → `IntegrationGroups` by `integration_ID`. Handlers run inside the request transaction, so a failing delete rolls back the link deletes too.
   - `before('CREATE', ['UserGroups','IntegrationGroups'])` → `SELECT.one` for the same pair; `req.reject(409, 'LINK_ALREADY_EXISTS')` with a readable message (`i18n` in `_i18n/messages.properties`, pt-BR default text). Requests of one `$batch` changeset run in parallel, so the SELECT alone misses a pair repeated inside the same batch; the handler also keeps a per-transaction set of pairs (`WeakMap` keyed by `req.tx`) and rejects the second occurrence.
   *Alternative:* `Composition of many` on both sides or `@assert.unique` on the link entities — cleaner, but changes the persisted model and HDI artifacts; kept out of scope.

2. **Integration delete relies on CAP's composition cascade + Decision 1's `IntegrationGroups` cleanup.** No extra code for logs/fields; the requirement is verified, not implemented.

3. **Affected counts as `virtual` elements on the `LogMonitorCockpit.Integrations` projection** (`virtual logCount : Integer; virtual fieldCount : Integer; virtual groupCount : Integer;`), filled in an `after('READ', 'Integrations')` handler with three grouped queries (`SELECT integration_ID, count(1) ... WHERE integration_ID IN (...) GROUP BY integration_ID`) for the IDs in the result page — no N+1. Only computed when the request selects them (or selects `*`). Virtual elements are ignored on write, which satisfies "not writable".
   *Alternative:* `$expand=logs($count=true;$top=0)` from the client — not reliably supported by CAP for `$count` inside `$expand`; calculated elements with subqueries are not supported on projections.

4. **`logMetrics` as a typed unbound function.**
   ```cds
   type StatusCounts { running: Integer; success: Integer; error: Integer; warning: Integer; total: Integer; }
   type IntegrationMetrics : StatusCounts { integrationID: UUID; description: String; source: String; target: String; }
   type LogMetrics { byStatus: StatusCounts; byIntegration: many IntegrationMetrics; }
   function logMetrics(from: Timestamp, to: Timestamp, integrationID: UUID) returns LogMetrics;
   ```
   Handler: validate `from`/`to` (`req.reject(400)`), then one query `SELECT integration_ID, status, count(1) as count FROM IntegrationLogs WHERE executedAt BETWEEN from AND to [AND integration_ID = ?] GROUP BY integration_ID, status`, one lookup of `description, source, target` for the returned integration IDs, and fold both into `byStatus` / `byIntegration` in JS (sort by total desc, description asc). The UI cuts to top 10.
   *Alternative:* OData `$apply` from the client — support for `groupby` + `aggregate($count)` varies by CAP DB adapter; a function gives one tested contract.

## Risks / Trade-offs

- [Concurrent duplicate inserts can pass the SELECT check] → admin-only, low concurrency; a DB unique constraint is the follow-up if it ever happens.
- [Handlers only guard `LogMonitorCockpit`] → no other service can delete these entities today; noted in specs.
- [Virtual counts cannot be used in `$filter`/`$orderby`] → UI only displays them; acceptable.
- [Timestamp comparison on SQLite is string-based] → CAP normalizes `Timestamp` to ISO strings; verify boundaries (inclusive `to`) in the `.http` requests on both DBs.

## Migration Plan

No data migration. Deploy with the next mtar; rollback = redeploy the previous mtar. Pre-existing orphan links stay until removed manually (optional one-off `DELETE` via the cockpit `.http` files).
