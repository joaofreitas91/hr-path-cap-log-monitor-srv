# Spec Delta

## MODIFIED Requirements

### Requirement: Integrations list
The Integrações screen SHALL follow the same list pattern as the Usuários screen (title with counter "Integrações (N)", search field, multi-selection table, "Adicionar"/"Excluir" toolbar actions, per-row "Editar" opening the same create/edit dialog). Columns SHALL be ID, Descrição, Origem (source), Destino (target), number of fields, number of groups, last modified date and "Editar". The ID SHALL be the first column and SHALL show the integration's UUID in monospace, the same presentation already used for technical identifiers elsewhere in the cockpit. Search SHALL match description, source or target.

#### Scenario: Search by source
- **WHEN** the administrator searches for "successfactors"
- **THEN** integrations whose description, source or target contain it are listed and the counter updates

#### Scenario: ID is visible in the list
- **WHEN** the administrator opens the Integrações screen
- **THEN** the first column of each row shows the integration's UUID, so it can be read or selected without opening the detail page

### Requirement: Navigate to integration detail
Pressing an integration row (outside the "Editar" button and selection checkbox) SHALL open the integration detail page, which shows the description as title, source → target, the integration's ID in monospace and created/modified dates, and offers "Editar" using the same dialog and "Integration API" opening the API reference.

#### Scenario: Open detail
- **WHEN** the administrator presses the row of "S/4HANA → Salesforce"
- **THEN** its detail page opens

#### Scenario: ID is visible in the detail header
- **WHEN** the integration detail page is open
- **THEN** the header shows the integration's UUID alongside source, target and dates
