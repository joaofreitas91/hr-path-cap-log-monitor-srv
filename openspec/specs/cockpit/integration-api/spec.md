# cockpit/integration-api Specification

## Purpose

Gives administrators, from the integration's own detail page, everything an external system needs to post execution logs to the Log Monitor: the endpoint, a sample request already filled with that integration's ID and payload fields, and the contract of each field.

## Requirements

### Requirement: Integration API action
The integration detail page SHALL offer an "Integration API" action in its header that opens a modal reference for the displayed integration. The dialog SHALL be organized in two tabs, "Exemplo" and "Schema", and SHALL be closable without changing any data.

#### Scenario: Open the reference
- **WHEN** the administrator presses "Integration API" on the detail page of an integration
- **THEN** a dialog opens showing the "Exemplo" tab for that integration

#### Scenario: Reference is read-only
- **WHEN** the administrator closes the dialog
- **THEN** no integration, field or log has been created or modified

### Requirement: Ingestion endpoint is shown
The "Exemplo" tab SHALL show the HTTP method and the service-relative path of the log ingestion endpoint of `LogMonitorIntegration` (for example `/odata/v4/log-monitor-integration/IntegrationLogs`), obtained from the backend rather than hardcoded in the app, and SHALL offer a button that copies that path to the clipboard. It SHALL NOT show a host: the host depends on the landscape the service module is published in. When the backend cannot supply the path, the dialog SHALL still show the sample request and SHALL indicate that the endpoint could not be determined, instead of showing a wrong one.

#### Scenario: Endpoint shown and copied
- **WHEN** the administrator opens the "Exemplo" tab and presses the copy button next to the endpoint
- **THEN** the endpoint path is placed on the clipboard and a confirmation is shown

#### Scenario: No host is shown
- **WHEN** the administrator reads the endpoint in the "Exemplo" tab
- **THEN** it shows only the path, with no protocol or host, and a note states which host it is relative to

#### Scenario: Endpoint unavailable
- **WHEN** the request for the endpoint path fails
- **THEN** the sample request is still shown and the endpoint area states that it could not be determined

### Requirement: Sample request built from the integration
The "Exemplo" tab SHALL show a sample log request for the displayed integration containing `integration_ID` with that integration's real UUID, a fixed example `executedAt` timestamp in ISO 8601 UTC, `status` `"SUCCESS"`, and `payload` with one key per payload field configured for the integration (`fieldName`), each with an empty string value. The sample SHALL be displayed with the payload expanded as an indented object so it can be read.

#### Scenario: Fields appear in the sample
- **WHEN** the integration has the payload fields `employeeId` and `costCenter`
- **THEN** the sample's payload shows exactly those two keys, each with an empty string value, and `integration_ID` holds the integration's UUID

#### Scenario: Integration without payload fields
- **WHEN** the integration has no payload fields configured
- **THEN** the sample still shows `integration_ID`, `executedAt` and `status`, with an empty payload object and a note that any keys may be sent

#### Scenario: Sample reflects a field added in the same session
- **WHEN** the administrator adds a payload field and then opens "Integration API"
- **THEN** the new field appears in the sample payload

### Requirement: Copying the sample yields a valid request body
The "Exemplo" tab SHALL offer a button that copies the sample to the clipboard as a request body the ingestion endpoint accepts: valid JSON in which `payload` is a JSON **string**, not a nested object. The copied text SHALL therefore differ from the expanded form shown on screen, and posting it unchanged to the endpoint SHALL be accepted.

#### Scenario: Copy produces an accepted body
- **WHEN** the administrator presses the copy button of the sample and posts the copied text to the ingestion endpoint as the system user
- **THEN** the request is accepted and a log is created for that integration

#### Scenario: Copy failure is reported
- **WHEN** the clipboard is not available
- **THEN** a message states that copying failed and the sample remains visible for manual selection

### Requirement: Schema tab documents the contract
The "Schema" tab SHALL document each field of the log request: whether it is required, its type, and its accepted values. It SHALL cover exactly the fields an external system sends — `integration_ID`, `executedAt`, `status` and `payload` — and SHALL NOT document the log's own `ID`, which the service generates. It SHALL state that `status` accepts exactly `RUNNING`, `SUCCESS`, `ERROR` and `WARNING`; that `executedAt` is an ISO 8601 timestamp; that `integration_ID` is the UUID of an existing integration; and that `payload` is a JSON string that may contain either a single object or an array of objects, with any keys. It SHALL make clear that the integration's configured payload fields are the keys the Log Monitor can filter and sort on, not a restriction on what may be sent.

#### Scenario: Status values documented
- **WHEN** the administrator opens the "Schema" tab
- **THEN** the four accepted `status` values are listed

#### Scenario: Payload flexibility documented
- **WHEN** the administrator reads the `payload` entry in the "Schema" tab
- **THEN** it states that the payload is sent as a JSON string and may be a single object or an array of objects with arbitrary keys

### Requirement: Endpoint path service function
`LogMonitorCockpit` SHALL expose a read-only operation, restricted to administrators like the rest of the service, that returns the path of the `LogMonitorIntegration` log ingestion endpoint as that service is actually registered. It SHALL perform no write and SHALL NOT expose credentials.

#### Scenario: Path returned
- **WHEN** an administrator calls the operation
- **THEN** it returns the ingestion endpoint's path, so the app never hardcodes it

#### Scenario: Non-administrator denied
- **WHEN** a user without the `administrator` role calls the operation
- **THEN** the request is rejected, like every other operation of `LogMonitorCockpit`
