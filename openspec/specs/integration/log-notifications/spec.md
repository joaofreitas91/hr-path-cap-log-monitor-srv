# integration/log-notifications Specification

## Purpose

Defines when the creation of an integration log notifies people by e-mail: which notification rules exist per integration, how the recipient list is resolved from directly linked users and from groups with access, and the guarantee that notifying never affects log ingestion.

## Requirements

### Requirement: Notification rules per integration
Each integration SHALL own a list of notification rules. A rule SHALL reference exactly one recipient source — either a user, or a group that already has access to the integration — and SHALL carry one independent flag per notifying status: `SUCCESS`, `WARNING` and `ERROR`. A rule referencing neither or both recipient sources SHALL be rejected. Two rules for the same integration SHALL NOT reference the same user, and two rules SHALL NOT reference the same group; a duplicate SHALL be rejected with HTTP 409 and no row SHALL be created. Only an `administrator` SHALL be able to read or maintain notification rules.

#### Scenario: Rule with user and group
- **WHEN** a notification rule is created referencing both a user and a group
- **THEN** the request is rejected with HTTP 400 and no rule is created

#### Scenario: Rule with no recipient
- **WHEN** a notification rule is created referencing neither a user nor a group
- **THEN** the request is rejected with HTTP 400 and no rule is created

#### Scenario: Duplicate user rule
- **WHEN** a second rule is created for a user that already has a rule on the same integration
- **THEN** the request is rejected with HTTP 409 and the integration keeps exactly one rule for that user

#### Scenario: Report viewer reads rules
- **WHEN** a user with only the `report-viewer` role requests the notification rules
- **THEN** the request is rejected and no rule data is returned

### Requirement: A created log notifies the matching recipients
When a log is created through `LogMonitorIntegration` and stored successfully, the system SHALL send one notification e-mail per recipient resolved from the rules of that log's integration whose flag for the log's status is set. Recipients SHALL be the users referenced directly by a matching rule plus all users linked to the group of a matching rule. A recipient SHALL receive at most one e-mail per log, even when reached by several matching rules. A user without an e-mail address SHALL be skipped.

#### Scenario: Direct user notified
- **WHEN** a log with status `ERROR` is created for an integration whose rule for user "joao.freitas@hr-path.com" has the `ERROR` flag set
- **THEN** exactly one e-mail about that log is sent to joao.freitas@hr-path.com

#### Scenario: Group members notified
- **WHEN** a log with status `WARNING` is created for an integration whose rule for the group "Employee Central HR Admin" (3 users) has the `WARNING` flag set
- **THEN** one e-mail about that log is sent to each of the 3 users of that group

#### Scenario: Recipient reached twice
- **WHEN** a user is both a direct recipient and a member of a notified group, and both rules match the log's status
- **THEN** that user receives exactly one e-mail

#### Scenario: Status not selected
- **WHEN** a log with status `SUCCESS` is created and the integration's only rule has just the `ERROR` flag set
- **THEN** no e-mail is sent

#### Scenario: RUNNING never notifies
- **WHEN** a log with status `RUNNING` is created for an integration that has notification rules
- **THEN** no e-mail is sent

#### Scenario: No rules
- **WHEN** a log is created for an integration that has no notification rules
- **THEN** no e-mail is sent and the log is stored normally

### Requirement: Notifying never affects ingestion
Resolving recipients and sending e-mail SHALL happen only after the log has been committed, and SHALL NOT change the response of the log creation request nor the stored log. Any failure while resolving recipients or sending SHALL be logged with the log's ID and SHALL NOT be returned to the caller. A failure for one recipient SHALL NOT prevent the e-mail to the other recipients.

#### Scenario: SMTP unreachable
- **WHEN** a log is created while the mail server refuses the connection
- **THEN** the creation still responds 201, the log is readable afterwards, and the failure is written to the server log

#### Scenario: One invalid recipient
- **WHEN** the mail server rejects one of three recipients
- **THEN** the other two still receive the e-mail

#### Scenario: Ingestion response unchanged
- **WHEN** a log that matches several notification rules is created
- **THEN** the response is the created log, with no notification data added to it
