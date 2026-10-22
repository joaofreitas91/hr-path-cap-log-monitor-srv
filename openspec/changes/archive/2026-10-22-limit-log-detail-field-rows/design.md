# Design

## Context

See proposal.md — Why. The custom fields table of the log detail is built in JS
(`Detail.controller.js:_buildFieldsTable`): the integration's `IntegrationFields` become the
columns and the parsed `payload` becomes the rows of a client-side `logs` JSON model, so the
number of columns and rows is only known at runtime. The table lives in an
`ObjectPageSubSection` block, which gives its content no determined height, and the app runs
in `sapUiSizeCompact` inside the mid column of a `FlexibleColumnLayout`.

Capping the visible height therefore has to work for an unknown row count, shrink back for
short payloads, and survive the client-side filtering that `Filter the custom fields table`
already applies to the same binding.

## Goals / Non-Goals

**Goals:**

- Express the cap through the table control's own API rather than through a stylesheet, so the
  height does not depend on UI5 internal class names or on per-density row arithmetic.
- Keep every row in the binding, so the counter and the filters keep seeing the whole payload.

**Non-Goals:**

- Changing how the rows are produced. The payload parsing, the `logs` model and the filter
  logic stay as they are; only the control that renders them changes.
- Virtualising or paging the data. The cap is on the rendered height, not on what is loaded.

## Decisions

### Use `sap.ui.table.Table` instead of `sap.m.Table` with a scroll container

`sap.m.Table` and `ListBase` expose `width` but no height and no visible-row-count property,
so with that control the cap can only come from CSS. A working CSS version was built and
discarded: it needed a `ScrollContainer` with `max-height` on `.sapMScrollContScroll` — the
inner element, because that is the one `ScrollEnablement` gives `overflow-y: auto`, while the
outer `.sapMScrollCont` is `overflow: hidden` and would have clipped instead of scrolled — it
needed the row height restated per content density in a custom property, and it needed
`lmcCard` moved off the table, because that class sets `overflow: hidden` and would have made
the table its own sticky scrollport, so `sticky="ColumnHeaders"` would never have engaged.

`sap.ui.table.Table` carries the cap in a `rowMode` aggregation and keeps its column headers
out of the scrolled area by construction, which removes all of the above.

### Configure the cap with `rowMode`, not `visibleRowCount`

`visibleRowCount` is the older spelling of the same idea and is `@deprecated As of version
1.119`; the app targets 1.152. `<rowmodes:Fixed rowCount="15"/>` is the supported form.

### Drive `rowCount` from the controller

Both public row modes shrink to the data only inside `if (this.getHideEmptyRows())`, and
`hideEmptyRows` is declared `visibility: "hidden"` / `@ui5-private sap.ui.mdc.Table` in
`rowmodes.Fixed` and `rowmodes.Auto` alike. A declared `rowCount: 15` on its own therefore
always renders 15 row slots, leaving 12 empty for a payload of 3 objects — against the
requirement that the table shrink to its content.

So `rowCount` is the cap only, and `_syncFieldsRowCount()` lowers it to
`Math.min(rowsMatchingFilters, 15)`. It runs at the two points where that number can change,
after `bindRows` and after `oBinding.filter(...)`, and sets the toolbar counter from the same
value, which replaces the former `updateFinished` handler. The count is read synchronously
from the client binding, so no event is involved — and deliberately not from `rowsUpdated`,
which also fires on scrolling and would re-enter while setting `rowCount`.

Alternatives considered:

- Calling the private `setHideEmptyRows(true)`. Purely declarative, but a `@ui5-private` API
  that may change in any patch release.
- `rowmodes.Auto` with `maxRowCount: 15`. Gated on the same private property, and it derives
  the row count from a container of determined height, which an `ObjectPageSubSection` block
  does not provide.

### Move the "no declared fields" empty state out of `noData`

`TableUtils.getNoContentMessage` returns the table's own `_noColumnsMessage` whenever the
visible column count is 0, and only falls back to `noData` above that. An integration that
declares no field produces a table with no columns, so its `noData` would never be rendered
and the pt-BR `noFields` / `noFieldsForLogHint` texts would be unreachable. That empty state
is now a sibling of the table, both toggled by `view>/hasFields`. `noData` keeps the existing
expression for the filtered-to-zero case, where columns always exist.

### Leave the columns without a `width`

`TableUtils.isVariableWidth` treats an unset width as variable, so the columns share the table
evenly and the dummy filler column is suppressed. A fixed width cannot be chosen sensibly for
a column set whose size is only known at runtime.

## Risks / Trade-offs

- **No pop-in at phone width.** `sap.ui.table.Table` is not responsive: where `sap.m.Table`
  stacked columns into pop-ins, the grid table scrolls them horizontally. → Accepted. The
  declared field count per integration is small today; if an integration declares many
  fields, revisit rather than reintroducing the CSS cap.
- **The app gains the `sap.ui.table` library.** → It is served from the same SAPUI5 CDN the
  app already bootstraps from, so nothing changes in the build; the cost is first-load size.
- **The height now depends on controller code.** A future code path that rebinds `rows`
  without calling `_syncFieldsRowCount()` would leave a stale cap. → The only two call sites
  are `_buildFieldsTable` and `_filterFieldsTable`, both in the same file as the helper.
- **Knock-on for two planned changes.** `add-report-table-sorting` and
  `add-report-table-export` both describe this table as a `sap.m.Table` in their impact
  sections. → Review both before implementing them; the sorting change in particular plans to
  sort the `logs>/rows` binding, which still exists but now belongs to a different control.

## Migration Plan

Front-end only: the report app's view, controller and manifest. It ships in the html5 module
of the MTA with the normal `npm run build` / `npm run deploy`, and rolls back by redeploying
the previous archive. No service, data model, authorization or SMTP change, and nothing to
migrate in the database.
