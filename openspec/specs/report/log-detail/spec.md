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
The detail SHALL show the payload fields declared for the log's integration in a table, one column per declared field. A payload that is a JSON array SHALL produce one row per array element; any other payload SHALL produce a single row. A field missing from the payload SHALL leave its cell empty rather than failing.

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
