# Tasks

Manual verification runs against `cds watch` with `npm run watch-log.monitor.report`, signed in as `john.doe@dummy.com`, on a log whose payload is an array of several objects.

## 1. Sortable columns

- [x] 1.1 Give each column built in `_buildFieldsTable` of `app/log.monitor.report/webapp/controller/Detail.controller.js` a `sortProperty` holding its field name
- [x] 1.2 Verify a payload that is an array of 10 objects reorders by each field, ascending and descending, and that the sorted column shows the indicator
- [x] 1.3 Verify sorting composes with the field filters of `add-log-detail-field-filters`: filter the table down to a handful of rows, sort a column, and confirm the filtered rows come out in the sorted order and stay sorted when the filter changes
- [x] 1.4 Verify a payload that is a single object (one row) and an integration with no declared fields both behave as before, with no error in the console
- [x] 1.5 Verify another log opens with its rows in the order of its own payload and no column sorted
- [x] 1.6 Run `npm run build` and verify the report app builds
