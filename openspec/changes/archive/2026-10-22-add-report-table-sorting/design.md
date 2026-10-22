# Design

## Context

See proposal.md — Why. The custom fields table of the log detail is a `sap.ui.table.Table`
whose columns are built in JS, one per `IntegrationField` declared for the log's
integration, because that set is only known once the log is loaded. Its rows come from a
`logs` JSON model built from the log's `payload`: one row per element for an array payload,
a single row otherwise. The table already carries a search and per-field filters over those
rows. The raw payload is shown by a separate block bound to its own model.

## Goals / Non-Goals

**Goals:**

- Order the rows of the custom fields table by any declared field.
- Get the ordering from the table itself rather than building a sort interaction.

**Non-Goals:**

- The log list. It is a responsive `sap.m.Table`: `sap.m.Column` has no sort property and
  the control has no column menu, so there is nothing native to switch on there.
- Multi-column ordering.
- Changing the order a log opens in.

## Decisions

**Sorting comes from the table, via `sortProperty` on each column.**
Each column declares the payload field it sorts by; the table then offers that column
ascending and descending in its column menu and renders the sort indicator itself. The
alternative — and the first implementation — was a transparent `Button` in every column
header cycling ascending → descending → unsorted, with the sorted column and its direction
held in the `view` model and applied through `oBinding.sort(new Sorter(...))`. It worked,
but it reimplemented in roughly sixty lines of controller code, a CSS rule to realign the
button with its cells, and an i18n tooltip what the grid table already does, and it had to
be mirrored separately for the log list's `sap.m.Table`. Declaring `sortProperty` where the
column is already created costs one property and no view, text or style change.

**The ordering runs client-side, over the rows in the `logs` model.**
`payload` is a single JSON string column, so there is no server-side ordering to ask for:
the rows exist only after the payload is parsed in the browser. The whole payload is always
in the model, so there is no page of unloaded rows for the ordering to miss. Because the
payload block binds its own model, ordering the rows never reorders the raw payload.

**Ordering and the existing field filters compose with no extra code.**
`ClientListBinding.filter()` ends by re-applying the active sorters, and sorting operates on
the filtered index set, so changing a filter keeps the chosen order and sorting a column
keeps the active filters. This was read from the UI5 1.152 sources rather than assumed,
because the feature is only correct if it holds in both directions.

## Risks / Trade-offs

- **The column menu offers no way back to the unordered state** → a log opens with its rows
  in the payload's order, because `_buildFieldsTable` rebinds the rows for every log, so
  reopening the log is the way back. Should a reset ever be wanted in the UI, it has to call
  `oBinding.sort(null)`: an empty array sets no sorters but leaves the rows in the order of
  the last sort.
- **Values are ordered as text** → the payload rows reach the JSON model with the types the
  payload used, and the declared fields of this app hold strings, so a numeric field is
  ordered lexicographically. A field that needs true numeric or date ordering has to carry a
  typed template or a `Sorter` with its own `fnCompare`.
- **Sortability is not configurable** → every declared field is sortable, by design: the
  `isSortable` flag was removed from `IntegrationFields` in an earlier change, so there is no
  per-field switch to honour.

## Migration Plan

Not applicable: the change touches one controller of the report app, with no data model,
service, text or deployment change, and nothing to migrate or roll back beyond the commit.
