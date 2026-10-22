# Design

## Context

See proposal.md - Why. What shapes the approach is where the data already is: `_buildFieldsTable` of `Detail.controller.js` parses `IntegrationLogs.payload` once and puts the resulting rows into a client-side `logs` JSON model, one entry per declared field of the integration. Every row of the table is therefore already in the browser, with no server round trip and no OData binding involved.

That is the opposite of the report's log list, where the same problem is solved server-side by the `matchingLogIds` function (`srv/report-service.js`), because `payload` is an opaque JSON string that OData cannot filter. Nothing of that machinery is needed here.

The declared fields are not known at build time: they come from `IntegrationFields` and differ per integration, so both the columns and any filter control must be created in JS.

## Goals / Non-Goals

**Goals:**

- Filter the rows of one log's payload without touching the backend.
- Build the filter controls from whatever fields the integration declares, including names that are not valid control-id parts.
- Leave the state clean when the viewer opens another log.

**Non-Goals:**

- Filtering across logs — that is the report's filter bar and `matchingLogIds`.
- Persisting a filter between visits to a log, or in the URL.
- Sorting the rows: `add-report-table-sorting` owns that, and this design only has to stay compatible with it.

## Decisions

### Filter the existing binding instead of replacing the model data

The table binds `logs>/rows`. Filtering applies `oBinding.filter([...])` to that binding rather than recomputing a filtered array into the model.

*Why:* a `ClientListBinding` does the matching, so the counter can be read from `getBinding("items").getLength()` on `updateFinished`, the `noData` state appears on its own, and a `Sorter` set by another change composes with the filter on the same binding. Rewriting `/rows` would have made the filtered set the model's only truth, forcing a separate copy of the full rows and breaking the counter's source.

*Alternative considered:* a single `Filter` with a custom `test` function over the whole row. Rejected: it resolves against `path: ""`, which is undocumented behaviour for client models, and one filter per field is what the UI5 filter processor is built for.

### Discrete values in a `ViewSettingsDialog`, not free-text inputs per field

The "Filtros" action opens a `sap.m.ViewSettingsDialog` carrying only `filterItems`. Each declared field becomes one `ViewSettingsFilterItem` whose items are the distinct values the rows of the current log hold. Values chosen within a field are OR'd; fields are AND'd with each other and with the search field.

*Why:* the dialog brings its own confirm, cancel and reset semantics — cancel reverts the selection, reset clears it — so none of that has to be written or tested. It also shows the viewer which values exist instead of asking them to guess a substring.

*Alternative considered (and built first):* one `sap.m.Input` per field in a plain dialog, mirroring how `Report.controller.js` builds its dynamic filter-bar inputs. It handled high-cardinality fields better, since typing beats scrolling a 24-item checkbox list, but every one of cancel, reset and "how many criteria are active" had to be implemented by hand.

*Trade-off accepted:* a field with one distinct value per row produces a filter page with one entry per row, and `ViewSettingsDialog` filter pages have no search of their own. The toolbar's `SearchField` is the answer for those fields.

### The raw value travels on the item, not in its key

Each `ViewSettingsItem` carries `data("fieldName")` and `data("value")`; the key is only `<field>:<text>`.

*Why:* the filter is then `EQ` against the value with its original type, so a numeric cell matches a numeric criterion. Encoding the value into the key would have forced a string comparison and a parse on the way back, and would have broken on a value containing the separator.

### Control ids are sanitised the same way the report does

Field names reach control ids through `_toControlIdPart`, the same `replace(/[^A-Za-z0-9]/g, "_")` used by `Report.controller.js`.

*Why:* `IntegrationFields.fieldName` is free text and routinely holds dots or dashes, which are not legal in a UI5 id. Duplicating the five-line helper is cheaper here than introducing a shared module for two controllers that already live in different views.

### Opening another log destroys the dialog

`_resetFieldFilters` calls `destroy()` on the dialog and drops the reference, so the next open rebuilds it from the fragment.

*Why:* emptying it with `destroyFilterItems()` leaves the dialog's internal `NavContainer` pointing at the filter detail page of the previous log, which then reopens empty. Destroying the control discards every piece of that state at once — navigation, selection and items — instead of reaching into VSD internals to reset each one.

*Cost:* one fragment load per log opened, which is negligible next to the OData read that precedes it.

### The counter is rendered in the table title

The title is an expression binding over `view>/counts/fieldsTable`, giving `Registros (24)`, matching how `Report.view.xml` renders `Logs (18)`.

*Why:* the section header, the anchor-bar tab and the table title were otherwise rendering the same word three times. Both `ObjectPageSection`s now set `showTitle="false"`, leaving the tab for navigation and the table title for the count.

## Risks / Trade-offs

- **A field whose values are nearly all distinct produces an unusable filter page** → the `SearchField` covers those fields, and fields whose rows hold no value at all produce no page.
- **Rows whose value is an object or array stringify to `[object Object]`** in both the search and the filter list → payload fields are declared per integration and are expected to be scalars; nothing fails, the entry is just not useful.
- **`Contains` normalises case only for strings**, so a boolean cell is matched case-sensitively by the search → not worth special-casing for `true`/`false`.
- **The dialog is rebuilt per log** → acceptable, and it is what makes the reset correct.

## Migration Plan

None. The change is confined to the report app's detail view, controller, one new fragment and the i18n bundle. There is no data model, service, authorization or deployment change, and nothing to roll back beyond the UI module.
