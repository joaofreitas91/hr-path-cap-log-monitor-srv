# Proposal

## Why

To send logs to the Log Monitor an external system needs two things the cockpit never shows: the integration's `ID` (the `integration_ID` of every log) and the shape of the request accepted by `LogMonitorIntegration`. Today an administrator has to look the UUID up in the database and copy the payload format from `srv/http/integration-service/integration-logs.http`, which is not shipped to them. This change makes the integration's own page the place where that information is obtained.

## What Changes

- The Integrações list shows the integration's UUID in a first **ID** column, and the integration detail header shows the same **ID** as an attribute, both in monospace (the style already used for `iasUserGroup` and `fieldName`).
- The integration detail page gets an **Integration API** action that opens a dialog with two tabs:
  - **Exemplo** — the endpoint (`POST <path>`, service-relative, no host) with a copy button, and a ready-to-send log sample for *this* integration: `integration_ID` filled with the integration's real UUID, a fixed dummy `executedAt`, `status` `"SUCCESS"`, and a `payload` object whose keys are the integration's configured `IntegrationFields` with empty string values. The sample is displayed with the payload expanded (readable), while the copy button yields valid JSON in which `payload` is the escaped string the API actually requires.
  - **Schema** — the field-by-field contract of what an external system sends (`integration_ID`, `executedAt`, `status`, `payload`): which fields are required, the four accepted `status` values, and the fact that `payload` is a JSON string that may hold a single object or an array of objects with arbitrary keys (the configured fields are what the report can filter and sort on, not a restriction on what may be sent).
- `LogMonitorCockpit` gains a read-only function that returns the ingestion endpoint's path as `LogMonitorIntegration` registers it, so the dialog never hardcodes it.
- No change to the data model, to `LogMonitorIntegration`, or to how logs are ingested.

## Capabilities

### New Capabilities
- `cockpit/integration-api`: the Integration API reference on the integration detail page — the sample request built from the integration's own ID and payload fields, the schema documentation, copy-to-clipboard, and the service function that supplies the endpoint path.

### Modified Capabilities
- `cockpit/integrations`: the Integrations list gains an ID column, and the integration detail page gains the ID header attribute and the "Integration API" action.

## Impact

- `app/log.monitor.cockpit/webapp/view/Integrations.view.xml` — new ID column.
- `app/log.monitor.cockpit/webapp/view/IntegrationDetail.view.xml` — ID header attribute, new header action.
- `app/log.monitor.cockpit/webapp/controller/IntegrationDetail.controller.js` — builds the sample from the integration and its fields, opens the dialog, copies to clipboard.
- `app/log.monitor.cockpit/webapp/fragment/IntegrationApiDialog.fragment.xml` (new) — `IconTabBar` with the Exemplo and Schema tabs.
- `app/log.monitor.cockpit/webapp/i18n/i18n.properties` — new pt-BR texts.
- `srv/cockpit-service.cds` / `srv/cockpit-service.js` — new function returning the ingestion endpoint path.
- No database, authorization or deployment changes; `xs-security.json` and `mta.yaml` are untouched.
