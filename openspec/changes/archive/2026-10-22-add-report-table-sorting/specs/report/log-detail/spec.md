# Spec Delta

## ADDED Requirements

### Requirement: Sort the custom fields table
The custom fields table SHALL let the viewer order its rows by any field declared for the log's integration; sortability SHALL NOT be configurable per field. Sorting SHALL use the table's own sorting: every column SHALL declare the field it sorts by, so the table offers ascending and descending order for it and shows the sort indicator on the sorted column. Sorting one column SHALL replace the previous order. Sorting SHALL happen over the rows produced from the payload, leaving the payload block itself unchanged, and a log SHALL open with its rows in the order of its payload.

#### Scenario: Sort an array payload
- **WHEN** the payload is an array of 10 objects and the viewer sorts the `employeeId` column ascending
- **THEN** the 10 rows are ordered by `employeeId` ascending and that column shows the ascending indicator

#### Scenario: Reverse the direction
- **WHEN** the viewer then sorts the same column descending
- **THEN** the rows are ordered by `employeeId` descending and the indicator follows

#### Scenario: Sorting composes with the field filters
- **WHEN** the table is filtered down to a handful of rows and the viewer sorts a column
- **THEN** the filtered rows are shown in the sorted order, and changing a filter afterwards keeps that order

#### Scenario: Sorting does not touch the payload block
- **WHEN** the viewer sorts the table of a log whose payload is an array
- **THEN** the raw payload block still shows the objects in their original order

#### Scenario: Single-row payload
- **WHEN** the payload is a single object and the viewer sorts a column
- **THEN** the one row stays shown and nothing fails

#### Scenario: A newly opened log
- **WHEN** the viewer opens another log
- **THEN** its rows are in the order of its own payload, with no column sorted
