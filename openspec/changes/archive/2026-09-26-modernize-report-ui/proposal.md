# Proposal

## Why

The report app (`app/log.monitor.report`) still looks like the Fiori "basic" template it was generated from: logs are an `sap.m.List` of `ObjectListItem`s, statuses appear as raw English codes (`ERROR`), empty results show a bare `noDataText`, and the payload is a plain `TextArea` with no type information and no way to copy it. The cockpit app, delivered by `log-monitor-cockpit-ui`, already established the visual language for this product — card tables (`lmcCard`) with counter + sticky header, `IllustratedMessage` empty states, `ObjectStatus` with semantic icon and pt-BR text, and the payload block in monospace with a "Copiar" action. Report viewers and administrators use both apps, so the report should follow the same style.

## What Changes

- **Log list (`Report.view.xml`)**: replace the `sap.m.List`/`ObjectListItem` with a `sap.m.Table` styled as a card (`class="lmcCard"`, `sticky="ColumnHeaders,HeaderToolbar"`, growing), with columns Integração (`ObjectIdentifier` with `source → target`), Data/Hora, Status and a navigation affordance to the detail column. Its header toolbar carries the title with the row counter, as in the cockpit tables.
- **Empty and no-result states**: replace `noDataText` with an `IllustratedMessage` that distinguishes "no logs for these filters" from "no logs at all".
- **Statuses**: show the translated status (`status_SUCCESS` … `status_RUNNING`) with the cockpit's semantic state *and* icon, instead of the raw code; `RUNNING` becomes `Information` (today the report maps it to `Success`).
- **Log detail (`Detail.view.xml` / `Detail.controller.js`)**: keep the `FlexibleColumnLayout` and the `log/{logId}` route, but restyle the `ObjectPageLayout` like the cockpit detail pages — header attributes in the `lmcHeaderAttributes` grid, the custom-fields table as a card with an `IllustratedMessage` empty state, and the payload section with the payload type (objeto JSON / array com N objetos / texto / vazio), a monospace read-only area (`lmcMonospace lmcPayload`) and a "Copiar" button.
- **Styles**: port the shared style rules the report needs (`lmcPage`, `lmcCard`, `lmcMonospace`, `lmcPayload`, `lmcHint`, `lmcHeaderAttributes`, `lmcPageHeading`, `lmcStrong`, `lmcHeaderCount`) into `app/log.monitor.report/webapp/css/style.css`, which is empty today. Class names and rules are kept identical to the cockpit's so both apps stay in sync.
- **i18n**: add the pt-BR texts the new controls need (status texts, payload type texts, copy feedback, empty-state hints, "Mais"), reusing the cockpit's keys and wording.
- **Formatting**: extend `model/formatter.js` with `statusIcon`/`statusText` (same contract as the cockpit's) and keep using the standard `sap/ui/model/type/DateTime` for dates, replacing the hand-built `toLocaleString("pt-BR")` strings in `Detail.controller.js`.
- **Out of scope**: the `sap.ui.comp.FilterBar` and the dynamic payload-field filters (`matchingLogIds`) keep their current structure and behavior; only the page title/spacing around them changes. The detail column is *not* replaced by a payload dialog — the deep link `#/log/{logId}` stays.

## Capabilities

### New Capabilities
- `report/log-list`: the filtered log list of the report app — table presentation, counter, status rendering, empty states and navigation to the detail column.
- `report/log-detail`: the log detail column — header attributes, custom-fields table and payload block with type indication and copy.

### Modified Capabilities
- None (no `report/*` specs exist yet; `cockpit/*` capabilities are untouched).

## Impact

- `app/log.monitor.report/webapp/`: `view/Report.view.xml`, `view/Detail.view.xml`, `controller/Report.controller.js`, `controller/Detail.controller.js`, `model/formatter.js`, `css/style.css`, `i18n/i18n.properties`, and `manifest.json` (add the `sap.f`/`sap.uxap` libs already used by the views, and `supportedLocales`/`fallbackLocale` on the i18n model so the pt-BR bundle resolves as it does in the cockpit).
- No change to `srv/`, `db/`, `mta.yaml` or `xs-app.json`; the `LogMonitorReport` service and its authorizations are untouched.
- No new npm dependencies. `sap.ui.comp` stays a dependency of the report app because the FilterBar remains.
- Verification is manual (`npm run watch-log.monitor.report`, logging in as `alice@dummy.com`), since the repo has no automated test suite.
