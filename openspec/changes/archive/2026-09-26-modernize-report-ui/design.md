# Design

## Context

See `proposal.md` — Why. What shapes the approach:

- The report app is a freestyle UI5 app with only two controllers (`Report`, `Detail`) and no `BaseController`; the cockpit's shared list pattern lives in `com.hrpath.log.monitor.cockpit.controller.BaseController`, which is another app's namespace and cannot be imported from the report.
- The two apps are deployed as separate HTML5 modules (each with its own `ui5-deploy.yaml` zip in `mta.yaml`), so they cannot share a stylesheet or a UI5 library at runtime.
- `LogMonitorReport` is read-only. The list rows come from a V4 list binding on `/IntegrationLogs`; the payload is a JSON string and `IntegrationFields` must be read separately for the log's integration, exactly as `Detail.controller.js` does today.
- `Report.controller.js` owns the dynamic field filters and the `matchingLogIds` call. That logic is untouched by this change, so the list restyle must not disturb the `filterBar` ids, the `integrationsList` binding path or `onSearch`.
- The repo has no automated tests; verification is `npm run watch-log.monitor.report` plus the requests in `srv/http/`.

## Goals / Non-Goals

**Goals:**

- The report's list, detail and payload read as the same product as the cockpit: same card tables, same status rendering, same payload block.
- Keep the list controller's filter logic (including `matchingLogIds`) working unchanged.
- Keep the existing routes (`""` and `log/{logId}`) and the `FlexibleColumnLayout`, so deep links keep working.

**Non-Goals:**

- No shared UI5 library or shared CSS artifact between the two apps (see Decisions).
- No change to the `sap.ui.comp.FilterBar`, to the dynamic payload-field filters, or to any backend behavior.
- No new screens, no dashboard/KPIs in the report.

## Decisions

### Copy the cockpit's CSS rules, keeping the `lmc*` class names

The report's `css/style.css` is empty. The rules it needs (`lmcPage`, `lmcCard`, `lmcPageHeading`, `lmcHeaderAttributes`, `lmcHeaderCount`, `lmcMonospace`, `lmcPayload`, `lmcHint`, `lmcStrong`) are copied verbatim from the cockpit's stylesheet — including the class names — so the two files stay textually comparable and a future extraction into a shared library is a move, not a rewrite. The dashboard-only blocks (KPI grid, donut, bars, status colors) are not copied.

Alternatives considered: (a) a report-specific `lmr*` prefix — rejected, it makes the two stylesheets diverge textually while rendering identically; (b) extracting a shared UI5 library — rejected as disproportionate: it would add a third module to `mta.yaml` and a build step for two small screens' worth of CSS.

### No BaseController in the report; a small `view` JSON model per controller

The report needs only two pieces of the cockpit's list pattern: the row counter (`view>/counts/<tableId>`, set on `updateFinished`) and the "search vs. empty" flag driving the `IllustratedMessage`. `Report.controller.js` gets a `view` JSON model in `onInit` and an `onTableUpdateFinished` handler that mirrors the cockpit's, without introducing a `BaseController` for a single consumer (the cockpit's base also carries dialogs, multi-delete and `submitBatch` plumbing that a read-only app has no use for).

The "no results" flag is derived from the filter state the report already computes in `onSearch` (any filter set vs. none), not from a search field — the report filters through the FilterBar, so there is no single search term to echo in the message.

Alternative considered: porting the cockpit's `BaseController` wholesale — rejected per the repo's "no abstractions for single-use code" guideline; most of it would be dead code here.

### Detail: bind the view to the log, keep a JSON model only for derived data

`Detail.controller.js` currently loads the log with `bindContext`, then copies every field into a `detail` JSON model, formatting the date by hand with `toLocaleString("pt-BR")`. The header and the attributes will instead come from an element binding on `/IntegrationLogs(<id>)` with `$expand=integration(...)`, so the XML can use `sap/ui/model/type/DateTime` with `source.pattern` — the pattern CLAUDE.md prescribes and the cockpit's detail pages use.

The `detail` JSON model stays, reduced to what has to be derived in JS and has no OData counterpart: the pretty-printed payload text and its type label. The dynamic field rows keep their own `logs` JSON model, since the columns depend on `IntegrationFields` and must be built at runtime.

Alternative considered: keeping everything in the JSON model and formatting with `DateFormat` in the controller (as the cockpit's Dashboard does for `logMetrics` results) — rejected here because the log *is* an OData entity, so there is no reason to hand-copy it; `DateFormat` in the cockpit is used for data that never was one.

### `statusText`/`statusIcon` in the report's own formatter

`model/formatter.js` gains `statusIcon` and `statusText` with the same contract as the cockpit's (including `statusText` reading `i18n` off `this`, which UI5 sets to the control or the controller depending on the binding), and `RUNNING` is remapped from `Success` to `Information`. The status keys `status_SUCCESS`…`status_RUNNING` are added to the report's `i18n.properties` with the cockpit's wording.

This is a behavior change the specs record: today the report shows the raw code and paints `RUNNING` green.

### Payload type derived exactly as the cockpit does

The payload type label (objeto JSON / array com N objetos / texto / vazio) reuses the cockpit's `_describePayload` logic and its i18n keys (`payloadObject`, `payloadArray_one`/`_other`, `payloadText`, `payloadEmpty`), including the plural helper: the report gets a small `getCountText` equivalent for the array key, since it has no `BaseController` to inherit it from.

### manifest: declare the libs the views use, and pin the i18n locale

`sap.f` and `sap.uxap` are used by the report's views but missing from `dependencies.libs`; they are added, as is `sap.ui.comp` (already used by the FilterBar). The i18n model gets `supportedLocales: [""]` and `fallbackLocale: ""` like the cockpit's, so the single pt-BR bundle is served without a 404 round-trip for `i18n_<locale>.properties`.

## Risks / Trade-offs

- **The CSS is duplicated in two apps** → the rules are copied verbatim with the same class names, and the proposal records that both files must be changed together; the shared-library extraction stays an option if a third app appears.
- **Restyling the list touches the controller that owns `matchingLogIds`** → the binding path, the control ids used by `onSearch`/`onClear` and the filter logic stay as they are; only `onListUpdateFinished` (which rewrote the list header text) is replaced by the counter model. Verify with an integration that declares filterable fields, using `srv/http/`-seeded data.
- **`RUNNING` changes color from green to blue** → intended (it matches the cockpit and the semantics), and recorded as a requirement so it is not read as a regression.
- **`sap.uxap`/`sap.f` were already loading implicitly** → declaring them changes nothing visually but makes the preload build (`ui5 build preload`) deterministic; if the built app behaves differently from `cds watch`, this is the first place to look.
- **No automated tests** → each task carries a manual verification step against the running app.

## Migration Plan

Not applicable: no data, API or URL changes. The routes and the `log/{logId}` deep link are preserved, so an existing bookmark keeps working. Rollback is reverting the commit; nothing outside `app/log.monitor.report/webapp/` is touched.
