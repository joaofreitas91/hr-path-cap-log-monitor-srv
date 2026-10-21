# Tasks

Manual verification runs against `cds watch` with `npm run watch-log.monitor.report`, signed in as `john.doe@dummy.com`, on three logs of the same integration: one whose payload is an array of 40 objects, one with 3 objects and one with a single object.

## 1. Capped height

- [ ] 1.1 Wrap the custom fields table of `app/log.monitor.report/webapp/view/Detail.view.xml` in a vertical scroll container and give the table sticky column headers, and verify the 40-row log shows a scroll area inside the table while the object page itself no longer scrolls because of it
- [ ] 1.2 Express the container height as 15 rows plus the header in `app/log.monitor.report/webapp/css/style.css`, and verify exactly 15 rows are visible before scrolling at the default content density
- [ ] 1.3 Verify the column headers stay visible while the rows inside the table are scrolled, and that the last row is reachable

## 2. Short payloads and interactions

- [ ] 2.1 Verify the 3-row log and the single-object log show no scroll area and the table shrinks to its content, with no empty space below the last row
- [ ] 2.2 Verify the row counter reports the full number of rows, not 15, for the 40-row log
- [ ] 2.3 Verify filtering a 40-row payload down to 5 rows collapses the table to those 5 rows with no scroll area, and that clearing the filter brings the capped height back
- [ ] 2.4 Verify sorting still reorders all rows and not only the visible ones, by sorting descending and checking the last row through the scroll
- [ ] 2.5 Verify the export still produces every row of the payload, not only the visible 15

## 3. Layout

- [ ] 3.1 Verify the payload block sits immediately below the table and is reachable without a long page scroll for the 40-row log
- [ ] 3.2 Verify the behaviour at phone width and in the two-column layout, with no horizontal scroll introduced by the container
- [ ] 3.3 Run `npm run build` and verify the report app builds with the changed view and stylesheet
