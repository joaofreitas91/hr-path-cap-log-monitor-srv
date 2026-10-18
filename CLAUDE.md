# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

SAP CAP (Node.js, ESM, `@sap/cds` 10) service that stores integration execution logs and exposes them to two freestyle SAPUI5 apps: a report for log viewers and an admin cockpit. Deployed to SAP BTP Cloud Foundry as an MTA (HANA HDI + XSUAA + HTML5 repo). The root is an npm workspace containing the UI5 apps at `app/log.monitor.report` and `app/log.monitor.cockpit`.

## Commands

```bash
npm install                      # installs root + app workspace
cds watch                        # dev server on :4004 (SQLite db.sqlite, mocked auth)
npm run watch-log.monitor.report # cds watch + open the report app (served via cds-plugin-ui5)
npm run watch-log.monitor.cockpit # cds watch + open the cockpit app (administrator only)
npm run watch:hybrid             # cds watch --profile hybrid (HANA via .cdsrc-private.json)
cds deploy --to sqlite           # (re)create local db.sqlite from db/schema.cds
npm run build                    # mbt build -> mta_archives/archive.mtar (runs `cds build --production`)
npm run deploy                   # cf deploy the archive
npm run undeploy                 # cf undeploy, deleting services
```

There is no automated test suite and no seed data (`db/data` does not exist). Manual testing is done with the REST Client files in `srv/http/`, numbered in the order data must be created (users → groups → user-groups → integrations → fields → integration-groups → logs).

Local mocked users (Basic auth, password `1234`): `alice@dummy.com` (report-viewer), `john.doe@dummy.com` (report-viewer + administrator), `integration` (system-user). In production, `auth` switches to `xsuaa` and `db` to `hana`. `.cdsrc-private.json` holds `[hybrid]` bindings (gitignored).

## Architecture

**Data model** (`db/schema.cds`, namespace `log.monitor.db`): `Integrations` own `IntegrationLogs` and `IntegrationFields` (compositions). Access is group-based: `Users` ↔ `Groups` via `UserGroups`, and `Integrations` ↔ `Groups` via `IntegrationGroups`. `Groups.iasUserGroup` maps to an IAS group.

**Authorization lives on the db entities**, not the services, via `@restrict`:
- `report-viewer` reads only `Integrations`/`IntegrationLogs` reachable through `…group.userGroups.user.email = $user`. Integrations with no groups are visible to everyone, but their logs are not (the logs `where` has no `not exists` fallback).
- `administrator` has full access; `system-user` can only CREATE logs.
- `xs-security.json` defines only `administrator` and `report-viewer` scopes; `system-user` exists only in the mocked config.

**Services** (one `srv/<name>-service.cds` per service, all projections on the db entities, so restrictions apply everywhere; CAP binds each `.cds` to the `.js` with the same name):
- `LogMonitorIntegration` (`integration-service.cds`, `/odata/v4/log-monitor-integration`) — insert-only log ingestion for external systems.
- `LogMonitorReport` (`report-service.cds`, `/odata/v4/log-monitor-report`) — read-only; backs the report app.
- `LogMonitorCockpit` (`cockpit-service.cds`, `/odata/v4/log-monitor-cockpit`) — admin CRUD over everything. Its handlers (`srv/cockpit-service.js`) delete the `UserGroups`/`IntegrationGroups` rows of a deleted `User`/`Group`/`Integration` (on the db tables, since a service-level DELETE matching no rows throws 404), reject duplicate user–group / integration–group links with 409 (also within one `$batch` changeset), fill the virtual `logCount`/`fieldCount`/`groupCount` on `Integrations`, and implement `logMetrics(from, to, integrationID)`, which returns log counts `byStatus` and `byIntegration` (sorted by total) from one grouped query. Error texts live in `_i18n/messages.properties`.

**Dynamic payload fields**: `IntegrationLogs.payload` is a JSON string whose keys are declared per integration in `IntegrationFields` (`isFilterable`, `isSortable`). Because payload can't be filtered in OData, `srv/report-service.js` implements the `matchingLogIds(integrationID, fieldsFilter)` function: it loads all logs of the integration, parses payloads in JS, does case-insensitive substring matching, and returns a JSON-stringified array of IDs.

**E-mail notifications**: `IntegrationNotifications` holds, per integration, one row per notified recipient — either a `User` (direct) or an `IntegrationGroups` row (every user of a group that already has access to the integration) — with the flags `notifyOnSuccess`/`notifyOnWarning`/`notifyOnError` (`RUNNING` never notifies). `srv/cockpit-service.js` rejects a row with both or neither recipient and a group that has no access to the integration (400), and a duplicate recipient (409, same `LINK_ALREADY_EXISTS` as the other links). `srv/integration-service.js` — the first handler file of `LogMonitorIntegration` — registers the notification work on `req.on('succeeded')` of `CREATE IntegrationLogs`, so it runs after the commit and can neither fail nor delay the ingestion; every failure is caught and logged with the log ID. Since `IntegrationLogs` is `@insertonly` there, the handler reads the log from `req.data` (the handler result is only the insert result) and the whole request answers 204. The work itself is three `srv/lib/` modules: `notification-recipients.js` maps the status to its flag column and resolves direct users plus group members in one expanded query over `cds.db` (dropping users without e-mail, de-duplicating by lower-cased e-mail), `notification-email.js` renders `{ subject, html, text }` (status band, integration, source → target, timestamp, log ID and the payload rendered with the `IntegrationFields` labels, everything HTML-escaped), and `mailer.js` provides the cached `nodemailer` transporter. One message is sent per recipient through `Promise.allSettled`, so recipients never see each other and one rejected address does not suppress the rest.

