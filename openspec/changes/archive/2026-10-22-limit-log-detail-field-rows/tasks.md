# Tasks

Manual verification runs against `cds watch` with `npm run watch-log.monitor.report`, signed in as `john.doe@dummy.com`, on three logs of the same integration: one whose payload is an array of 40 objects, one with 3 objects and one with a single object.

## 1. Capped height

- [x] 1.1 Turn the custom fields table of `app/log.monitor.report/webapp/view/Detail.view.xml` into a `sap.ui.table.Table` with a `Fixed` row mode of 15 rows, declaring `sap.ui.table` in the manifest libs, and verify the 40-row log scrolls its rows inside the table while the object page itself no longer scrolls because of it
- [x] 1.2 Lower the row count to the number of rows matching the filters in `app/log.monitor.report/webapp/controller/Detail.controller.js`, and verify exactly 15 rows are visible for the 40-row log at the default content density
- [x] 1.3 Verify the column headers stay visible while the rows inside the table are scrolled, and that the last row is reachable

## 2. Short payloads and interactions

- [x] 2.1 Verify the 3-row log and the single-object log show no scroll area and the table shrinks to its content, with no empty space below the last row
- [x] 2.2 Verify the row counter reports the full number of rows, not 15, for the 40-row log
- [x] 2.3 Verify filtering a 40-row payload down to 5 rows collapses the table to those 5 rows with no scroll area, and that clearing the filter brings the capped height back
- [x] 2.4 Verify a log of an integration that declares no field still shows the pt-BR illustrated empty state, and not the grid table's own no-columns message

## 3. Layout

- [x] 3.1 Verify the payload block sits immediately below the table and is reachable without a long page scroll for the 40-row log
- [x] 3.2 Verify the behaviour at phone width and in the two-column layout, where the grid table scrolls its columns horizontally instead of stacking them into pop-ins
- [x] 3.3 Run `npm run build` and verify the report app builds with the changed view, controller and manifest
