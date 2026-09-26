# cockpit/dashboard Specification

## Purpose

Gives administrators an at-a-glance view of integration health: log counts by status and by integration, and quick access to the payload of the most recent failed executions.

## Requirements

### Requirement: Period filter
The Dashboard SHALL provide a period filter on `executedAt` that defaults to the last 7 days, and an optional integration filter. All metrics and the error table SHALL reflect the selected filters.

#### Scenario: Default period
- **WHEN** the Dashboard is opened
- **THEN** metrics and the error table only consider logs executed in the last 7 days

#### Scenario: Change period
- **WHEN** the administrator selects a different date range
- **THEN** both metric cards and the error table are refreshed for that range

### Requirement: Logs by status metric
The Dashboard SHALL show a card with the number of logs per status (`RUNNING`, `SUCCESS`, `ERROR`, `WARNING`) and the total, using semantic colors (success green, error red, warning orange, running blue/information).

#### Scenario: Status counts
- **WHEN** the selected period contains 8 SUCCESS, 3 ERROR and 1 WARNING logs
- **THEN** the status card shows 8, 3, 1 and 0 for RUNNING, and a total of 12

### Requirement: Logs by integration metric
The Dashboard SHALL show, side by side with the status card, a card with the number of logs per integration broken down by status, ordered by total descending and limited to the top 10 integrations.

#### Scenario: Integration breakdown
- **WHEN** integration "A" has 5 logs (4 SUCCESS, 1 ERROR) and "B" has 2 logs in the period
- **THEN** "A" appears before "B" with its bar split into 4 success and 1 error

#### Scenario: Empty period
- **WHEN** there are no logs in the selected period
- **THEN** both cards show an empty-state message instead of a chart

### Requirement: Latest error logs table
The Dashboard SHALL list the most recent logs with status `ERROR`, newest first, showing integration description, source → target, execution date/time and status, with a growing ("Mais") list. Rows SHALL NOT navigate to another page.

#### Scenario: Error table content
- **WHEN** the Dashboard loads
- **THEN** only ERROR logs of the selected period are listed, ordered by `executedAt` descending

### Requirement: Payload detail dialog
Each row of the error table SHALL have a "Detalhe" button in its last column that opens a dialog with the integration, execution date/time, status and the payload pretty-printed as read-only JSON, with actions to copy the payload and to close the dialog. Invalid JSON SHALL be shown as the raw text.

#### Scenario: Show payload
- **WHEN** the administrator presses "Detalhe" on a row whose payload is `{"employeeId":"42"}`
- **THEN** a dialog shows the payload formatted over multiple indented lines, and the page behind it is unchanged

#### Scenario: Array payload
- **WHEN** the payload is a JSON array of objects
- **THEN** the whole array is shown formatted

#### Scenario: Non-JSON payload
- **WHEN** the payload is not valid JSON
- **THEN** the dialog shows the raw payload text without error
