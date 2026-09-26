## Purpose

Lets administrators maintain integrations and the payload fields (IntegrationFields) that drive the Log Monitor's dynamic filters and columns, reusing the cockpit's standard list pattern.

## ADDED Requirements

### Requirement: Integrations list
The Integrações screen SHALL follow the same list pattern as the Usuários screen (title with counter "Integrações (N)", search field, multi-selection table, "Adicionar"/"Excluir" toolbar actions, per-row "Editar" opening the same create/edit dialog). Columns SHALL be Descrição, Origem (source), Destino (target), number of fields, number of groups, last modified date and "Editar". Search SHALL match description, source or target.

#### Scenario: Search by source
- **WHEN** the administrator searches for "successfactors"
- **THEN** integrations whose description, source or target contain it are listed and the counter updates

### Requirement: Integration dialog
The create/edit dialog SHALL have fields Descrição, Origem and Destino, all required, with the same validation and cancel behavior as the user dialog.

#### Scenario: Create integration
- **WHEN** the administrator fills the three fields and presses "Salvar"
- **THEN** the integration is created and appears in the list

### Requirement: Integration delete warns about cascade
Deleting integrations SHALL require a confirmation that explicitly states that the integrations' logs and payload fields will also be deleted, including the total number of logs that will be removed.

#### Scenario: Confirmation shows log count
- **WHEN** the administrator selects two integrations with 100 and 20 logs and presses "Excluir"
- **THEN** the confirmation states that 120 logs will be deleted

#### Scenario: Delete integration
- **WHEN** the administrator confirms deletion of an integration that has logs
- **THEN** the integration, its logs, its fields and its group links are deleted

### Requirement: Navigate to integration detail
Pressing an integration row (outside the "Editar" button and selection checkbox) SHALL open the integration detail page, which shows the description as title, source → target and created/modified dates, and offers "Editar" using the same dialog.

#### Scenario: Open detail
- **WHEN** the administrator presses the row of "S/4HANA → Salesforce"
- **THEN** its detail page opens

### Requirement: Payload fields maintenance
The integration detail page SHALL list the integration's payload fields using the same list pattern (title with counter, search, multi-select, "Adicionar"/"Excluir", per-row "Editar", one shared dialog). Columns SHALL be Nome técnico (`fieldName`), Rótulo (`label`), Descrição, Filtrável and Ordenável. The dialog SHALL have Nome técnico (required), Rótulo (required), Descrição (optional) and switches Filtrável and Ordenável (default off). New fields SHALL belong to the integration being displayed.

#### Scenario: Add a filterable field
- **WHEN** the administrator adds field `employeeId` with label "Matrícula" and Filtrável on
- **THEN** the field is listed in the detail page and the Log Monitor report offers a "Matrícula" filter for that integration

#### Scenario: Missing label
- **WHEN** the administrator saves a field without Rótulo
- **THEN** saving is blocked and Rótulo is marked as required

#### Scenario: Delete fields
- **WHEN** the administrator selects two fields and confirms "Excluir"
- **THEN** only those fields are deleted and the integration remains

### Requirement: Groups with access (read-only)
The integration detail page SHALL show, read-only, the access groups linked to the integration.

#### Scenario: Linked groups listed
- **WHEN** the integration is linked to group "RH Folha"
- **THEN** "RH Folha" is listed in the detail page
