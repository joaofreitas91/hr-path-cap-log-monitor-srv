# Spec Delta

## MODIFIED Requirements

### Requirement: Integration delete is an atomic cascade
Deleting an `Integration` through `LogMonitorCockpit` SHALL delete, in one transaction, the integration, all its `IntegrationLogs`, all its `IntegrationFields`, all its `IntegrationGroups` rows and all its notification recipients. If any part fails, nothing SHALL be deleted.

#### Scenario: Delete integration with data
- **WHEN** an integration with 120 logs, 3 fields and 2 group links is deleted
- **THEN** the response is 204 and none of those logs, fields or links can be read afterwards

#### Scenario: Delete integration with notification recipients
- **WHEN** an integration that notifies 1 user and 1 group is deleted
- **THEN** the response is 204, no notification recipient of that integration can be read afterwards, and the user and the group still exist

#### Scenario: Linked groups survive
- **WHEN** an integration linked to group "RH Folha" is deleted
- **THEN** group "RH Folha" still exists and keeps its other links
