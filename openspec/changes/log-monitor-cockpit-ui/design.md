# Design

## Context

- `app/log.monitor.cockpit` is a bare `@sap/generator-fiori:basic` scaffold: `App.view.xml` holds an empty `sap.m.App` (`id="app"`), one `Dashboard` route/target, libs `sap.m` + `sap.ui.core`, OData V4 default model on `/odata/v4/log-monitor-cockpit/` (`operationMode: Server`, `autoExpandSelect`). It is already wired into `app/services.cds`, `mta.yaml` and `package.json` (`watch-log.monitor.cockpit`).
- `LogMonitorCockpit` (`srv/service.cds`) exposes every db entity as a writable projection, `requires: administrator`. The change `cockpit-backend-integrity` (applied first) adds link cleanup on delete, 409 on duplicate links, virtual `logCount`/`fieldCount`/`groupCount` on `Integrations` and the `logMetrics(from, to, integrationID)` function.
- The report app is the reference for code style (freestyle XML views, `sap.ui.define`, i18n in pt-BR, standard UI5 types over formatters per CLAUDE.md, `formatter.statusState` mapping).
- Visual reference: Claude Design prototype built from `design-prompt.md` (in this change folder).

## Goals / Non-Goals

**Goals:**
- One reusable list pattern (toolbar + table + shared dialog) applied identically to users, integrations, integration fields and groups.
- All reads/writes through the existing OData V4 model — no custom actions except where CAP cannot express the need.

**Non-Goals:**
- No backend changes (all in `cockpit-backend-integrity`), no new services, no draft (`@odata.draft.enabled`) handling.
- No editing of logs from the cockpit (logs are read-only here).
- No IAS group synchronization (`iasUserGroup` stays a free-text field).
- No automated test suite (repo has none); verification is manual.

## Decisions

1. **Shell: `sap.tnt.ToolPage` + `SideNavigation` inside `App.view.xml`; the router targets the ToolPage's `mainContents` via an inner `sap.m.NavContainer`.**
   Routes: `dashboard` (`""`), `integrations`, `integrationDetail` (`integrations/{id}`), `users`, `groups`, `groupDetail` (`groups/{id}`). The App controller listens to `routeMatched` and sets `SideNavigation.selectedKey` from a route→menu-key map (detail routes map to their parent).
   *Alternative:* `sap.f.FlexibleColumnLayout` like the report — rejected; the side menu + full-page detail matches the requested navigation better.

2. **Lists: `sap.m.Table` `mode="MultiSelect"` bound to the OData V4 list binding with `$count: true`; counter title bound to `headerContext>$count`.**
   Search builds a `Filter` with `contains` on the relevant fields, `caseSensitive: false` (OData `tolower` via V4 model) and calls `binding.filter()`. The row "Editar" is a `Button` in the last cell; rows of Integrations/Groups use `type="Navigation"` + `press` (the Editar button stops the navigation since it has its own press). Integration counts use the virtual `fieldCount`/`groupCount` from the backend; user/group counts use `$expand` of the links with `$select=ID` and an expression binding `${userGroups}.length`.
   *Alternative:* Smart controls / Fiori elements List Report — rejected, the app is freestyle by decision of the repo.

3. **Create/Edit dialog: one XML fragment per entity, bound to a transient context.**
   Create: `listBinding.create({...})` on a list binding whose `updateGroupId` is a dedicated deferred group `"dialog"`, and bind the dialog to the new context; Cancel → `context.delete()` / `resetChanges("dialog")`; Save → `submitBatch("dialog")`. Edit: bind the dialog to the row context with `updateGroupId: "dialog"` so Cancel is `resetChanges`. Client-side validation (required, e-mail regex via `sap/ui/model/type/String` constraints `search`) sets `valueState`; the server's `@mandatory` on `label` remains the source of truth.
   *Alternative:* JSON model copy + manual PATCH — rejected, duplicates what the V4 model does.

4. **Delete: `Promise.all(selectedContexts.map(c => c.delete("$auto")))`** after a `MessageBox.confirm`; the entity-specific confirmation text comes from i18n (integrations mention cascade to logs/fields and show the sum of the selected rows' `logCount`, users/groups mention link removal). A 409 from the backend (duplicate link) surfaces through the V4 model's message handling as a `MessageBox.error`.

5. **Link integrity is server-side** (`cockpit-backend-integrity`): the UI only deletes the main entity and never deletes links itself on user/group/integration delete.

6. **Linking dialog: `sap.m.TableSelectDialog` (multiSelect) bound to `/Users` (or `/Integrations`) filtered with `not userGroups/any(g: g/group_ID eq <groupId>)`.** Confirm creates one link per selection via the section's list binding `create({ user_ID, group_ID })` and `submitBatch`. Unlink deletes the link contexts (the section table is bound to `userGroups` / `integrationGroups` of the group with `$expand=user` / `integration`).
   *Fallback:* if CAP rejects the lambda filter, load linked IDs and filter with `ID ne ...` ANDed client-side.

7. **Dashboard metrics via the backend function `logMetrics(from, to, integrationID)`.**
   Called with `bindContext("/logMetrics(from=...,to=...,integrationID=...)").requestObject()` and copied into a JSON model `dashboard>`; `byStatus` feeds the KPI tiles and the donut, `byIntegration` (already sorted) is cut to the top 10 for the stacked bar. Charts: `sap.viz.ui5.controls.VizFrame` (`donut`, `stacked_bar`) with the semantic status colors in `vizProperties.plotArea.colorPalette` in status order. Error table: OData list binding on `/IntegrationLogs` with `$filter=status eq 'ERROR' and <period>`, `$orderby=executedAt desc`, `$expand=integration($select=description,source,target)`, `growing` 20.
   *Alternative:* `sap.suite.ui.microchart` — lighter, but no stacked-bar-by-integration with legend; `sap.viz` covers both cards.

8. **Payload dialog** reuses the report's approach: `JSON.stringify(JSON.parse(payload), null, 2)` with raw-text fallback in the controller, shown in a read-only `TextArea` (monospace via `style.css`); "Copiar" uses `navigator.clipboard.writeText` + `MessageToast`.

9. **Formatting**: `executedAt`/`modifiedAt` via `sap/ui/model/type/DateTime` exposed as a controller member with `formatOptions.source` pattern (CLAUDE.md rule); only `statusState` (status → ValueState) is a custom formatter, copied from the report.

## Risks / Trade-offs

- [Lambda filter `any()` for "not yet linked" may not be supported] → fallback in Decision 6.
- [Deleting an integration with many logs is a heavy cascade] → explicit confirmation text; acceptable for admin use.
- [UI started before `cockpit-backend-integrity` is applied] → task 1.1 checks for it before any UI work; without it deletes leave orphan links and the dashboard has no data source.
- [`sap.viz` is SAPUI5-only, not OpenUI5] → app already loads UI5 from `sapui5.hana.ondemand.com` / BTP; documented dependency.

## Migration Plan

No data migration. Existing orphan links (if any) are not cleaned retroactively. Deploy as usual with `npm run build && npm run deploy`; rollback = redeploy the previous mtar.
