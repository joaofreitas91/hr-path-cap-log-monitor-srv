# Spec Delta

## ADDED Requirements

### Requirement: Filter the custom fields table
The custom fields table SHALL offer a search field that keeps the rows in which any declared field contains the typed text, matching partial content and ignoring case. It SHALL also offer a "Filtros" action opening a dialog with one input per field declared for the integration; the criteria typed there SHALL be combined with each other and with the search field so that a row is kept only when it satisfies all of them. The action SHALL show how many field criteria are active and SHALL offer clearing them all at once; cancelling the dialog SHALL leave the applied criteria unchanged. The table title SHALL show the number of rows currently displayed. Opening another log SHALL reset the search and the criteria. Filtering SHALL NOT change the raw payload block, which keeps showing the whole payload.

#### Scenario: Search across the fields
- **WHEN** the payload is an array of 20 objects and the viewer types "rejeitado" in the search field
- **THEN** only the rows in which some declared field contains "rejeitado" are listed and the counter shows how many

#### Scenario: Search ignores case and matches partially
- **WHEN** the viewer types "ANA" and a row holds the value "Mariana"
- **THEN** that row is kept

#### Scenario: Filter by one field
- **WHEN** the viewer opens "Filtros", types `42` in the `employeeId` input and applies
- **THEN** only the rows whose `employeeId` contains 42 are listed and the action shows that one criterion is active

#### Scenario: Criteria are combined
- **WHEN** the viewer has typed "rejeitado" in the search field and `42` in the `employeeId` criterion
- **THEN** only the rows satisfying both are listed

#### Scenario: Clear the criteria
- **WHEN** the viewer presses "Limpar" in the dialog
- **THEN** every field criterion is emptied, the action no longer shows a count and the rows kept are the ones the search field alone allows

#### Scenario: Cancel the dialog
- **WHEN** the viewer edits an input and closes the dialog with "Cancelar"
- **THEN** the table keeps the criteria that were applied before the dialog was opened

#### Scenario: No row matches
- **WHEN** the applied criteria match no row
- **THEN** an illustrated message states that no row matches the filters and invites adjusting them, distinct from the message shown when the integration declares no field

#### Scenario: The payload block is untouched
- **WHEN** the table is filtered down to one row
- **THEN** the raw payload block still shows the whole payload

#### Scenario: Another log resets the filters
- **WHEN** the viewer opens a different log from the list
- **THEN** the search field is empty, no criterion is active and every row of the new payload is listed
