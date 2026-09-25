## Purpose

Lets administrators maintain the users that can be linked to access groups, using the cockpit's standard list pattern (search, counter, multi-select delete, dialog create/edit).

## ADDED Requirements

### Requirement: Users list
The Usuários screen SHALL show all users in a multi-selection table with columns Nome, E-mail, number of groups, last modified date and a per-row "Editar" button, under a title that shows the current number of listed users, e.g. "Usuários (42)".

#### Scenario: Counter reflects the list
- **WHEN** 42 users exist and no search is active
- **THEN** the title reads "Usuários (42)"

### Requirement: Simple search
The screen SHALL provide a single search field that filters the list by name or e-mail (case-insensitive, substring), and the title counter SHALL show the number of matching users.

#### Scenario: Search by e-mail
- **WHEN** the administrator searches for "alice"
- **THEN** only users whose name or e-mail contains "alice" are listed and the counter shows their count

#### Scenario: No match
- **WHEN** the search matches no user
- **THEN** the table shows "Nenhum usuário encontrado"

### Requirement: Create and edit in the same dialog
The toolbar "Adicionar" action SHALL open a dialog with fields Nome (required) and E-mail (required, e-mail format). The per-row "Editar" button SHALL open the same dialog pre-filled with the row's data. Saving SHALL be blocked while a required field is empty or the e-mail is invalid, and the invalid fields SHALL be marked with a message. Cancel SHALL discard all changes.

#### Scenario: Create user
- **WHEN** the administrator presses "Adicionar", fills Nome and a valid E-mail and presses "Salvar"
- **THEN** the user is created, the dialog closes, a success toast is shown and the list and counter are updated

#### Scenario: Edit user
- **WHEN** the administrator presses "Editar" on a row, changes the name and presses "Salvar"
- **THEN** the same dialog (titled "Editar usuário") saves the change to that user

#### Scenario: Validation
- **WHEN** the administrator presses "Salvar" with an empty Nome
- **THEN** nothing is sent and Nome is marked as required

#### Scenario: Cancel edit
- **WHEN** the administrator changes a field in "Editar" and presses "Cancelar"
- **THEN** the user keeps its original values

### Requirement: Multi-delete with confirmation
The toolbar "Excluir" action SHALL be enabled only when at least one row is selected, SHALL ask for confirmation stating how many users will be deleted and that they will be removed from their groups, and SHALL delete all selected users on confirmation.

#### Scenario: Delete selected users
- **WHEN** 3 users are selected and the administrator confirms "Excluir"
- **THEN** the 3 users and their group links are deleted, a toast "3 usuários excluídos" is shown and the counter decreases by 3

#### Scenario: Nothing selected
- **WHEN** no row is selected
- **THEN** "Excluir" is disabled
