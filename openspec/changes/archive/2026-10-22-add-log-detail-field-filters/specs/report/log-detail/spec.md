# Spec Delta

## ADDED Requirements

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
