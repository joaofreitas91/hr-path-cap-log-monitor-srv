# Tasks

Manual verification runs against `cds watch` with `npm run watch-log.monitor.report`, signed in as `john.doe@dummy.com`, with an integration that has more logs than one page and a log whose payload is an array of several objects. Every generated file is opened in a spreadsheet application before the task is considered done.

## 1. Library and toolbar

- [ ] 1.1 Add `sap.ui.export` to `sap.ui5/dependencies/libs` in `app/log.monitor.report/webapp/manifest.json` and verify the app still starts and the library is fetched from the CDN, with no 404 in the network tab
- [ ] 1.2 Add a `ToolbarSpacer` and the "Exportar" button to the logs table toolbar of `app/log.monitor.report/webapp/view/Report.view.xml`, disabled while the table has no row, and verify the title keeps its place at the left and the button follows the row counter

## 2. Exporting the log list

- [ ] 2.1 Build the column definitions (Integração, Origem, Destino, Data/Hora, Status) and run `sap.ui.export.Spreadsheet` over an array built from the table's contexts, and verify the generated file opens with those five columns in that order
- [ ] 2.2 Request the contexts of the whole filtered result before exporting, not only the loaded page, and verify a filter matching more rows than the growing threshold produces a file with every matching log while the table on screen still shows one page
- [ ] 2.3 Write the status with the app's pt-BR text and the date/time with the same pattern the table uses, and verify an `ERROR` log reads "Erro" and its date reads as `dd/MM/yyyy HH:mm:ss` in the file
- [ ] 2.4 Show a busy state while the rows are fetched and the file is built, and verify the report stays usable afterwards and the button is re-enabled
- [ ] 2.5 Verify the export respects the authorization already in force: signed in as `alice@dummy.com`, the file contains only the logs that viewer sees on screen

## 3. Exporting the custom fields

- [ ] 3.1 Add a toolbar with a title and the "Exportar" button to the custom fields table of `app/log.monitor.report/webapp/view/Detail.view.xml`, and verify it appears above the table without disturbing the object page section
- [ ] 3.2 Export the rows held in the `logs` model with one column per declared field, using each field's label as the header, and verify a log of an integration declaring `employeeId` ("Matrícula") and `name` produces a file whose headers are "Matrícula" and the label of `name`
- [ ] 3.3 Verify the file contains exactly the rows displayed: a payload that is an array of 10 objects produces 10 rows, a payload that is a single object produces 1 row, and a field missing from the payload leaves its cell empty
- [ ] 3.4 Disable the button when the integration declares no field, and verify the empty state of the table is shown with the button disabled rather than producing an empty file

## 4. Texts and end-to-end

- [ ] 4.1 Add the pt-BR texts — button, file names, error message — to `app/log.monitor.report/webapp/i18n/i18n.properties` and verify no `[key]` placeholder appears in the toolbars or in any message
- [ ] 4.2 Export the log list, open the file and confirm row count and values against the counter and the rows on screen for a filter matching a handful of logs
- [ ] 4.3 Run `npm run build` and verify the report app builds with `sap.ui.export` declared and no missing dependency warning
