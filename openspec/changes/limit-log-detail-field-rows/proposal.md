# Proposal

## Why

The custom fields table of the log detail renders one row per object in the payload and grows without limit. A batch log with two hundred records produces a two-hundred-row table that pushes the payload block far below the fold, so the object page becomes one long scroll in which neither the table header nor the rest of the detail stays reachable. The table has to stop dictating the height of the page.

## What Changes

- **A capped height**: the custom fields table shows at most 15 rows at a time. Beyond that the remaining rows are reached by scrolling inside the table itself, not the page, and the column headers stay visible while they scroll.
- **No data is hidden**: every row of the payload stays present and reachable; only the visible height is capped. The row counter keeps reporting the full number of rows matching the current filters.
- **Short payloads are unaffected**: with 15 rows or fewer the table shrinks to its content and shows no scroll area, exactly as today.

## Capabilities

### New Capabilities

None.

### Modified Capabilities
- `report/log-detail`: the custom fields table gets a maximum visible height of 15 rows with internal scrolling.

## Impact

- `app/log.monitor.report/webapp/view/Detail.view.xml` — the custom fields table is wrapped in a scroll container of fixed height and keeps its column headers sticky.
- `app/log.monitor.report/webapp/css/style.css` — the height of 15 rows, expressed from the table's row height so it follows the content density.
- No controller, backend, data model, authorization or deployment change.
