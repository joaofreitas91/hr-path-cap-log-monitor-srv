# Tasks

Manual verification runs against `cds watch` with `npm run watch-log.monitor.report`, signed in as `john.doe@dummy.com`, on an integration that has enough logs to need more than one page and a log whose payload is an array of several objects.

## 1. Sort state and the header control

- [ ] 1.1 Extend the `view` JSON model of `app/log.monitor.report/webapp/controller/Report.controller.js` with a `sort` section holding the sorted column and its direction, and verify the initial state is "no column sorted"
- [ ] 1.2 Turn the Integração, Data/Hora and Status headers of `app/log.monitor.report/webapp/view/Report.view.xml` into transparent buttons whose text is the column title and whose icon reflects the sort state (ascending, descending, none), and verify the headers still align with their cells and still pop in when the window is narrowed

## 2. Sorting the log list

- [ ] 2.1 Implement the press handler cycling ascending → descending → unsorted and applying `oBinding.sort(new Sorter(sPath, bDescending))` (empty array when unsorted), and verify each of the three columns sorts both ways and returns to the service order on the third press
- [ ] 2.2 Clear the sort state of the other columns when a column starts sorting, and verify only one header ever shows a direction icon
- [ ] 2.3 Verify sorting orders the whole filtered result and not only the loaded page: sort by Data/Hora ascending on a filter matching more rows than the growing threshold and confirm the first row is the oldest log of the whole result, then press "Mais" and confirm the order continues
- [ ] 2.4 Keep the sorter applied when `onSearch` re-filters the binding, and verify changing a filter preserves the chosen column and direction, while "Limpar" leaves the sort untouched

## 3. Sorting the custom fields table

- [ ] 3.1 In `_buildFieldsTable` of `app/log.monitor.report/webapp/controller/Detail.controller.js`, build each column header as the same pressable button instead of a plain `Label`, and verify a log of an integration with three declared fields shows three pressable headers
- [ ] 3.2 Sort the `logs>/rows` binding client-side on press with the same three-state cycle and single-column rule, and verify a payload that is an array of 10 objects reorders by each field and returns to the payload's own order on the third press
- [ ] 3.3 Verify a payload that is a single object (one row) and an integration with no declared fields both behave as before, with no error in the console

## 4. Texts and end-to-end

- [ ] 4.1 Add the sort tooltips to `app/log.monitor.report/webapp/i18n/i18n.properties` in pt-BR and verify no `[key]` placeholder appears in any header tooltip
- [ ] 4.2 Open a log from a sorted list, go back and verify the list keeps its order and its scroll position
- [ ] 4.3 Run `npm run build` and verify the report app builds with the changed views and controllers
