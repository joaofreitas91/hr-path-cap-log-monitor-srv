## Purpose

Lets administrators maintain access groups and control which users see which integrations' logs, by linking users and integrations to each group.

## ADDED Requirements

### Requirement: Access groups list
The Grupos de Acesso screen SHALL follow the same list pattern as the Usuários screen (title with counter "Grupos de Acesso (N)", search field, multi-selection table, "Adicionar"/"Excluir", per-row "Editar" with one shared dialog). Columns SHALL be Descrição, Grupo IAS, number of users, number of integrations, last modified date and "Editar". Search SHALL match description or IAS group.

#### Scenario: Counter
- **WHEN** 5 groups exist
- **THEN** the title reads "Grupos de Acesso (5)"

### Requirement: Group dialog
The create/edit dialog SHALL have Descrição (required) and Grupo IAS (optional).

#### Scenario: Create group without IAS group
- **WHEN** the administrator fills only Descrição and saves
- **THEN** the group is created with an empty IAS group

### Requirement: Group delete removes links
Deleting groups SHALL require confirmation and SHALL remove the group's user and integration links, without deleting the users or integrations themselves.

#### Scenario: Delete group with links
- **WHEN** a group linked to 2 users and 1 integration is deleted
- **THEN** the group and its 3 links are deleted and the users and integration still exist

### Requirement: Navigate to group detail
Pressing a group row SHALL open the group detail page showing Descrição, Grupo IAS and user/integration counts, with "Editar" using the same dialog.

#### Scenario: Open detail
- **WHEN** the administrator presses the row of "RH Folha"
- **THEN** its detail page opens

### Requirement: Link and unlink users
The group detail page SHALL have a "Usuários" section listing linked users (Nome, E-mail) with title + counter, search, multi-selection, a "Vincular" action and an "Desvincular" action (enabled only with a selection). "Vincular" SHALL open a searchable multi-selection dialog that lists only users not yet linked to the group. "Desvincular" SHALL ask for confirmation and SHALL remove only the links.

#### Scenario: Link two users
- **WHEN** the administrator presses "Vincular", selects 2 users and confirms
- **THEN** both users appear in the section, the counter increases by 2 and those users can now see the group's integrations' logs in the Log Monitor

#### Scenario: Already linked users hidden
- **WHEN** the link dialog opens
- **THEN** users already linked to the group are not offered

#### Scenario: Unlink user
- **WHEN** the administrator unlinks a user
- **THEN** the link is removed and the user still exists in Usuários

### Requirement: Link and unlink integrations
The group detail page SHALL have an "Integrações" section with the same behavior as the users section, listing Descrição and Origem → Destino, and offering only integrations not yet linked.

#### Scenario: Link an integration
- **WHEN** the administrator links integration "Ponto → SuccessFactors"
- **THEN** it appears in the section and users of the group can see its logs in the Log Monitor
