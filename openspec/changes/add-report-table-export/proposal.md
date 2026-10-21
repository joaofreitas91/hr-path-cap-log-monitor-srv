# Proposal

## Why

The Log Monitor report is where the integration team investigates executions, but everything it finds stays inside the browser. To take a week of errors to a supplier, to a ticket or to a spreadsheet, the only options today are copying rows by hand or copying one payload at a time with the "Copiar" button of the detail. The data is already filtered and already formatted on screen; what is missing is a way to carry it out. This change adds an export to both tables of the report.

## What Changes

- **Log list export**: an "Exportar" action in the table toolbar produces an `.xlsx` file with the logs matching the current filters — all of them, not only the page already loaded — with the columns Integração, Origem, Destino, Data/Hora and Status. The status is written in its pt-BR text and the date/time in the same format the table shows, so the file reads like the screen.
- **Custom fields export**: an "Exportar" action in the custom fields table of the log detail produces an `.xlsx` file with one column per declared field, using the field's label as the header and the rows exactly as displayed.
- **Data source**: both exports are built from an in-memory array — the log list requests the contexts of the whole filtered result before writing the file, the fields table uses the rows it already holds — rather than handing the OData download URL to the export. This is what lets the file reuse the app's own status texts and date formatting instead of exporting raw `ERROR` values and ISO timestamps.
- **New library**: `sap.ui.export` is declared in the report app's manifest. It is served from the same SAPUI5 CDN the app already bootstraps from, so nothing changes in the build.
- Not changed: the filters, the detail, or anything on the server. The export reads what the viewer is already allowed to read.

## Capabilities

### New Capabilities

None.

### Modified Capabilities
- `report/log-list`: the log table gains an export of the filtered result as a spreadsheet.
- `report/log-detail`: the custom fields table gains an export of the displayed rows as a spreadsheet.

## Impact

- `app/log.monitor.report/webapp/manifest.json` — `sap.ui.export` added to `sap.ui5/dependencies/libs`.
- `app/log.monitor.report/webapp/view/Report.view.xml` — a spacer and the "Exportar" button in the logs table toolbar.
- `app/log.monitor.report/webapp/controller/Report.controller.js` — fetching the filtered contexts, building the column definitions and running `sap.ui.export.Spreadsheet`.
- `app/log.monitor.report/webapp/view/Detail.view.xml` — a toolbar for the custom fields table with the "Exportar" button.
- `app/log.monitor.report/webapp/controller/Detail.controller.js` — the export of the displayed payload rows, with the declared fields as columns.
- `app/log.monitor.report/webapp/i18n/i18n.properties` — the button texts, the file names and the progress/error messages.
- No backend, data model, authorization or deployment change.
