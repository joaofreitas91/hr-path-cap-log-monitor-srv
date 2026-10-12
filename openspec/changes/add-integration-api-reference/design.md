# Design

## Context

See `proposal.md` — Why. Constraints that shape the approach:

- The cockpit is a freestyle UI5 app whose only data source is `/odata/v4/log-monitor-cockpit/`. It is served from the HTML5 repository behind the app router, whose host is **not** the host of the `srv` module where `LogMonitorIntegration` lives. So no host the browser can see is the right one to show, and the dialog shows the endpoint's path alone.
- `IntegrationLogs.payload` is a `LargeString`. The API therefore takes `payload` as a JSON *string*, as `srv/http/integration-service/integration-logs.http` shows. A nested object is rejected.
- The detail page already binds the integration (`bindViewElement("/Integrations(<id>)")`) and lists its `fields` in `fieldsTable`, whose binding is filtered by the page's search field.
- `Dashboard.controller.js` already has the pattern this dialog needs: a lazily loaded fragment cached on the controller, a named JSON model holding what the dialog shows, and `navigator.clipboard.writeText` with a success/failure toast.

## Goals / Non-Goals

**Goals:**
- One place on the integration page that answers "where do I post, and what do I post for *this* integration".
- A copy button whose output is accepted by the ingestion endpoint unchanged.
- An endpoint the administrator can trust, with no host invented by the browser.

**Non-Goals:**
- Authentication guidance (how to obtain an XSUAA token or bind the destination). The dialog documents the request body and the endpoint, not the credentials.
- A generated OpenAPI document or a downloadable spec file; the SAP dialog in the reference screenshot offers one, this change does not.
- Any editing of logs from the dialog, and any change to how `LogMonitorIntegration` validates input.
- Opening the reference from the Integrações list — it is a detail-page action only.

## Decisions

### The endpoint path comes from the backend; no host is shown

A new unbound function on `LogMonitorCockpit`:

```cds
function integrationApiPath() returns String;
```

Its handler returns `<path>/IntegrationLogs`, where the path is the registered path of the `LogMonitorIntegration` service (`cds.services.LogMonitorIntegration.path`, falling back to the literal `/odata/v4/log-monitor-integration`).

*Why a function at all, for a value that looks constant.* The path is owned by `LogMonitorIntegration`; reading it from the running service means renaming that service cannot leave the cockpit showing an endpoint that no longer exists. The fallback literal keeps the dialog working if the lookup ever returns nothing.

*Why no host.* The host differs per landscape and is not knowable from the app: `window.location.origin` is the app router's, not the `srv` module's, and the app router's `/odata` route is protected by the browser's xsuaa login rather than usable by a machine client. Showing a host that the external system must not use is worse than showing none, so the dialog shows the path and a note saying which host it is relative to. (An earlier draft of this design derived the host from `VCAP_APPLICATION.application_uris`; it was dropped because even that route may sit behind a custom domain or an API gateway.)

The function is unbound and read-only; the service's `@(requires: ['administrator'])` already restricts it, so no extra `@restrict` is needed.

### Two representations of the same sample

The controller builds one object and derives two strings from it:

| | shown in the dialog | put on the clipboard |
|---|---|---|
| `payload` | nested object, indented | `JSON.stringify` of that object, as a string value |

Both are stored in a view-scoped JSON model (`apiSample`), following `Dashboard.controller.js`'s `payload` model. The displayed form is the readable one the user asked for; the copied form is the one the endpoint accepts. A short hint under the sample states that `payload` travels as a JSON string and that the copy button produces the sendable body — without it, a user who selects the text manually would copy something the API rejects.

The example `executedAt` is a fixed literal (`2026-01-15T10:30:00.000Z`), not `new Date()`: the point is the format, and a frozen value keeps the dialog deterministic.

### The sample reads `fields` through its own list binding

The payload keys come from a dedicated `bindList("fields", <view context>, [new Sorter("fieldName")], [], { $select: "fieldName" })` rather than from `fieldsTable`'s contexts. The table's binding carries the page's search filter and its growing threshold, so reusing it would silently drop fields from the sample whenever a search was active.

### The dialog is one fragment with an `IconTabBar`

`fragment/IntegrationApiDialog.fragment.xml`: a `Dialog` containing an `sap.m.IconTabBar` with the "Exemplo" and "Schema" filters, loaded with `loadFragment` on first press and cached on the controller (`this._oApiDialog ??= ...`), exactly like `PayloadDialog`.

- **Exemplo**: endpoint row (`POST` + path in monospace + copy button), then a toolbar with the title and the sample's copy button, then a read-only `TextArea` with the expanded sample — the same `lmcMonospace lmcPayload` treatment as the payload dialog.
- **Schema**: a static, non-interactive `sap.m.Table` with one row per field an external system sends — `integration_ID`, `executedAt`, `status`, `payload` (Campo / Tipo / Obrigatório / Valores aceitos) — its texts from `i18n.properties`, plus note paragraphs about the payload being a string that may hold an object or an array of objects with arbitrary keys, about configured fields affecting only filtering and sorting in the report, and about which host the path is relative to. The log's own `ID` is not listed: the service generates it, so it is not part of what the caller has to supply.

The schema table is static content, so it is written in XML rather than generated from the CDS model: deriving it at runtime would mean exposing metadata the app does not otherwise consume, for four rows that change only when the data model changes.

The `IconTabBar` stretches its content, so the `Dialog` carries an explicit `contentHeight` — without one the dialog collapses to almost no height and is positioned far too low on the screen.

### Clipboard copying moves to `BaseController`

This change adds two copy buttons; `Dashboard.controller.js` already has one. A `copyToClipboard(sText, sSuccessKey, sFailureKey)` helper goes into `BaseController` and `Dashboard.onCopyPayload` is switched to call it, so the three buttons share one implementation instead of diverging. This is the only pre-existing code the change touches.

### ID presentation

In the list, the first column, with `minScreenWidth="Desktop"` and `demandPopin="true"` so the 36-character UUID pops in on narrow screens instead of squeezing the other columns; the cell is a `Text` with `class="lmcMonospace"`. In the detail header, a `VBox` attribute next to Origem/Destino, same monospace class — matching how `iasUserGroup` and `fieldName` are already rendered.

## Risks / Trade-offs

- **The administrator still has to know the host** to assemble a full URL → the Schema tab states that the path is relative to the service module's host in the landscape where it is published. This is deliberate: any host the app could guess would be wrong for a machine-to-machine caller.
- **A user selects the sample text by hand instead of pressing Copiar** and sends the expanded payload, which the API rejects → the hint under the sample and the Schema tab both state that `payload` is a string; this is the price of the readable display the user chose over showing the escaped form.
- **`navigator.clipboard` needs a secure context** (https or localhost) → same limitation the dashboard's copy button already has; the failure toast tells the user, and the text stays selectable.
- **`cds.services.LogMonitorIntegration.path` is not a documented contract** and could change across `@sap/cds` majors → the literal fallback keeps the function working, and the value was verified against the running service during implementation (the fallback is not used).
- **No automated tests in this repo** → verification is manual, through `cds watch` and a round trip: copy the sample from the dialog and post it with the REST Client file.

## Migration Plan

No data model, authorization or deployment change: `cds build --production` and the usual `npm run build && npm run deploy`. Rolling back is redeploying the previous archive; nothing persists from this change.
