# Spec Delta

## Purpose

Lets a report viewer re-run selected records of an integration log: selecting rows of the custom fields table, sending their identifying values to the integration's configured endpoint in a single call, and learning what that endpoint answered.

## ADDED Requirements

### Requirement: Select payload rows for reprocessing
When the log's integration has reprocessing enabled, the custom fields table SHALL allow selecting several rows at once and SHALL offer a "Reprocessar" action, enabled only while at least one row is selected. The action SHALL NOT be offered when the integration has reprocessing disabled. Selection SHALL work together with the table's search, filters and sorting.

#### Scenario: Action offered
- **WHEN** a log of an integration with reprocessing enabled is opened
- **THEN** the custom fields table allows multiple selection and shows "Reprocessar", disabled until a row is selected

#### Scenario: Action not offered
- **WHEN** a log of an integration with reprocessing disabled is opened
- **THEN** no "Reprocessar" action is shown

#### Scenario: Select after filtering
- **WHEN** the viewer filters the table and selects two of the remaining rows
- **THEN** "Reprocessar" is enabled for those two rows

### Requirement: Reprocess the selection in one call
Pressing "Reprocessar" SHALL collect, from each selected row, the value of the payload field the integration configured for reprocessing, and SHALL send all of them to the server in a single call as one array of entries holding the configured field's name and the row's value. The viewer SHALL be shown that the call is running, and on success SHALL be told how many records were sent. The browser SHALL never send the destination or the trigger path; the server SHALL take both from the integration's own configuration.

#### Scenario: Reprocess three rows
- **WHEN** the configured field is `NumeroDocumento` and the viewer selects three rows holding 123456, 654321 and 111222 and presses "Reprocessar"
- **THEN** one call carries the three entries, each with the key `NumeroDocumento` and one of the values, and the viewer is told that three records were sent

#### Scenario: The endpoint is never named by the browser
- **WHEN** the reprocessing call is made
- **THEN** it carries only the integration and the selected entries, and no destination or trigger path

### Requirement: Reprocessing is refused when the records cannot identify themselves
When a selected row has no value for the configured field, the reprocessing SHALL be refused before any call is made and the viewer SHALL be told which records cannot be reprocessed. A call reaching the server with no entry, with an entry carrying no value, or with an entry naming a field other than the configured one SHALL be rejected with HTTP 400 and nothing SHALL be sent to the endpoint.

#### Scenario: A selected row has no value
- **WHEN** one of the selected rows has no value for the configured field and the viewer presses "Reprocessar"
- **THEN** a message states that the selection cannot be reprocessed, and no call is made

#### Scenario: Empty selection reaches the server
- **WHEN** a reprocessing call arrives with an empty list of entries
- **THEN** it is rejected with HTTP 400 and the endpoint is not called

#### Scenario: Entry naming another field
- **WHEN** a reprocessing call arrives with an entry whose key is not the integration's configured field
- **THEN** it is rejected with HTTP 400 and the endpoint is not called

### Requirement: Reprocessing is refused when the integration is not configured for it
A reprocessing call for an integration whose switch is off SHALL be rejected with HTTP 400, and so SHALL a call for an integration missing its destination, its trigger path or its configured field. In both cases nothing SHALL be sent to any endpoint and the viewer SHALL be told why.

#### Scenario: Reprocessing disabled
- **WHEN** a reprocessing call arrives for an integration whose "Permitir reprocessamento" is off
- **THEN** it is rejected with HTTP 400, the viewer is told reprocessing is not enabled for that integration, and no endpoint is called

#### Scenario: Trigger not configured
- **WHEN** a reprocessing call arrives for an integration with the switch on but no trigger path stored
- **THEN** it is rejected with HTTP 400, the viewer is told the reprocessing is not configured, and no endpoint is called

### Requirement: The endpoint is called once through the configured destination
The server SHALL send the whole array as the body of a single HTTP POST to the integration's trigger path, resolved through the BTP destination named in its configuration, and SHALL bound that call with a timeout so a slow endpoint cannot hold the request open indefinitely. The reprocessing SHALL create no integration log of its own.

#### Scenario: One POST per press
- **WHEN** five records are reprocessed in one press
- **THEN** the endpoint receives one POST whose body is the array of the five entries

#### Scenario: No log is written
- **WHEN** a reprocessing succeeds
- **THEN** no new integration log is created by the reprocessing itself and the original log is unchanged

### Requirement: Endpoint failures reach the viewer
When the endpoint answers with an error, cannot be reached, or does not answer within the timeout, the reprocessing SHALL fail with HTTP 502 and the viewer SHALL be shown a message carrying what the endpoint reported. A failure SHALL leave the selection and the log detail as they were, so the viewer can try again.

#### Scenario: The endpoint answers an error
- **WHEN** the endpoint answers 500 with a message
- **THEN** the viewer is shown that the reprocessing failed, together with the status and the endpoint's message

#### Scenario: The endpoint cannot be reached
- **WHEN** the destination cannot be resolved or the endpoint refuses the connection
- **THEN** the viewer is told the reprocessing could not be triggered, and the selection is still there

#### Scenario: Retry after a failure
- **WHEN** the viewer presses "Reprocessar" again after a failure and the endpoint now answers successfully
- **THEN** the records are sent and the success message reports them
