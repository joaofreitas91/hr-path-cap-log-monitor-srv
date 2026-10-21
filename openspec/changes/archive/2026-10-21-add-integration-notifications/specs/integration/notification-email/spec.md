# Spec Delta

## Purpose

Defines the e-mail a notified recipient receives for an integration log — its subject, its readable HTML and plain-text content and how the dynamic payload is presented — and how mail delivery is configured per environment.

## ADDED Requirements

### Requirement: Notification e-mail content
The notification e-mail SHALL identify the execution without the recipient having to open the Log Monitor. Its subject SHALL contain the log's status, the integration's description and the execution date and time. Its body SHALL show, in this order: the status, the integration's description, its source and target, the execution timestamp, the log's ID and the payload. The e-mail SHALL be sent with an HTML body and an equivalent plain-text alternative, and SHALL use the application's pt-BR texts and date format (`dd/MM/yyyy HH:mm`).

#### Scenario: Error e-mail
- **WHEN** a log with status `ERROR` of the integration "Cost Center - EC to ADP" (EC → ADP) executed at 2026-10-07 15:46 notifies a recipient
- **THEN** the subject contains "Erro", "Cost Center - EC to ADP" and "07/10/2026 15:46", and the body shows the same integration, source → target, timestamp and the log's ID

#### Scenario: Plain text alternative
- **WHEN** the recipient's client cannot render HTML
- **THEN** the same status, integration, timestamp, log ID and payload values are readable as plain text

#### Scenario: Status is visually distinct
- **WHEN** e-mails for `ERROR`, `WARNING` and `SUCCESS` logs are compared
- **THEN** each shows its own status text and its own colour, matching the status colours used in the applications

### Requirement: Payload rendered with the configured labels
The e-mail SHALL present the log's payload as readable name/value pairs. A payload key that is configured as an `IntegrationField` of that integration SHALL be shown with that field's label; any other key SHALL be shown with the key itself. When the payload holds an array of objects, every element SHALL be presented as its own block. When the payload is empty, absent or not valid JSON, the e-mail SHALL still be sent, stating that no payload is available (for invalid JSON, the raw content SHALL be shown as text).

#### Scenario: Labels applied
- **WHEN** the payload is `{"employeeId":"999","costCenter":"001"}` and `employeeId` is configured with label "Matrícula"
- **THEN** the e-mail shows "Matrícula: 999" and "costCenter: 001"

#### Scenario: Array payload
- **WHEN** the payload holds an array of 3 objects
- **THEN** the e-mail presents the 3 objects as 3 separate blocks

#### Scenario: Invalid payload
- **WHEN** the payload is not valid JSON
- **THEN** the e-mail is still sent and shows the raw payload content as text

#### Scenario: No payload
- **WHEN** the log has no payload
- **THEN** the e-mail is sent and states that the execution carries no payload

### Requirement: Mail delivery configuration
Mail delivery SHALL be configured per environment through the environment itself: the mail server, its port, whether the connection is encrypted and the credentials from environment variables, and the sender address from the application configuration. When no mail server is configured — the default for local development — the system SHALL NOT attempt to send, SHALL log that the notification was skipped together with the log's ID and the recipients that would have been notified, and SHALL otherwise behave normally.

#### Scenario: Local development
- **WHEN** a log that matches a notification rule is created with no mail server configured
- **THEN** no connection is attempted, the skipped notification and its recipients are logged, and the log is stored normally

#### Scenario: Configured sender
- **WHEN** a notification is sent with a configured sender address
- **THEN** the e-mail's From address is that address

#### Scenario: Credentials from the environment
- **WHEN** the application runs with a mail server whose user and password are set in the environment
- **THEN** those credentials are used to authenticate against the configured server, and they do not appear in any log output
