# Spec Delta

## MODIFIED Requirements

### Requirement: Custom fields table
The detail SHALL show the payload fields declared for the log's integration in a table, one column per declared field. A payload that is a JSON array SHALL produce one row per array element; any other payload SHALL produce a single row. A field missing from the payload SHALL leave its cell empty rather than failing. The table SHALL show at most 15 rows at a time: beyond that the remaining rows SHALL be reached by scrolling inside the table, with the column headers staying visible, and the page itself SHALL NOT grow with the number of rows. No row SHALL be dropped — the cap is on the visible height only, and the row counter SHALL keep reporting every row matching the current filters. With 15 rows or fewer the table SHALL shrink to its content and show no scroll area.

#### Scenario: Object payload
- **WHEN** the integration declares the fields `employeeId` and `name`, and the payload is `{"employeeId":"42","name":"Ana"}`
- **THEN** the table shows one row with 42 and Ana

#### Scenario: Array payload
- **WHEN** the payload is a JSON array with 3 objects
- **THEN** the table shows 3 rows, one per object

#### Scenario: Field absent from the payload
- **WHEN** the integration declares `costCenter` but the payload has no such key
- **THEN** the `costCenter` cell of that row is empty and the other cells are still shown

#### Scenario: Integration without declared fields
- **WHEN** the log's integration declares no payload field
- **THEN** an illustrated empty state is shown in place of the field rows

#### Scenario: Payload longer than the cap
- **WHEN** the payload is a JSON array with 40 objects
- **THEN** 15 rows are visible, the other 25 are reached by scrolling inside the table with the headers still visible, and the counter reports 40

#### Scenario: Payload shorter than the cap
- **WHEN** the payload is a JSON array with 3 objects
- **THEN** the table is as tall as its 3 rows and offers no scroll area
