# Proposal

## Why

The `LogMonitorCockpit` service is about to get an administrator UI (change `log-monitor-cockpit-ui`) with delete, link and dashboard features, and the backend is not ready for it: `UserGroups` / `IntegrationGroups` are plain associations, so deleting a user, group or integration leaves orphan links (and the same pair can be linked twice); the effect of deleting an integration is not specified; and dashboard metrics would depend on OData `$apply` aggregation, whose support differs between SQLite and HANA. Fixing this first lets the backend be delivered and verified with `srv/http` before any UI work.

## What Changes

- Deleting a `User`, `Group` or `Integration` through `LogMonitorCockpit` also deletes the `UserGroups` / `IntegrationGroups` rows that reference it, in the same transaction.
- Creating a duplicate user–group or integration–group link is rejected with HTTP 409.
- Deleting an `Integration` is specified as an atomic cascade (logs, fields, group links), and `Integrations` in `LogMonitorCockpit` exposes how many logs and fields would be affected, so a client can warn before deleting.
- New function `logMetrics(from, to, integrationID)` in `LogMonitorCockpit` returns log counts by status and by integration for a period, computed server-side with CQL `groupBy` (works on SQLite and HANA).

## Capabilities

### New Capabilities
- `cockpit/link-integrity`: link cleanup on delete and duplicate-link rejection.
- `cockpit/integration-deletion`: atomic integration delete cascade and exposure of the affected log/field counts.
- `cockpit/log-metrics`: server-side log metrics by status and by integration for a period.

### Modified Capabilities
- None (no specs exist yet in `openspec/specs/`).

## Impact

- `srv/cockpit-service.cds` (was `srv/service.cds`, now split per service): `LogMonitorCockpit` gets the `logMetrics` function, its return types and the virtual/calculated counts on `Integrations`.
- `srv/cockpit-service.js`: handlers for `LogMonitorCockpit`; the report handler moves unchanged to `srv/report-service.js`.
- `srv/http/cockpit-service/*.http`: new requests for deletes, duplicate links and metrics.
- No schema (`db/schema.cds`) change, no HDI impact, no new dependencies. `LogMonitorReport` and `LogMonitorIntegration` are unchanged.
- The UI change `log-monitor-cockpit-ui` depends on this change.
