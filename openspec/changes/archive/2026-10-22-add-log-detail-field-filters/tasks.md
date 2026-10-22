# Tasks

Manual verification runs against `cds watch` with `npm run watch-log.monitor.report`, signed in as `john.doe@dummy.com`, on a log whose payload is an array of at least 20 objects over an integration declaring three or more fields.

## 1. Toolbar, counter and search

- [x] 1.1 Add a toolbar to the custom fields table in `app/log.monitor.report/webapp/view/Detail.view.xml` with the title, the row counter and a `SearchField`, and verify the section header still reads correctly and the toolbar survives the table being rebuilt when another log is opened
- [x] 1.2 Keep the displayed row count in the view model, updated on the table's `updateFinished`, and verify it shows the full number of payload rows before any filter and follows every filter change
- [x] 1.3 Implement the search as an OR of case-insensitive partial matches over every declared field of the row, and verify typing a value that only exists in the third field keeps exactly the rows holding it, and that clearing the box restores all rows

## 2. Per-field filters

- [x] 2.1 Create `app/log.monitor.report/webapp/fragment/FieldFiltersDialog.fragment.xml` with a `ViewSettingsDialog` carrying only `filterItems`, and verify it opens and closes from the "Filtros" button without touching the table
- [x] 2.2 Build one `ViewSettingsFilterItem` per declared field when the dialog opens, listing the distinct values its rows hold and keeping the raw value on the item, and verify an integration with a field named with a dot or a dash still produces a usable filter page
- [x] 2.3 Combine the values selected for a field with OR and the fields with AND and with the search field, and verify a search plus two field criteria keeps only the rows satisfying all three
- [x] 2.4 Show the number of selected values on the "Filtros" button, and verify the count appears, follows the selection, disappears at zero, and that the dialog's reset action restores all rows while leaving the search box alone
- [x] 2.5 Verify the dialog's "Cancelar" leaves the applied selection as it was, including after the viewer changed the selection without confirming

## 3. Empty state and interactions

- [x] 3.1 Add the "no row matches the filters" illustrated state and keep the existing "integration declares no field" one, and verify each appears in its own case
- [x] 3.2 Verify the raw payload block keeps showing the whole payload while the table is filtered
- [x] 3.4 Open another log from the list and verify the filters and the search box are reset for the new log

## 4. Texts and end-to-end

- [x] 4.1 Add the pt-BR texts to `app/log.monitor.report/webapp/i18n/i18n.properties`, with the active-filter count using the `_one`/`_other` convention and the row counter rendered inline in the table title as `Logs (n)`, and verify no `[key]` placeholder appears
- [x] 4.2 Run `npm run build` and verify the report app builds with the new fragment included in the archive
