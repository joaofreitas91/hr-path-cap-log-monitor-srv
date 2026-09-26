# cockpit/navigation Specification

## Purpose

Defines the Log Monitor Cockpit application shell: the left-side navigation menu, the screens it reaches and how detail pages relate to their parent menu entry.

## Requirements

### Requirement: Side navigation menu
The cockpit SHALL display a persistent navigation menu on the left side of the screen with exactly these entries, in this order: "Dashboard", "Integrações", "Usuários", "Grupos de Acesso". The menu SHALL be collapsible and SHALL highlight the entry of the screen currently shown.

#### Scenario: Navigate through the menu
- **WHEN** the administrator selects "Usuários" in the side menu
- **THEN** the users list is shown and the "Usuários" entry is highlighted

#### Scenario: Collapse the menu
- **WHEN** the administrator toggles the menu button in the header
- **THEN** the menu collapses to icons only and the content area widens

### Requirement: Default screen and deep links
The cockpit SHALL open on the Dashboard when no route is given, and every screen (including integration and group detail pages) SHALL have its own URL hash so it can be bookmarked and reloaded.

#### Scenario: Open without hash
- **WHEN** the app is opened with an empty URL hash
- **THEN** the Dashboard is shown

#### Scenario: Reload a detail page
- **WHEN** the administrator reloads the browser on an integration detail URL
- **THEN** the same integration detail is shown with "Integrações" highlighted in the menu

### Requirement: Detail pages keep their parent context
Integration and group detail pages SHALL keep the parent menu entry highlighted and SHALL offer a way back to the parent list.

#### Scenario: Back from group detail
- **WHEN** the administrator is on a group detail page and uses the back/breadcrumb action
- **THEN** the "Grupos de Acesso" list is shown

### Requirement: Administrator-only access
The cockpit SHALL only be usable by users with the `administrator` role; any other user SHALL NOT be able to read or change cockpit data.

#### Scenario: Report viewer opens the cockpit
- **WHEN** a user with only the `report-viewer` role opens the cockpit
- **THEN** the backend rejects the data requests with 403 and no data is shown
