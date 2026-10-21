# Tasks

Manual verification runs against `cds watch` with `npm run watch-log.monitor.report`, signed in as `john.doe@dummy.com`, on a log whose payload is an array of at least 20 objects over an integration declaring three or more fields.

## 1. Toolbar, counter and search

- [ ] 1.1 Add a toolbar to the custom fields table in `app/log.monitor.report/webapp/view/Detail.view.xml` with the title, the row counter and a `SearchField`, and verify the section header still reads correctly and the toolbar survives the table being rebuilt when another log is opened
- [ ] 1.2 Keep the displayed row count in the view model, updated on the table's `updateFinished`, and verify it shows the full number of payload rows before any filter and follows every filter change
- [ ] 1.3 Implement the search as an OR of case-insensitive partial matches over every declared field of the row, and verify typing a value that only exists in the third field keeps exactly the rows holding it, and that clearing the box restores all rows

## 2. Per-field filters

- [ ] 2.1 Create `app/log.monitor.report/webapp/fragment/FieldFiltersDialog.fragment.xml` with the dialog shell and its "Aplicar", "Limpar" and "Cancelar" actions, and verify it opens and closes from the "Filtros" button without touching the table
- [ ] 2.2 Build one input per declared field when the dialog opens, reusing the id-sanitising and labelling pattern of `app/log.monitor.report/webapp/controller/Report.controller.js`, and verify an integration with a field named with a dot or a dash still produces a usable input
- [ ] 2.3 Combine the per-field criteria with AND and with the search field, and verify a search plus two field criteria keeps only the rows satisfying all three
- [ ] 2.4 Show the number of active field filters on the "Filtros" button and implement "Limpar", and verify the count appears, decreases as criteria are emptied, disappears at zero, and that "Limpar" restores all rows while leaving the search box alone
- [ ] 2.5 Verify "Cancelar" leaves the applied filters as they were, including after the viewer edited an input without applying

## 3. Empty state and interactions

- [ ] 3.1 Add the "no row matches the filters" illustrated state and keep the existing "integration declares no field" one, and verify each appears in its own case
- [ ] 3.2 Verify the raw payload block keeps showing the whole payload while the table is filtered
- [ ] 3.3 Verify filtering and sorting work together: filter to a handful of rows, sort by a column, and confirm the result is the filtered rows in the sorted order
- [ ] 3.4 Open another log from the list and verify the filters and the search box are reset for the new log

## 4. Texts and end-to-end

- [ ] 4.1 Add the pt-BR texts to `app/log.monitor.report/webapp/i18n/i18n.properties`, with the counter and the active-filter count using the `_one`/`_other` convention, and verify no `[key]` placeholder appears
- [ ] 4.2 Run `npm run build` and verify the report app builds with the new fragment included in the archive
