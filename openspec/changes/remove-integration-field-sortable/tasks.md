# Tasks

Manual verification runs against `cds watch` with the cockpit app (`npm run watch-log.monitor.cockpit`), signed in as `john.doe@dummy.com`.

## 1. Data model

- [ ] 1.1 Remove `isSortable : Boolean default false;` from `IntegrationFields` in `db/schema.cds` and verify `cds watch` compiles with no warning about the removed element
- [ ] 1.2 Run `cds deploy --to sqlite` to recreate `db.sqlite` and verify `GET /odata/v4/log-monitor-cockpit/IntegrationFields` no longer returns an `isSortable` property

## 2. Cockpit UI

- [ ] 2.1 Remove the Ordenável column and its icon cell from `app/log.monitor.cockpit/webapp/view/IntegrationDetail.view.xml` and verify the payload fields table of an integration shows Nome técnico, Rótulo, Descrição, Filtrável and the edit button, with the row layout still aligned at narrow and wide widths
- [ ] 2.2 Remove the Ordenável switch, its label and its help text from `app/log.monitor.cockpit/webapp/fragment/IntegrationFieldDialog.fragment.xml` and verify the dialog opens for an existing field and for a new one with no leftover empty row where the switch was
- [ ] 2.3 Remove `isSortable` from the `initialData` of `onAddField` in `app/log.monitor.cockpit/webapp/controller/IntegrationDetail.controller.js` and verify creating a field still saves on the first attempt, with no error in the console and no `isSortable` in the request body shown by the network tab
- [ ] 2.4 Remove the `sortable` and `sortableHelp` keys from `app/log.monitor.cockpit/webapp/i18n/i18n.properties` and verify no `[sortable]` placeholder appears anywhere in the integration detail page or the field dialog

## 3. Samples and documentation

- [ ] 3.1 Remove every `isSortable` key from `srv/http/cockpit-service/4 - integrations.http` and `srv/http/cockpit-service/5 - integration-fields.http`, then replay the numbered requests in order against a fresh `db.sqlite` and verify each one is accepted
- [ ] 3.2 Update the `IntegrationFields` sentence in `CLAUDE.md` to list only `isFilterable` and verify no other mention of `isSortable` survives (`grep -rn isSortable` outside `node_modules`, `gen` and `openspec/changes/archive` returns nothing)

## 4. End-to-end

- [ ] 4.1 Add, edit and delete a payload field in the cockpit and verify all three still work and the counter in the section header follows
- [ ] 4.2 Open the report for an integration with a filterable field and verify its dynamic filter input is still offered and still filters, confirming `isFilterable` was not affected
- [ ] 4.3 Run `npm run build` and verify the MTA archive builds with no CDS compilation error
