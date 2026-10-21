# cockpit/link-integrity Specification

## Purpose

Keeps the user–group and integration–group link tables consistent when the cockpit (or any client of the LogMonitorCockpit service) deletes records or creates links.

## Requirements

### Requirement: Cascade link removal on delete
When a `User`, `Group` or `Integration` is deleted through the `LogMonitorCockpit` service, all `UserGroups` and `IntegrationGroups` rows that reference it SHALL be deleted in the same transaction, together with every notification recipient that references it. If the delete fails, no link SHALL be removed.

#### Scenario: Delete user
- **WHEN** `DELETE /odata/v4/log-monitor-cockpit/Users(<id>)` is sent for a user with 2 group links
- **THEN** the response is 204 and no `UserGroups` row references that user

#### Scenario: Delete notified user
- **WHEN** a user that is a notification recipient of 2 integrations is deleted
- **THEN** the response is 204 and those integrations no longer list that user under Notificação

#### Scenario: Delete group
- **WHEN** a group linked to 2 users and 1 integration is deleted
- **THEN** its 3 link rows are deleted and the users and the integration still exist

#### Scenario: Delete notified group
- **WHEN** a group that is a notification recipient of an integration is deleted
- **THEN** that integration no longer lists the group under Notificação and its other recipients are unchanged

#### Scenario: Delete integration
- **WHEN** an integration linked to 1 group is deleted
- **THEN** its `IntegrationGroups` row is deleted along with its logs, fields and notification recipients

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

### Requirement: Unlinking a group from an integration stops its notifications
When the link between an `Integration` and a `Group` is removed, every notification recipient that referenced that link SHALL be removed in the same transaction, so that no group is notified about an integration it has no access to.

#### Scenario: Unlink a notified group
- **WHEN** the administrator removes group "Employee Central HR Admin" from the integration's groups with access while that group is a notification recipient of the integration
- **THEN** the recipient disappears from the integration's Notificação tab and the group's users are no longer notified about that integration's logs

#### Scenario: Other recipients unaffected
- **WHEN** a notified group is unlinked from an integration that also notifies 2 users directly
- **THEN** both users remain notification recipients
