# Design

## Context

The backend has never made an outbound HTTP call. Its only egress today is SMTP through `nodemailer`, isolated in `srv/lib/mailer.js`, and `@sap-cloud-sdk/*` is not installed. `package.json` already declares `cds.requires.destinations: true` and the `srv` module of `mta.yaml` already requires `hr-path-cap-log-monitor-destination`, but nothing in the code has ever resolved a destination.

On the data side, the configuration has to live on `Integrations`, and the field that identifies a record has to be one of that integration's own `IntegrationFields` — the same rows the report already turns into the columns of the custom fields table. On the UI side, the trigger is in the report app, whose service `LogMonitorReport` is read-only today and is reachable by `report-viewer` as well as `administrator`.

## Goals / Non-Goals

**Goals:**

- One place to configure reprocessing per integration, next to the other per-integration settings.
- One POST per press, carrying every selected record, with the endpoint and its credentials resolved on the server.
- The caller never names the endpoint, and the report app cannot even read it.
- Failures — misconfiguration, missing values, a refusing endpoint — reach the viewer as a sentence they can act on.

**Non-Goals:**

- Recording the reprocessing itself. No log, no audit entry, no status on the original log. The reprocessed execution appears as whatever the source system later sends through `LogMonitorIntegration`.
- Retrying, queueing or tracking the outcome asynchronously. The POST is made inside the request and its result is the answer.
- On-premise endpoints. Those would additionally need the connectivity service bound to `srv`; only internet destinations are in scope.
- Reprocessing from the log list. The selection is per payload row, which only the detail has.

## Decisions

### The destination supplies the host and the credentials; `reprocessPath` is the endpoint within it

The feature was described as a single "Trigger URL". Routing the call through a BTP destination instead means the credentials live in the BTP cockpit, rotate without a redeploy, and never sit in the application database. What remains per integration is the part a destination cannot express: which endpoint of that system to hit. So the section has two fields — **Destination**, the name registered in BTP, and **Trigger URL**, the path appended to the destination's URL.

Locally there is no destination service. `@sap-cloud-sdk/connectivity` reads the `destinations` environment variable, so the gitignored `.env` can hold one pointing at a test server, the same shape as the existing MailDev instructions:

```
destinations=[{"name":"REPROCESS_TEST","url":"http://localhost:3100"}]
```

- *Alternative*: store an absolute URL and POST to it directly with the global `fetch` — rejected, it either means an unauthenticated endpoint or a secret in the database.
- *Alternative*: put the full path in the destination and drop the second field — rejected, changing the endpoint would then require BTP access rather than the cockpit.

### `reprocessField` is an association to `IntegrationFields`, not a copied field name

The configuration points at the row the administrator picked, so renaming the field's `fieldName` keeps the configuration pointing at the right field, and "is this field in use?" is a query rather than a string comparison. The association targets the entity that is also the target of the `fields` composition, which CDS accepts and flags; if the generated referential constraint causes trouble on an HDI deploy, the association is annotated `@assert.integrity: false` and the `before('DELETE')` guard remains the authority — it is the guard, not the constraint, that produces the message the administrator reads.

- *Alternative*: `reprocessFieldName : String(100)` — rejected, it goes stale on a rename and turns the in-use check into string matching.
- *Alternative*: a flag on `IntegrationFields` instead — rejected, "exactly one per integration" then needs its own uniqueness guard and the configuration is split over two entities.

### The guard lives on the cockpit service, on both DELETE and UPDATE

A field in use cannot simply be protected on delete: clearing it through a PATCH of the field, or pointing the integration at a field of another integration, would leave the configuration broken just as effectively. So `srv/cockpit-service.js` gets a `before('DELETE', IntegrationFields)` rejecting the removal of a field referenced by its integration, and a `before(['CREATE','UPDATE'], Integrations)` validating the configuration as a whole: reprocessing enabled requires all three settings, and `reprocessField` must belong to the integration being saved. Both follow the existing convention — `req.reject(<code>, '<KEY>')` with the pt-BR text in `_i18n/messages.properties`, surfacing in the cockpit through `BaseController`'s existing error handling. Deleting the whole integration still cascades normally; the guard only protects a field against being removed on its own.

### The action is unbound on `LogMonitorReport` and trusted with nothing but the selection

`reprocessLogs(integrationID: UUID, items: array of ReprocessItem)` sits next to `matchingLogIds`, and the app calls it with the same `bindContext("/reprocessLogs(...)")` pattern the cockpit already uses for `integrationApiPath`. `key` is a CDS keyword, so the type escapes it as `![key]`. The handler loads the integration itself and takes destination, path and configured field from the row — never from the payload — and rejects any item whose `key` is not the configured field's `fieldName`. The report's projection excludes `reprocessDestination` and `reprocessPath`, so those two columns are not even readable by a viewer who queries the service directly.

`report-viewer` may trigger a reprocessing. That is a deliberate widening: the role already sees the failed records and is the role that investigates them, and the integration's own switch is what decides whether reprocessing is possible at all.

### The outbound call is isolated in `srv/lib/reprocess-trigger.js`

The module exports one function taking the destination name, the path and the items, and returning the endpoint's answer or throwing with its status and body — the same shape of isolation `srv/lib/mailer.js` gives SMTP. The handler stays about validation and error mapping, and the single place that knows about `executeHttpRequest` can be swapped without touching the service. A non-2xx answer becomes `REPROCESS_TRIGGER_FAILED` with the status and the endpoint's message as arguments, so the viewer reads what the endpoint actually said.

## Risks / Trade-offs

- **The POST is synchronous inside the OData request; a slow endpoint holds the request open** → accepted for a user-initiated action with a visible busy state, bounded by an explicit timeout on the call so the request cannot hang indefinitely. Queueing is an explicit non-goal.
- **A partially accepted batch cannot be expressed** → the contract is one POST with the whole array; whatever the endpoint answers is passed back as a whole. Per-item outcomes would require the endpoint to report them, which is outside this contract.
- **`report-viewer` can trigger a real execution in the source system** → accepted and deliberate; the per-integration switch is the control, and the configuration itself stays administrator-only.
- **The association to a composition target may produce an unwanted referential constraint on HANA** → `@assert.integrity: false` plus the service-level guard, which is where the readable message comes from anyway.
- **Two new runtime dependencies in the server module** → `@sap-cloud-sdk/http-client` and `@sap-cloud-sdk/connectivity` are the SAP-supported way to reach a destination from CAP Node; the alternative is hand-rolling destination lookup and token handling.
- **A destination configured in BTP but missing at runtime** → the call fails with the same `REPROCESS_TRIGGER_FAILED` path and names the destination, rather than failing silently.

## Migration Plan

1. Add the four elements to `Integrations` in `db/schema.cds` and run `cds deploy --to sqlite`. All four are nullable with `allowReprocessing` defaulting to false, so every existing integration starts with reprocessing off and nothing changes for it.
2. Install `@sap-cloud-sdk/http-client` and `@sap-cloud-sdk/connectivity` and add the local `destinations` entry to `.env`, pointing at a test endpoint.
3. Ship the backend — action, guards, messages — and exercise it from `srv/http/report-service/` before any UI exists.
4. Ship the cockpit section, then the report action; until an administrator enables the switch on an integration, the "Reprocessar" button appears nowhere.
5. In Cloud Foundry, register the destinations in the BTP cockpit and `cf restart hr-path-cap-log-monitor-srv`; the destination binding is already in `mta.yaml`.
6. Rollback: turn the switch off on every integration, which hides the button and makes the action refuse every call, then redeploy the previous version. The four columns can stay — they are inert while `allowReprocessing` is false.
