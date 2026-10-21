# Proposal

## Why

Neither table of the Log Monitor report can be reordered. The log list arrives in whatever order the service returns — its binding carries no sorter at all (`Report.view.xml:148-156`) — so a viewer who filtered down to a week of errors cannot put the newest first, and cannot group the rows of one integration together. The custom fields table of the detail has the same problem for payloads that are arrays: with dozens of rows there is no way to bring a value to the top. Sorting is the one list interaction the report never got, and it is the cheapest way to make both tables usable at the sizes they actually reach.

## What Changes

- **Sortable column headers**: on both tables, the header of a sortable column becomes a transparent button carrying the column text and an icon for the current sort state. Pressing it cycles ascending → descending → unsorted, and starting to sort one column clears the sort of any other, so at most one column sorts at a time.
- **Log list**: Integração (`integration/description`), Data/Hora (`executedAt`) and Status (`status`) are sortable. Sorting is applied to the OData V4 list binding, so it orders the whole filtered result on the server, not only the page already loaded, and it survives a new search.
- **Custom fields table**: every field declared for the integration is sortable, sorted client-side over the payload rows held in the `logs` JSON model. There is no per-field sortability flag — `isSortable` was removed — so a declared field is always sortable.
- Not changed: the default order of either table. With no column chosen, the log list keeps the service's order and the fields table keeps the payload's own order.

## Capabilities

### New Capabilities

None.

### Modified Capabilities
- `report/log-list`: the log table gains sorting by integration, execution date/time and status.
- `report/log-detail`: the custom fields table gains sorting by any declared field.

## Impact

- `app/log.monitor.report/webapp/view/Report.view.xml` — the three column headers become pressable buttons.
- `app/log.monitor.report/webapp/controller/Report.controller.js` — the sort state in the `view` model, the cycle handler, `oBinding.sort(new Sorter(...))`, and re-applying the sorter after a search.
- `app/log.monitor.report/webapp/controller/Detail.controller.js` — `_buildFieldsTable` builds pressable headers and sorts the `logs>/rows` binding.
- `app/log.monitor.report/webapp/view/Detail.view.xml` — nothing structural; the fields table keeps being built in JS.
- `app/log.monitor.report/webapp/i18n/i18n.properties` — the sort tooltips.
- No backend, data model, authorization or deployment change.
