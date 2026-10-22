# Proposal

## Why

The custom fields table of the log detail shows its rows in whatever order the payload holds. For a payload that is an array of dozens of objects there is no way to bring a value to the top, and the table already has a search and per-field filters, so ordering is the one list interaction it is still missing. The log list is left out: it is a responsive `sap.m.Table`, whose columns carry no sort property and which has no column menu, so there is no sorting of its own to switch on there.

## What Changes

- **Sortable columns in the custom fields table**: every column declares the payload field it sorts by, which is all the table's own sorting needs — it offers that column ascending and descending and shows the indicator on the sorted one. There is no per-field sortability flag — `isSortable` was removed — so a declared field is always sortable.
- Sorting runs client-side over the payload rows held in the `logs` JSON model, so the raw payload block keeps its own order, and it composes with the field filters already on the table.
- Not changed: the default order of the table, which stays the payload's own order, and the log list, which keeps the order the service returns.

## Capabilities

### New Capabilities

None.

### Modified Capabilities
- `report/log-detail`: the custom fields table gains sorting by any declared field.

## Impact

- `app/log.monitor.report/webapp/controller/Detail.controller.js` — each column built in `_buildFieldsTable` gains a `sortProperty`.
- No view, text, CSS, backend, data model, authorization or deployment change.
