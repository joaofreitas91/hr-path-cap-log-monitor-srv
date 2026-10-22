# report/log-detail Specification

## Purpose

Shows everything recorded for a single integration log — execution data, the payload fields declared for its integration, and the raw payload — so a viewer can investigate one execution.

## Requirements

### Requirement: Detail header
The detail column SHALL show the integration description as its title, the status with the same translated text, semantic state and icon used in the list, and the execution attributes (origem, destino, data/hora de execução) as label-over-value pairs.

#### Scenario: Header of an error log
- **WHEN** the log of integration "Contratações" (`SF → SAP`) executed on 26/09/2026 14:03:12 with status `ERROR` is opened
- **THEN** the header shows "Contratações", "Erro" with the error color and icon, and the attributes SF, SAP and 26/09/2026 14:03:12

#### Scenario: Close the detail
- **WHEN** the viewer closes the detail column
- **THEN** the list returns to a single full-width column

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

### Requirement: Payload block
The detail SHALL show the raw payload as read-only, pretty-printed JSON in a monospaced block, together with an indication of the payload type: JSON object, array with N objects, plain text when the payload is not valid JSON, or empty when there is no payload. A payload that is not valid JSON SHALL be shown verbatim, without an error.

#### Scenario: Object payload
- **WHEN** the payload is `{"employeeId":"42"}`
- **THEN** the block shows it indented over multiple lines and the type is reported as a JSON object

#### Scenario: Array payload
- **WHEN** the payload is a JSON array with 3 objects
- **THEN** the type is reported as an array with 3 objects

#### Scenario: Non-JSON payload
- **WHEN** the payload is not valid JSON
- **THEN** the raw text is shown as it is and the type is reported as plain text

#### Scenario: Empty payload
- **WHEN** the log has no payload
- **THEN** the block is empty and the type is reported as empty

### Requirement: Copy the payload
The payload block SHALL offer a "Copiar" action that puts the displayed payload text on the clipboard and confirms it to the viewer; if the copy cannot be performed, the viewer SHALL be told it failed.

#### Scenario: Copy succeeds
- **WHEN** the viewer presses "Copiar"
- **THEN** the payload text as displayed is on the clipboard and a confirmation message is shown

#### Scenario: Copy is not available
- **WHEN** the browser refuses the clipboard access
- **THEN** a message states that the payload could not be copied, and the detail stays open

### Requirement: Filter the custom fields table
The custom fields table SHALL offer a search field that keeps the rows in which any declared field contains the typed text, matching partial content and ignoring case. It SHALL also offer a "Filtros" action opening a `ViewSettingsDialog` restricted to filtering, with one filter page per field declared for the integration listing the values the rows of the current log actually hold. The values selected within a field SHALL be combined with OR, and the fields SHALL be combined with each other and with the search field with AND, so that a row is kept only when it satisfies all of them. The action SHALL show how many values are selected and the dialog SHALL offer resetting them all at once; cancelling the dialog SHALL leave the applied selection unchanged. The table title SHALL show the number of rows currently displayed. Opening another log SHALL reset the search and the selection, and rebuild the filter pages from the new payload. Filtering SHALL NOT change the raw payload block, which keeps showing the whole payload.

#### Scenario: Search across the fields
- **WHEN** the payload is an array of 20 objects and the viewer types "rejeitado" in the search field
- **THEN** only the rows in which some declared field contains "rejeitado" are listed and the counter shows how many

#### Scenario: Search ignores case and matches partially
- **WHEN** the viewer types "ANA" and a row holds the value "Mariana"
- **THEN** that row is kept

#### Scenario: Filter by one field
- **WHEN** the viewer opens "Filtros", selects `42` on the `employeeId` page and confirms
- **THEN** only the rows whose `employeeId` is 42 are listed and the action shows that one value is selected

#### Scenario: Several values of one field
- **WHEN** the viewer selects `42` and `43` on the `employeeId` page and confirms
- **THEN** the rows of either employee are listed

#### Scenario: Criteria are combined
- **WHEN** the viewer has typed "rejeitado" in the search field and selected `42` on the `employeeId` page
- **THEN** only the rows satisfying both are listed

#### Scenario: Reset the selection
- **WHEN** the viewer presses the dialog's reset action and confirms
- **THEN** no value is selected any more, the action no longer shows a count and the rows kept are the ones the search field alone allows

#### Scenario: Cancel the dialog
- **WHEN** the viewer changes the selection and closes the dialog with "Cancelar"
- **THEN** the table keeps the selection that was applied before the dialog was opened

#### Scenario: No row matches
- **WHEN** the applied criteria match no row
- **THEN** an illustrated message states that no row matches the filters and invites adjusting them, distinct from the message shown when the integration declares no field

#### Scenario: The payload block is untouched
- **WHEN** the table is filtered down to one row
- **THEN** the raw payload block still shows the whole payload

#### Scenario: Another log resets the filters
- **WHEN** the viewer opens a different log from the list
- **THEN** the search field is empty, no value is selected, every row of the new payload is listed and the filter pages offer the values of that payload
