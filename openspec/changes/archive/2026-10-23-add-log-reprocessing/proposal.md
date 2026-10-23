# Proposal

## Why

When an integration log comes back with `ERROR`, the Log Monitor tells the team exactly which records failed — the payload rows are right there in the detail — and then the trail ends. Re-running those records means leaving the monitor, finding whoever operates the source system and asking them to trigger it again with the right document numbers. The monitor already knows the records and already knows which integration they belong to; what it lacks is a configured endpoint to call and a button to call it with. This change adds both: an administrator declares, per integration, that reprocessing is allowed, where to trigger it and which payload field identifies a record; the viewer selects the failed rows in the log detail and presses "Reprocessar".

## What Changes

- **Data model**: `Integrations` gains `allowReprocessing`, `reprocessDestination` (the name of a BTP destination), `reprocessPath` (the endpoint within it — the "Trigger URL") and `reprocessField`, an association to one of the integration's own `IntegrationFields`.
- **Cockpit**: a new **Reprocessamento** section on the integration detail page, between "Grupos com acesso" and "Notificação", with the switch **Permitir reprocessamento** first, then **Destination**, **Trigger URL** and **Campo personalizado para reprocessamento**, the last offering only the fields declared for that integration. Enabling reprocessing requires all three to be filled; a field selected for reprocessing cannot be deleted nor have the integration point away from it without the administrator clearing the configuration first.
- **Backend**: `LogMonitorReport` gains an action `reprocessLogs(integrationID, items)` taking the whole selection as one array of `{ key, value }`. It reads the integration's own configuration, refuses the call when reprocessing is disabled, unconfigured, or when an item carries no value or a key other than the configured field, and otherwise sends **one** HTTP POST with the whole array through the configured destination. The destination and the path are never accepted from the caller and are not even readable by the report app: the report's `Integrations` projection excludes them.
- **Report**: the custom fields table of the log detail becomes multi-select and gains a **Reprocessar** action, shown only for integrations with reprocessing enabled and enabled only with rows selected. It collects the configured field's value from each selected row, refuses locally with a message when a value is missing, and otherwise calls the action once for the whole selection and reports the outcome — including the endpoint's own error message when the call fails.
- Not changed: how logs are ingested or stored. Reprocessing creates no log of its own; the reprocessed execution shows up as whatever log the source system sends back through `LogMonitorIntegration`.

## Capabilities

### New Capabilities
- `cockpit/reprocessing`: the Reprocessamento section of the integration detail page — the switch, the destination, the trigger path, the choice of the identifying payload field, the validation of that configuration and the protection of the field while it is in use.
- `report/log-reprocessing`: reprocessing from the log detail — the multi-selection of payload rows, the "Reprocessar" action, the `reprocessLogs` action of `LogMonitorReport`, the single POST through the configured destination and the error handling on both sides.

### Modified Capabilities
- `cockpit/integrations`: the integration detail page now presents four sections, with "Reprocessamento" between "Grupos com acesso" and "Notificação".

## Impact

- `db/schema.cds` — `allowReprocessing`, `reprocessDestination`, `reprocessPath` and `reprocessField` on `Integrations`.
- `srv/report-service.cds` — the `ReprocessItem` type, the `reprocessLogs` action, and `Integrations` projected excluding `reprocessDestination` and `reprocessPath`.
- `srv/report-service.js` — the `reprocessLogs` handler: validation, destination resolution, the single POST, error mapping.
- `srv/lib/reprocess-trigger.js` (new) — the outbound call, isolated the way `srv/lib/mailer.js` isolates SMTP.
- `srv/cockpit-service.js` — guards rejecting the deletion of a field used for reprocessing and an integration configuration that is incomplete or points at a field of another integration.
- `_i18n/messages.properties` — the new pt-BR error texts.
- `package.json` — `@sap-cloud-sdk/http-client` and `@sap-cloud-sdk/connectivity` as dependencies.
- `app/log.monitor.cockpit/webapp/view/IntegrationDetail.view.xml` and `controller/IntegrationDetail.controller.js` — the Reprocessamento section and its binding.
- `app/log.monitor.report/webapp/view/Detail.view.xml` and `controller/Detail.controller.js` — multi-selection, the "Reprocessar" action and the call.
- `app/log.monitor.cockpit/webapp/i18n/i18n.properties` and `app/log.monitor.report/webapp/i18n/i18n.properties` — the new pt-BR texts.
- `srv/http/report-service/` — a REST Client request for `reprocessLogs`.
- `.env.example` and `CLAUDE.md` — how to point a local destination at a test endpoint.
- `mta.yaml` is untouched: the `srv` module already requires `hr-path-cap-log-monitor-destination`.
