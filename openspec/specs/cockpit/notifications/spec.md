# cockpit/notifications Specification

## Purpose

Lets administrators decide, on the integration detail page, who is notified by e-mail about that integration's executions and for which execution statuses, by linking users and groups with access and marking the statuses per recipient.

## Requirements

### Requirement: Notification section
The integration detail page SHALL have a "Notificação" section, shown next to "Campos do payload" and "Grupos com acesso", containing two tables: "Usuários" and "Grupos de acesso". Each table SHALL follow the cockpit's link pattern: a title with the current counter, a search field, multi-selection, a "Vincular" action and a "Desvincular" action enabled only when at least one row is selected. The Usuários table SHALL show Nome and E-mail; the Grupos de acesso table SHALL show Descrição, Grupo IAS and the group's number of users. Both tables SHALL additionally show one checkbox column per notifying status (Sucesso, Aviso, Erro), using the same status colours and icons as the rest of the cockpit. Searching SHALL match name or e-mail in the users table, and description or IAS group in the groups table.

#### Scenario: Open the tab
- **WHEN** the administrator opens the "Notificação" tab of an integration with 1 notified user and 1 notified group
- **THEN** the Usuários table reads "Usuários (1)" and lists that user with its status checkboxes, and the Grupos de acesso table reads "Grupos de acesso (1)" and lists that group with its number of users

#### Scenario: Search recipients
- **WHEN** the administrator types "joao" in the users search field
- **THEN** only notified users whose name or e-mail contains "joao" are listed and the counter updates

#### Scenario: Empty section
- **WHEN** the integration has no notification recipients
- **THEN** both tables show an empty state explaining that nobody is notified about this integration

### Requirement: Link notification recipients
"Vincular" in the Usuários table SHALL open a searchable multi-selection dialog listing only users that are not yet notified for this integration. "Vincular" in the Grupos de acesso table SHALL open the equivalent dialog listing only groups that already have access to this integration (those shown in "Grupos com acesso") and that are not yet notified for it. Confirming SHALL create one recipient per selected entry, with only the `ERROR` status marked, and SHALL report how many recipients were added.

#### Scenario: Link a user
- **WHEN** the administrator presses "Vincular" in Usuários, selects "Joao Freitas" and confirms
- **THEN** the user is listed with only Erro checked, the counter increases by 1 and a confirmation message is shown

#### Scenario: Already notified entries hidden
- **WHEN** the link dialog of either table opens
- **THEN** recipients already notified for this integration are not offered

#### Scenario: Only groups with access offered
- **WHEN** the group link dialog opens for an integration linked to the group "Employee Central HR Admin" while other groups exist
- **THEN** only "Employee Central HR Admin" is offered, and only while it is not yet notified

#### Scenario: No group with access
- **WHEN** the group link dialog opens for an integration that has no groups with access
- **THEN** the dialog shows that there is no group to link

### Requirement: Edit the notified statuses
Checking or unchecking a status checkbox SHALL be saved immediately, without a separate save action, and SHALL take effect for logs created afterwards. If saving fails, an error message SHALL be shown and the checkbox SHALL return to its stored value. A recipient with no status checked SHALL remain listed and SHALL never be notified.

#### Scenario: Enable a status
- **WHEN** the administrator checks "Aviso" for a notified user
- **THEN** the change is saved and the next `WARNING` log of that integration notifies that user

#### Scenario: Disable all statuses
- **WHEN** the administrator unchecks the last marked status of a recipient
- **THEN** the recipient stays in the table and no log of that integration notifies it

#### Scenario: Save fails
- **WHEN** a checkbox change cannot be saved
- **THEN** an error message is shown and the checkbox shows the stored value again

### Requirement: Unlink notification recipients
"Desvincular" SHALL ask for confirmation stating how many recipients will stop being notified and that neither the user nor the group itself is deleted, and on confirmation SHALL remove only the selected recipients and report how many were removed.

#### Scenario: Unlink a user
- **WHEN** the administrator selects a notified user, presses "Desvincular" and confirms
- **THEN** only the notification is removed, the user still exists in Usuários, and the counter decreases by 1

#### Scenario: Unlink a group
- **WHEN** the administrator unlinks a notified group
- **THEN** the group keeps its access to the integration and is still listed under "Grupos com acesso"

#### Scenario: Cancel
- **WHEN** the administrator cancels the confirmation
- **THEN** nothing is removed
