# Spec Delta

## Purpose

Lets administrators declare, per integration, that its logs may be reprocessed — where the reprocessing is triggered and which payload field identifies a record — and keeps that configuration consistent while it is in use.

## ADDED Requirements

### Requirement: Reprocessamento section
The integration detail page SHALL have a "Reprocessamento" section, placed between "Grupos com acesso" and "Notificação", holding in this order: a switch **Permitir reprocessamento**, a **Destination** field naming the BTP destination through which the call is made, a **Trigger URL** field holding the endpoint within that destination, and a **Campo personalizado para reprocessamento** selector. The selector SHALL offer only the payload fields declared for the integration being displayed, shown by their label, and SHALL allow exactly one of them. While the switch is off, the other three SHALL be disabled, and their stored values SHALL be kept. Only an `administrator` SHALL be able to read or maintain this configuration.

#### Scenario: Open the section
- **WHEN** the administrator opens the integration detail page
- **THEN** the sections are "Campos do payload", "Grupos com acesso", "Reprocessamento" and "Notificação", in that order

#### Scenario: Only the integration's own fields are offered
- **WHEN** the administrator opens the field selector of an integration declaring `employeeId` and `costCenter` while other integrations declare other fields
- **THEN** only "Matrícula" and "Centro de custo" are offered, and only one can be chosen

#### Scenario: Switch off disables the rest
- **WHEN** "Permitir reprocessamento" is off
- **THEN** Destination, Trigger URL and the field selector are disabled and the integration cannot be reprocessed

#### Scenario: Values survive turning the switch off
- **WHEN** the administrator turns the switch off and saves
- **THEN** the destination, the trigger path and the chosen field are still stored and reappear when the switch is turned on again

#### Scenario: Report viewer cannot read the configuration
- **WHEN** a user with only the `report-viewer` role requests an integration's reprocessing destination or trigger path
- **THEN** the request returns no such data

### Requirement: Complete configuration before enabling
Enabling reprocessing for an integration SHALL require a destination, a trigger path and a payload field; saving with the switch on and any of them missing SHALL be rejected with HTTP 400 and no change SHALL be stored. The chosen field SHALL belong to the integration being saved; a field of another integration SHALL be rejected with HTTP 400.

#### Scenario: Enabling without a destination
- **WHEN** the administrator turns the switch on, leaves Destination empty and saves
- **THEN** the save is rejected, a message states what is missing, and the integration keeps its previous configuration

#### Scenario: Enabling with everything filled
- **WHEN** the administrator turns the switch on with a destination, a trigger path and a chosen field and saves
- **THEN** the configuration is stored and the integration can be reprocessed

#### Scenario: Field of another integration
- **WHEN** an integration is saved pointing at a payload field that belongs to a different integration
- **THEN** the request is rejected with HTTP 400 and no change is stored

### Requirement: The field in use is protected
A payload field referenced as an integration's reprocessing field SHALL NOT be deleted on its own; the attempt SHALL be rejected with HTTP 409 and the field SHALL remain. Deleting the whole integration SHALL still delete its fields, as it does today.

#### Scenario: Delete the field in use
- **WHEN** the administrator selects the field used for reprocessing and confirms "Excluir"
- **THEN** the deletion is rejected with HTTP 409, a message explains that the field is used for reprocessing, and the field is still listed

#### Scenario: Delete another field
- **WHEN** the administrator deletes a field of the same integration that is not used for reprocessing
- **THEN** that field is deleted and the configuration is untouched

#### Scenario: Delete the integration
- **WHEN** the administrator deletes an integration configured for reprocessing
- **THEN** the integration and all of its fields, including the one used for reprocessing, are deleted
