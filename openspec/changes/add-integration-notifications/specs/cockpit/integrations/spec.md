# Spec Delta

## MODIFIED Requirements

### Requirement: Navigate to integration detail
Pressing an integration row (outside the "Editar" button and selection checkbox) SHALL open the integration detail page, which shows the description as title, source → target and created/modified dates, and offers "Editar" using the same dialog. The page SHALL present its content in three sections, in this order: "Campos do payload", "Grupos com acesso" and "Notificação".

#### Scenario: Open detail
- **WHEN** the administrator presses the row of "S/4HANA → Salesforce"
- **THEN** its detail page opens

#### Scenario: Sections available
- **WHEN** the integration detail page is open
- **THEN** the sections "Campos do payload", "Grupos com acesso" and "Notificação" can each be reached from the page
