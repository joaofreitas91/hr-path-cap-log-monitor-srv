## Purpose

Provides the cockpit dashboard with log counts by status and by integration for a period, computed on the server so the result is the same on SQLite and HANA.

## ADDED Requirements

### Requirement: Metrics function
`LogMonitorCockpit` SHALL offer a function `logMetrics(from, to, integrationID)` where `from` and `to` are required timestamps bounding `executedAt` (inclusive) and `integrationID` is optional. It SHALL return:
- `byStatus`: one object with `running`, `success`, `error`, `warning` and `total` counts;
- `byIntegration`: one entry per integration that has at least one log in the period, with `integrationID`, `description`, `source`, `target`, the four status counts and `total`, ordered by `total` descending, then by `description`.

Only administrators SHALL be able to call it.

#### Scenario: Counts by status
- **WHEN** the period contains 8 SUCCESS, 3 ERROR and 1 WARNING logs and `logMetrics` is called for it
- **THEN** `byStatus` is `{running: 0, success: 8, error: 3, warning: 1, total: 12}`

#### Scenario: Counts by integration
- **WHEN** integration "A" has 4 SUCCESS and 1 ERROR log and "B" has 2 SUCCESS logs in the period
- **THEN** `byIntegration` lists "A" (`success: 4, error: 1, total: 5`) before "B" (`success: 2, total: 2`), and integrations without logs in the period are absent

#### Scenario: Filter by integration
- **WHEN** `integrationID` is given
- **THEN** `byStatus` only counts that integration's logs and `byIntegration` has at most that one entry

#### Scenario: Empty period
- **WHEN** no log falls in the period
- **THEN** `byStatus` has all counts 0 and `byIntegration` is empty

#### Scenario: Invalid period
- **WHEN** `from` or `to` is missing, or `from` is after `to`
- **THEN** the call is rejected with HTTP 400

#### Scenario: Non-administrator
- **WHEN** a `report-viewer` calls `logMetrics`
- **THEN** the call is rejected with HTTP 403

### Requirement: Same results on every database
`logMetrics` SHALL return the same result for the same data on SQLite (local) and SAP HANA (production).

#### Scenario: Hybrid check
- **WHEN** the same logs exist locally and in a HANA-bound hybrid run
- **THEN** both return identical `byStatus` and `byIntegration`
