# Tasks

## 1. Backend: ingestion endpoint URL

- [x] 1.1 Declare `function integrationApiPath() returns String;` in `srv/cockpit-service.cds` and verify `cds watch` starts and `$metadata` of `/odata/v4/log-monitor-cockpit/` lists the function
- [x] 1.2 Implement the `integrationApiPath` handler in `srv/cockpit-service.js`, returning `<path>/IntegrationLogs` with the path from `cds.services.LogMonitorIntegration.path` and the literal `/odata/v4/log-monitor-integration` as fallback, and verify the fallback is actually unused by temporarily changing it
- [x] 1.3 Add a request for `integrationApiPath()` to the cockpit REST Client file under `srv/http/` and verify it returns `/odata/v4/log-monitor-integration/IntegrationLogs` as `john.doe@dummy.com` and is rejected for `alice@dummy.com`

## 2. ID in the Integrations list and detail header

- [x] 2.1 Add the ID as the first column of `app/log.monitor.cockpit/webapp/view/Integrations.view.xml` (`minScreenWidth="Desktop"`, `demandPopin="true"`, cell `Text` with `class="lmcMonospace"`) and its i18n text, then verify in `npm run watch-log.monitor.cockpit` that each row shows its UUID first and that the column pops in when the window is narrowed
- [x] 2.2 Add the ID attribute to the header of `app/log.monitor.cockpit/webapp/view/IntegrationDetail.view.xml` next to Origem/Destino, same monospace class, and verify the detail page of an integration shows the same UUID as its list row

## 3. Shared clipboard helper

- [x] 3.1 Add `copyToClipboard(sText, sSuccessKey, sFailureKey)` to `app/log.monitor.cockpit/webapp/controller/BaseController.js` and switch `Dashboard.onCopyPayload` to call it, then verify the dashboard's existing "Copiar" button in the log payload dialog still copies and still toasts "Payload copiado"

## 4. Integration API dialog

- [x] 4.1 Create `app/log.monitor.cockpit/webapp/fragment/IntegrationApiDialog.fragment.xml` with a `Dialog` holding an `IconTabBar` with the "Exemplo" and "Schema" filters, and verify it opens from a temporary press handler without binding errors in the console
- [x] 4.2 Build the "Exemplo" tab: endpoint row (`POST` + monospace path + copy button), sample toolbar with its copy button, read-only `TextArea` with `class="lmcMonospace lmcPayload"`, and the hint that `payload` is sent as a JSON string; verify the layout at narrow and wide dialog widths
- [x] 4.3 Build the "Schema" tab: a static `sap.m.Table` with one row per field the caller sends (Campo / Tipo / Obrigatório / Valores aceitos) covering `integration_ID`, `executedAt`, `status` and `payload` — not the service-generated `ID` — plus the note about payload being an object or an array of objects with arbitrary keys and about configured fields affecting only filtering and sorting; verify the four `status` values and the array/object sentence are both visible
- [x] 4.4 Add all new pt-BR texts to `app/log.monitor.cockpit/webapp/i18n/i18n.properties` and verify no `[key]` placeholder appears anywhere in the dialog

## 5. Wiring the dialog to the integration

- [x] 5.1 Add the "Integration API" button to the detail page's `uxap:actions` (transparent, next to "Editar") and open the cached fragment from `IntegrationDetail.controller.js` (`this._oApiDialog ??= await this.loadFragment(...)`), verifying it opens and closes without touching data
- [x] 5.2 Build the sample in the controller from the view's binding context and a dedicated `bindList("fields", ..., [new Sorter("fieldName")], [], { $select: "fieldName" })`, storing display and clipboard forms in an `apiSample` JSON model; verify the payload keys match the integration's fields and that they still do while the fields table's search box filters the table
- [x] 5.3 Fetch the endpoint path with `bindContext("/integrationApiPath(...)")` when the dialog opens and show the "não foi possível determinar o endpoint" state when the call fails; verify both paths by temporarily making the handler throw
- [x] 5.4 Wire both copy buttons to the `BaseController` helper, the sample one copying the form where `payload` is an escaped string; verify an integration with no fields produces a sample with an empty payload object and the documented note

## 6. Dialog sizing and end-to-end verification

- [ ] 6.0 Give the `Dialog` an explicit `contentHeight` so the stretched `IconTabBar` does not collapse, and verify the dialog opens centered and readable

- [ ] 6.1 With `cds watch` running, open the dialog for an integration that has `employeeId` and `costCenter`, press Copiar on the sample, paste the result into `srv/http/integration-service/integration-logs.http` and POST it as `integration`; verify the request is accepted and the new log appears for that integration in the cockpit dashboard's latest-errors/report
- [ ] 6.2 Add a payload field, reopen the dialog and verify the new key appears in the sample; delete it and verify it disappears
- [x] 6.3 Run `npm run build` and verify the cockpit app builds with the new fragment and i18n keys included in the archive
