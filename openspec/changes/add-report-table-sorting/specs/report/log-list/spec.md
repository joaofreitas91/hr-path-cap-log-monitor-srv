# Spec Delta

## ADDED Requirements

### Requirement: Sort the log list
The log table SHALL let the viewer order its rows by integration (`integration/description`), execution date/time (`executedAt`) or status (`status`). The header of each sortable column SHALL be pressable and SHALL show the current sort state; pressing it SHALL cycle ascending, then descending, then back to unsorted. At most one column SHALL sort at a time: sorting a column SHALL clear the sort of any other. Sorting SHALL order the whole result matching the current filters, not only the rows already loaded, and SHALL stay applied when the filters change. With no column sorted, the rows SHALL keep the order the service returns.

#### Scenario: Sort by date
- **WHEN** the viewer presses the Data/Hora header once
- **THEN** the rows are ordered from the oldest execution to the newest and the header shows the ascending state

#### Scenario: Reverse the direction
- **WHEN** the viewer presses the Data/Hora header a second time
- **THEN** the rows are ordered from the newest execution to the oldest and the header shows the descending state

#### Scenario: Back to unsorted
- **WHEN** the viewer presses the Data/Hora header a third time
- **THEN** no header shows a direction and the rows are back in the order the service returns

#### Scenario: Only one column sorts
- **WHEN** the list is sorted by Data/Hora and the viewer presses the Status header
- **THEN** the rows are ordered by status and the Data/Hora header no longer shows a direction

#### Scenario: Sorting covers rows not yet loaded
- **WHEN** the filters match more logs than one page and the viewer sorts by Data/Hora ascending
- **THEN** the first row is the oldest log of the whole filtered result, and pressing "Mais" continues the same order

#### Scenario: Sorting survives a new search
- **WHEN** the list is sorted by Integração descending and the viewer changes the status filter and searches again
- **THEN** the new result is still ordered by Integração descending
