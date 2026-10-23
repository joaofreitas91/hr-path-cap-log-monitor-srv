# Spec Delta

## MODIFIED Requirements

### Requirement: Navigate to integration detail
Pressing an integration row (outside the "Editar" button and selection checkbox) SHALL open the integration detail page, which shows the description as title, source → target, the integration's ID in monospace and created/modified dates, and offers "Editar" using the same dialog and "Integration API" opening the API reference. The page SHALL present its content in four sections, in this order: "Campos do payload", "Grupos com acesso", "Reprocessamento" and "Notificação".

#### Scenario: Open detail
- **WHEN** the administrator presses the row of "S/4HANA → Salesforce"
- **THEN** its detail page opens

#### Scenario: ID is visible in the detail header
- **WHEN** the integration detail page is open
- **THEN** the header shows the integration's UUID alongside source, target and dates

#### Scenario: Sections available
- **WHEN** the integration detail page is open
- **THEN** the sections "Campos do payload", "Grupos com acesso", "Reprocessamento" and "Notificação" can each be reached from the page

#### Scenario: Reprocessamento sits before Notificação
- **WHEN** the administrator moves through the sections in order
- **THEN** "Reprocessamento" comes after "Grupos com acesso" and before "Notificação"
