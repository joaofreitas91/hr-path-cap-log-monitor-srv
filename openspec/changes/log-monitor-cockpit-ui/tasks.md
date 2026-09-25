# Tasks

Visual reference for every UI task: the Claude Design prototype generated from `design-prompt.md` (this folder). Before starting group 2, export/screenshot the prototype and keep it at hand; when the prototype and the specs disagree, the specs win.

## 1. Prerequisite

- [ ] 1.1 Confirm `cockpit-backend-integrity` is applied: `$metadata` of `/odata/v4/log-monitor-cockpit` shows `logMetrics` and `Integrations.logCount`, and its `.http` requests for link cleanup and 409 pass; do not start group 2 otherwise

## 2. App shell and navigation (`cockpit/navigation`)

- [ ] 2.1 Update `manifest.json`: add libs `sap.tnt`, `sap.f`, `sap.uxap`, `sap.viz`; routes/targets `dashboard`, `integrations`, `integrationDetail`, `users`, `groups`, `groupDetail` targeting the inner NavContainer; verify the app loads without console errors via `npm run watch-log.monitor.cockpit` as `john.doe@dummy.com`
- [ ] 2.2 Replace `App.view.xml` with `sap.tnt.ToolPage` (header with menu toggle, title, avatar; `SideNavigation` with Dashboard / Integrações / Usuários / Grupos de Acesso and icons) and create empty placeholder views for each target; verify each menu item navigates, the URL hash changes and a browser reload keeps the screen
- [ ] 2.3 In `App.controller.js`, sync `SideNavigation.selectedKey` on `routeMatched` (detail routes → parent key) and implement the menu toggle; verify reloading `#/groups/<id>` highlights "Grupos de Acesso" and the toggle collapses the menu
- [ ] 2.4 Add pt-BR i18n keys for shell/menu texts and copy `formatter.statusState` + `css` monospace class from the report; verify no raw i18n keys appear in the UI
- [ ] 2.5 Verify as `alice@dummy.com` (report-viewer only) that cockpit data requests return 403 and nothing is shown

## 3. Users screen — reference list pattern (`cockpit/users`)

- [ ] 3.1 Build `Users.view.xml`: DynamicPage, table toolbar with title bound to `$count` ("Usuários (N)"), `SearchField`, "Adicionar"/"Excluir" buttons, MultiSelect table (Nome, E-mail, Grupos count, Modificado em via `DateTime` type, Editar button); verify list and counter match `GET /Users?$count=true`
- [ ] 3.2 Implement search (name/e-mail, case-insensitive `contains`) and "Excluir" enablement from selection; verify counter follows the search and the empty text "Nenhum usuário encontrado" appears on no match
- [ ] 3.3 Create `UserDialog.fragment.xml` + controller logic shared by Adicionar and Editar (deferred group `dialog`, required/e-mail validation, Cancel resets); verify create, edit, validation and cancel scenarios of the users spec
- [ ] 3.4 Implement multi-delete with `MessageBox.confirm` and toast "N usuários excluídos"; verify deleting 2 linked users removes them and their links (backend from `cockpit-backend-integrity`)
- [ ] 3.5 Compare the screen against the prototype's Usuários screen and adjust layout/texts; the pattern here is the template for groups 4 and 5

## 4. Integrations and payload fields (`cockpit/integrations`)

- [ ] 4.1 Build `Integrations.view.xml` with the users pattern (Descrição, Origem, Destino, Campos (`fieldCount`), Grupos (`groupCount`), Modificado em, Editar; search on description/source/target) and `IntegrationDialog.fragment.xml` (three required fields); verify create/edit/search/counter
- [ ] 4.2 Implement delete with the cascade warning text including the total `logCount` of the selection; verify the dialog shows the right number and the integration is deleted together with its logs, fields and group links
- [ ] 4.3 Add row navigation (`type="Navigation"`) to `integrations/{id}` and build `IntegrationDetail.view.xml` header (title, Origem → Destino, dates, Editar using the same dialog, back/breadcrumb); verify pressing Editar in a row does not navigate and reload of the detail URL works
- [ ] 4.4 Add the "Campos do payload" section with the list pattern bound to `fields` (Nome técnico, Rótulo, Descrição, Filtrável, Ordenável, Editar) and `IntegrationFieldDialog.fragment.xml` (fieldName*, label*, description, two switches); verify add/edit/delete and that a new filterable field appears as a filter in the Log Monitor report
- [ ] 4.5 Add the read-only "Grupos com acesso" section (`integrationGroups` expanded to `group`); verify a linked group is listed
- [ ] 4.6 Compare against the prototype's Integrações and detail screens and adjust

## 5. Access groups and linking (`cockpit/access-groups`)

- [ ] 5.1 Build `Groups.view.xml` with the users pattern (Descrição, Grupo IAS, Usuários count, Integrações count, Modificado em, Editar; search on description/IAS group) and `GroupDialog.fragment.xml`; verify create without IAS group, edit, search and counter
- [ ] 5.2 Implement group delete confirmation; verify links are removed and the users/integrations still exist
- [ ] 5.3 Add row navigation to `groups/{id}` and `GroupDetail.view.xml` header (Descrição, Grupo IAS, counters, Editar) with "Usuários" and "Integrações" sections (title + counter, search, MultiSelect); verify both sections list current links
- [ ] 5.4 Implement "Vincular usuário" with `TableSelectDialog` listing only unlinked users (design Decision 6, with fallback if `any()` fails) and batch-create links; verify linked users disappear from the dialog next time and alice sees the group's integration logs in the report after being linked
- [ ] 5.5 Implement "Vincular integração" the same way and "Desvincular" (confirm + delete link contexts) for both sections; verify unlink keeps the user/integration and a duplicate link attempt surfaces the 409 message
- [ ] 5.6 Compare against the prototype's Grupos de Acesso and detail screens and adjust

## 6. Dashboard (`cockpit/dashboard`)

- [ ] 6.1 Build `Dashboard.view.xml` header with `DateRangeSelection` (default last 7 days) and optional integration `Select`; verify changing either triggers a reload of all sections
- [ ] 6.2 Call `logMetrics` for the selected period/integration, store the result in the `dashboard` JSON model and render the donut `VizFrame` from `byStatus` (semantic colors, total) plus KPI tiles; verify counts match the `logMetrics` request in `7 - integration-logs.http` for the same period and the empty state shows when there are no logs
- [ ] 6.3 Take the top 10 of `byIntegration` and render the stacked bar `VizFrame` side by side with the donut; verify ordering and breakdown with seeded logs from `7 - integration-logs.http`
- [ ] 6.4 Add the "Últimos logs de erro" table (ERROR only, period filter, `executedAt desc`, growing 20, integration description + Origem → Destino, DateTime type, ObjectStatus, "Detalhe" button); verify rows do not navigate
- [ ] 6.5 Create `PayloadDialog.fragment.xml` (header info, pretty JSON with raw fallback, "Copiar", "Fechar"); verify object, array and invalid-JSON payloads
- [ ] 6.6 Compare against the prototype's Dashboard and adjust

## 7. Integration checks and docs

- [ ] 7.1 Walk the full flow on a fresh SQLite DB: create users → group → integration + fields → link both to the group → ingest logs as `integration` → check dashboard → alice sees the logs in the report → delete the group → alice no longer sees them; verify each step
- [ ] 7.2 Run `npm run build` and verify the mtar builds with the cockpit zip under `resources/`
- [ ] 7.3 Update `CLAUDE.md` (cockpit app section: shell/routes, list pattern, link-integrity handlers, `sap.viz` dependency) and verify the described commands and paths exist
