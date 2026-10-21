# Proposal

## Why

`IntegrationFields.isSortable` was modelled together with `isFilterable` when the cockpit was built, but nothing ever read it: the report app queries only `isFilterable` (`Report.controller.js:45`) and no backend handler mentions the flag. It is a switch the administrator can set on every payload field with no observable effect anywhere, which is worse than no switch at all — it suggests the report will offer sorting by that field and it never does. The report is gaining sorting on every declared field, so the flag would be actively wrong rather than merely inert. This change removes it.

## What Changes

- **Data model**: `isSortable` is dropped from `IntegrationFields`.
- **Cockpit**: the payload fields table loses its **Ordenável** column, the field dialog loses the **Ordenável** switch and its help text, and newly added fields no longer carry an `isSortable` default.
- **REST Client samples**: the `isSortable` keys are removed from the bodies under `srv/http/cockpit-service/`.
- Not changed: `isFilterable` and everything that depends on it — the dynamic filters of the report keep working exactly as today.

## Capabilities

### New Capabilities

None.

### Modified Capabilities
- `cockpit/integrations`: the payload fields table and dialog no longer expose a sortability flag.

## Impact

- `db/schema.cds` — the `isSortable` element of `IntegrationFields` is removed; the HANA table loses the column.
- `app/log.monitor.cockpit/webapp/view/IntegrationDetail.view.xml` — the Ordenável column and its icon cell.
- `app/log.monitor.cockpit/webapp/fragment/IntegrationFieldDialog.fragment.xml` — the Ordenável switch and its label/help.
- `app/log.monitor.cockpit/webapp/controller/IntegrationDetail.controller.js` — `isSortable` out of the `initialData` of a new field.
- `app/log.monitor.cockpit/webapp/i18n/i18n.properties` — the `sortable` and `sortableHelp` texts.
- `srv/http/cockpit-service/4 - integrations.http` and `5 - integration-fields.http` — `isSortable` out of the sample bodies.
- `CLAUDE.md` — the sentence describing the field.
- No authorization, service or deployment change; `xs-security.json` and `mta.yaml` are untouched.
