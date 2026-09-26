# cockpit/link-integrity Specification

## Purpose

Keeps the user–group and integration–group link tables consistent when the cockpit (or any client of the LogMonitorCockpit service) deletes records or creates links.

## Requirements

### Requirement: Cascade link removal on delete
When a `User`, `Group` or `Integration` is deleted through the `LogMonitorCockpit` service, all `UserGroups` and `IntegrationGroups` rows that reference it SHALL be deleted in the same transaction. If the delete fails, no link SHALL be removed.

#### Scenario: Delete user
- **WHEN** `DELETE /odata/v4/log-monitor-cockpit/Users(<id>)` is sent for a user with 2 group links
- **THEN** the response is 204 and no `UserGroups` row references that user

#### Scenario: Delete group
- **WHEN** a group linked to 2 users and 1 integration is deleted
- **THEN** its 3 link rows are deleted and the users and the integration still exist

#### Scenario: Delete integration
- **WHEN** an integration linked to 1 group is deleted
- **THEN** its `IntegrationGroups` row is deleted along with its logs and fields

### Requirement: Reject duplicate links
Creating a `UserGroups` row for a user/group pair that already exists, or an `IntegrationGroups` row for an integration/group pair that already exists, SHALL be rejected with HTTP 409 and a readable message, and no row SHALL be created.

#### Scenario: Duplicate user link
- **WHEN** a POST to `UserGroups` repeats an existing user/group pair
- **THEN** the service responds 409 and the link count is unchanged

#### Scenario: Duplicate integration link
- **WHEN** a POST to `IntegrationGroups` repeats an existing integration/group pair
- **THEN** the service responds 409 and the link count is unchanged

#### Scenario: New pair accepted
- **WHEN** a POST to `UserGroups` links a user to a group it is not yet linked to
- **THEN** the service responds 201
