# Spec Delta

## ADDED Requirements

### Requirement: Export the custom fields
The custom fields table SHALL offer an "Exportar" action that produces a spreadsheet file with one column per field declared for the log's integration, using each field's label as the column header, and the rows exactly as displayed — same rows, same order. A field missing from the payload SHALL leave its cell empty, as it does on screen. When the integration declares no field the action SHALL be unavailable.

#### Scenario: Export an array payload
- **WHEN** the integration declares `employeeId` ("Matrícula") and `name` ("Nome"), the payload is an array of 10 objects and the viewer presses "Exportar"
- **THEN** a spreadsheet file with the headers "Matrícula" and "Nome" and 10 rows is downloaded

#### Scenario: Export a single-object payload
- **WHEN** the payload is a single object
- **THEN** the file holds one row

#### Scenario: Field absent from the payload
- **WHEN** a declared field has no key in the payload
- **THEN** its column is present in the file and its cell is empty

#### Scenario: Integration without declared fields
- **WHEN** the log's integration declares no payload field
- **THEN** the "Exportar" action is unavailable and no file is produced