**SMTP configuration**: the connection settings are environment variables, read by `srv/lib/mailer.js` — `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` (`"true"` for TLS on 465), `SMTP_USER` and `SMTP_PASSWORD`. Locally they live in the gitignored `.env`, which `cds` reads on its own (no `dotenv` dependency); in Cloud Foundry they are set with `cf set-env` on the `hr-path-cap-log-monitor-srv` app, which needs a `cf restart` to pick them up (the pooled transporter is cached and credentials are never logged). With no `SMTP_HOST` — the default, since `.env` is not deployed — no transporter is created and notifications are skipped with a log entry instead of being sent. `package.json` keeps only the non-secret `cds.notifications` settings (`from` and the `timezone` of the dates in the e-mail), overridable per environment with `CDS_NOTIFICATIONS_FROM` / `CDS_NOTIFICATIONS_TIMEZONE`.

```bash
cf set-env hr-path-cap-log-monitor-srv SMTP_HOST smtp.example.com
cf set-env hr-path-cap-log-monitor-srv SMTP_PORT 587
cf set-env hr-path-cap-log-monitor-srv SMTP_SECURE false
cf set-env hr-path-cap-log-monitor-srv SMTP_USER '<user>'
cf set-env hr-path-cap-log-monitor-srv SMTP_PASSWORD '<password>'
cf restart hr-path-cap-log-monitor-srv
```

To send real e-mails locally, run a MailDev SMTP server (`npx maildev`, SMTP on 1025, inbox on <http://localhost:1080>) and point `.env` at it:

```bash
SMTP_HOST=127.0.0.1
SMTP_PORT=1025
SMTP_SECURE=false
```

**Report app** (`app/log.monitor.report`, namespace `com.hrpath.log.monitor.report`): freestyle JS app (not Fiori elements) using `sap.f.FlexibleColumnLayout` — `Report` view in the begin column, `Detail` (route `log/{logId}`) in the mid column. `Report.controller.js` reads the integration's filterable `IntegrationFields`, renders filter inputs for them, calls `matchingLogIds` via `bindContext("/matchingLogIds(...)")`, then applies the returned IDs as an OR of `ID eq` filters alongside the standard filters (integration, source/target, date range, status). `app/services.cds` pulls in each app's `annotations.cds`. In BTP, each app's `xs-app.json` routes `/odata/*` to the `srv-api` destination.

**Cockpit app** (`app/log.monitor.cockpit`, namespace `com.hrpath.log.monitor.cockpit`, service `LogMonitorCockpit`): freestyle app with a `sap.tnt.ToolPage` shell (`App.view.xml`) whose `SideNavigation` drives the router (`sap.f.routing.Router`, like the report); it targets the `pages` of the inner `NavContainer` `app`, so details open as full pages. Routes: `dashboard` (empty hash), `integrations`, `integrationDetail` (`integrations/{id}`), `users`, `groups`, `groupDetail` (`groups/{id}`); detail routes keep their parent menu entry selected. All screens except the shell extend `controller/BaseController.js`, which holds the shared list pattern: search (`searchTable`), counters in `view>/counts/<tableId>` (set on the table's `updateFinished`), multi-select delete with confirmation (`confirmDelete`), and one create/edit dialog per entity (`openEntityDialog`) whose edits run in the deferred `dialog` update group (`submitBatch` on save, `resetChanges` on cancel). Integration/group detail pages bind the view with `bindViewElement`. The dashboard reads `logMetrics` for the KPIs, a `sap.viz` donut and the stacked bars (plain `HBox` segments), and lists the latest `ERROR` logs with a payload dialog. Group linking uses `TableSelectDialog`s filtered with `…Groups/all(link: link/group_ID ne <id>)`. Texts are pt-BR in `i18n/i18n.properties`; plural texts use `_one`/`_other` keys via `getCountText`. In expression bindings on OData V4 booleans use `%{path}` (raw value) — `${path}` goes through the V4 type and turns `false` into a truthy string.

**UI5 formatting**: only write a custom formatter (`webapp/model/formatter.js`) when no standard UI5 type (`sap/ui/model/type/*`, `sap/ui/model/odata/type/*`) covers the case. Import the type in the controller's `sap.ui.define`, expose it as a controller member (e.g. `DateTimeType,` next to `formatter,`) and reference it in the view with a leading dot (`type: '.DateTimeType'`) instead of `core:require` in the XML. OData V4 returns timestamps as ISO strings, so `sap/ui/model/type/DateTime` needs `formatOptions.source: { pattern: "yyyy-MM-dd'T'HH:mm:ss.SSSX" }`.

**Deployment** (`mta.yaml`): `cds build --production` writes to `gen/` (gitignored); modules are the Node srv (`gen/srv`), HDI deployer (`gen/db`), the html5 app (built with `ui5-deploy.yaml` into a zip under `resources/`), and destination content.

## Commit Messages

Whenever the user asks for a commit message (subject, type or scope included), use the `commit-message` skill instead of writing one directly: it holds this repo's scope table and formatting rules.

## Behavioral Guidelines

Guidelines to reduce common LLM coding mistakes.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

Since this repo has no automated tests, verification usually means running `cds watch` and exercising the change with the `srv/http/` requests (or the UI5 app).

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
