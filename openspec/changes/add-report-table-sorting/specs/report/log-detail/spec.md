# Spec Delta

## ADDED Requirements

### Requirement: Sort the custom fields table
The custom fields table SHALL let the viewer order its rows by any field declared for the log's integration; sortability SHALL NOT be configurable per field. The header of every column SHALL be pressable and SHALL show the current sort state; pressing it SHALL cycle ascending, then descending, then back to unsorted, and at most one column SHALL sort at a time. Sorting SHALL happen over the rows produced from the payload, leaving the payload block itself unchanged. With no column sorted, the rows SHALL keep the order of the payload.

#### Scenario: Sort an array payload
- **WHEN** the payload is an array of 10 objects and the viewer presses the `employeeId` header once
- **THEN** the 10 rows are ordered by `employeeId` ascending and the header shows the ascending state

#### Scenario: Back to the payload order
- **WHEN** the viewer presses the same header a third time
- **THEN** the rows are back in the order they appear in the payload and no header shows a direction

#### Scenario: Only one column sorts
- **WHEN** the table is sorted by `employeeId` and the viewer presses the `name` header
- **THEN** the rows are ordered by `name` and the `employeeId` header no longer shows a direction

#### Scenario: Sorting does not touch the payload block
- **WHEN** the viewer sorts the table of a log whose payload is an array
- **THEN** the raw payload block still shows the objects in their original order

#### Scenario: Single-row payload
- **WHEN** the payload is a single object and the viewer presses a header
- **THEN** the one row stays shown and nothing fails
