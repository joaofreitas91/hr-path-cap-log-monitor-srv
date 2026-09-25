# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

SAP CAP (Node.js, ESM, `@sap/cds` 10) service that stores integration execution logs and exposes them to a freestyle SAPUI5 report app. Deployed to SAP BTP Cloud Foundry as an MTA (HANA HDI + XSUAA + HTML5 repo). The root is an npm workspace containing the UI5 app at `app/log.monitor.report`.

## Commands

```bash
npm install                      # installs root + app workspace
cds watch                        # dev server on :4004 (SQLite db.sqlite, mocked auth)
npm run watch-log.monitor.report # cds watch + open the UI5 app (served via cds-plugin-ui5)
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
- `LogMonitorReport` (`report-service.cds`, `/odata/v4/log-monitor-report`) — read-only; backs the UI5 app.
- `LogMonitorCockpit` (`cockpit-service.cds`, `/odata/v4/log-monitor-cockpit`) — admin CRUD over everything. Its handlers (`srv/cockpit-service.js`) delete the `UserGroups`/`IntegrationGroups` rows of a deleted `User`/`Group`/`Integration` (on the db tables, since a service-level DELETE matching no rows throws 404), reject duplicate user–group / integration–group links with 409 (also within one `$batch` changeset), fill the virtual `logCount`/`fieldCount`/`groupCount` on `Integrations`, and implement `logMetrics(from, to, integrationID)`, which returns log counts `byStatus` and `byIntegration` (sorted by total) from one grouped query. Error texts live in `_i18n/messages.properties`.

**Dynamic payload fields**: `IntegrationLogs.payload` is a JSON string whose keys are declared per integration in `IntegrationFields` (`isFilterable`, `isSortable`). Because payload can't be filtered in OData, `srv/report-service.js` implements the `matchingLogIds(integrationID, fieldsFilter)` function: it loads all logs of the integration, parses payloads in JS, does case-insensitive substring matching, and returns a JSON-stringified array of IDs.

**UI5 app** (`app/log.monitor.report`, namespace `com.hrpath.log.monitor.report`): freestyle JS app (not Fiori elements) using `sap.f.FlexibleColumnLayout` — `Report` view in the begin column, `Detail` (route `log/{logId}`) in the mid column. `Report.controller.js` reads the integration's filterable `IntegrationFields`, renders filter inputs for them, calls `matchingLogIds` via `bindContext("/matchingLogIds(...)")`, then applies the returned IDs as an OR of `ID eq` filters alongside the standard filters (integration, source/target, date range, status). `app/services.cds` pulls in the app's `annotations.cds`. In BTP, `xs-app.json` routes `/odata/*` to the `srv-api` destination.

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
