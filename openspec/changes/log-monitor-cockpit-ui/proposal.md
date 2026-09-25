# Proposal

## Why

Master data for the log monitor (users, access groups, integrations, their payload fields and the group links) can today only be maintained by hand-crafted OData requests (`srv/http/cockpit-service/*.http`), and administrators have no overview of integration health. The `LogMonitorCockpit` service and an empty UI5 scaffold (`app/log.monitor.cockpit`) already exist, so the missing piece is the administrator UI. The backend guards and metrics it relies on are delivered by the change `cockpit-backend-integrity`, which MUST be applied first.

## What Changes

- Build the freestyle SAPUI5 app `com.hrpath.log.monitor.cockpit` on top of the existing scaffold:
  - App shell (`sap.tnt.ToolPage`) with a left side navigation: **Dashboard**, **Integrações**, **Usuários**, **Grupos de Acesso**.
  - **Dashboard**: period filter; side-by-side cards with log counts by status and by integration (stacked by status); table of the latest `ERROR` logs whose last column is a "Detalhe" button opening a dialog with the formatted payload (no navigation).
  - **Usuários**: list with title + counter, search field, multi-select table, toolbar actions Adicionar/Excluir, per-row Editar; create and edit share one dialog.
  - **Integrações**: same list pattern, plus navigation to an integration detail page that manages its `IntegrationFields` with the same list pattern.
  - **Grupos de Acesso**: same list pattern, plus navigation to a group detail page to link/unlink users and integrations.
- Consume the backend from `cockpit-backend-integrity`: `logMetrics` for the dashboard cards, `logCount`/`fieldCount`/`groupCount` on integrations, link cleanup on delete and 409 on duplicate links.
- The visual reference is a Claude Design prototype generated from `design-prompt.md` in this change.

## Capabilities

### New Capabilities
- `cockpit/navigation`: app shell, side navigation and routes of the cockpit app.
- `cockpit/dashboard`: log metrics by status and by integration, latest error logs with payload dialog.
- `cockpit/users`: user list, search, create/edit dialog, multi-delete.
- `cockpit/integrations`: integration list/CRUD and integration detail with payload field CRUD.
- `cockpit/access-groups`: access group list/CRUD and group detail with user/integration linking.

### Modified Capabilities
- None (no specs exist yet in `openspec/specs/`).

## Impact

- `app/log.monitor.cockpit/webapp/**`: manifest (libs `sap.tnt`, `sap.f`, `sap.uxap`, `sap.viz`; routes/targets), new views, fragments, controllers, i18n (pt-BR texts).
- Depends on `cockpit-backend-integrity` (`srv/service.cds`, `srv/service.js`); this change itself does not touch `srv/` or `db/`.
- No new npm dependencies. `sap.viz` requires SAPUI5 (already served from `sapui5.hana.ondemand.com`).
