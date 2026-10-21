# Spec Delta

## MODIFIED Requirements

### Requirement: Payload fields maintenance
The integration detail page SHALL list the integration's payload fields using the same list pattern (title with counter, search, multi-select, "Adicionar"/"Excluir", per-row "Editar", one shared dialog). Columns SHALL be Nome técnico (`fieldName`), Rótulo (`label`), Descrição and Filtrável. The dialog SHALL have Nome técnico (required), Rótulo (required), Descrição (optional) and a switch Filtrável (default off). A payload field SHALL NOT carry a sortability flag: whether the report can sort by a field is not configurable per field. New fields SHALL belong to the integration being displayed.

#### Scenario: Add a filterable field
- **WHEN** the administrator adds field `employeeId` with label "Matrícula" and Filtrável on
- **THEN** the field is listed in the detail page and the Log Monitor report offers a "Matrícula" filter for that integration

#### Scenario: Missing label
- **WHEN** the administrator saves a field without Rótulo
- **THEN** saving is blocked and Rótulo is marked as required

#### Scenario: Delete fields
- **WHEN** the administrator selects two fields and confirms "Excluir"
- **THEN** only those fields are deleted and the integration remains

#### Scenario: No sortability switch
- **WHEN** the administrator opens the payload field dialog
- **THEN** Filtrável is the only switch offered, and the fields table has no Ordenável column
