# Tasks

Manual verification runs against `cds watch`, with a throwaway HTTP endpoint on `http://localhost:3100` that logs what it receives and can be made to answer 500 on demand, and a local destination pointing at it:

```
destinations=[{"name":"REPROCESS_TEST","url":"http://localhost:3100"}]
```

The cockpit side is exercised with `npm run watch-log.monitor.cockpit` as `john.doe@dummy.com`, the report side with `npm run watch-log.monitor.report` as both `john.doe@dummy.com` and `alice@dummy.com`.

## 1. Data model

- [ ] 1.1 Add `allowReprocessing`, `reprocessDestination`, `reprocessPath` and `reprocessField` to `Integrations` in `db/schema.cds` and verify `cds watch` compiles, noting whether the association to the composition target raises a warning
- [ ] 1.2 Run `cds deploy --to sqlite` and verify every existing integration comes back with `allowReprocessing` false and the three other values empty
- [ ] 1.3 Project `Integrations` in `srv/report-service.cds` excluding `reprocessDestination` and `reprocessPath`, and verify `$metadata` of `/odata/v4/log-monitor-report/` offers `allowReprocessing` and `reprocessField_ID` but neither excluded property, and that asking for them with `$select` is rejected

## 2. Backend: the action

- [ ] 2.1 Declare the `ReprocessItem` type with the escaped `![key]` and `action reprocessLogs(integrationID: UUID, items: array of ReprocessItem) returns String;` in `srv/report-service.cds`, and verify the action appears in `$metadata`
- [ ] 2.2 Create `srv/lib/reprocess-trigger.js` exporting one function that POSTs the items through a named destination with an explicit timeout, and verify against the local endpoint that it sends a JSON array in a single request
- [ ] 2.3 Implement the handler in `srv/report-service.js`: load the integration, reject with `REPROCESS_NOT_ENABLED` (400) when the switch is off, `REPROCESS_NOT_CONFIGURED` (400) when destination, path or field is missing, and `REPROCESS_FIELD_WITHOUT_VALUE` (400) when `items` is empty or any item has no value or a `key` other than the configured `fieldName`; verify each rejection from `srv/http/report-service/`
- [ ] 2.4 Send one POST with the whole array and map a non-2xx answer to `REPROCESS_TRIGGER_FAILED` (502) carrying the status and the endpoint's message; verify with the endpoint answering 500 that the message reaches the caller, and with it stopped that the failure is reported rather than hanging
- [ ] 2.5 Add the four keys to `_i18n/messages.properties` in pt-BR and verify each rejection returns the readable text, not the key
- [ ] 2.6 Add a `reprocessLogs` request to `srv/http/report-service/` and verify it succeeds as `john.doe@dummy.com`, succeeds as `alice@dummy.com` for an integration that viewer may see, and is rejected for a user with no role

## 3. Backend: protecting the configuration

- [ ] 3.1 Add `before('DELETE', IntegrationFields)` to `srv/cockpit-service.js` rejecting with `FIELD_USED_FOR_REPROCESSING` (409) the removal of a field its integration points at, and verify deleting that field fails while deleting any other field of the same integration still works
- [ ] 3.2 Add the configuration validation on `CREATE`/`UPDATE` of `Integrations`: enabling reprocessing requires destination, path and field, and `reprocessField` must belong to the integration being saved; verify both rejections over `srv/http/cockpit-service/4 - integrations.http`
- [ ] 3.3 Verify deleting the whole integration still cascades and deletes its fields, including the one used for reprocessing

## 4. Cockpit: the Reprocessamento section

- [ ] 4.1 Add the `uxap:ObjectPageSection` between `sectionAccessGroups` and `sectionNotifications` in `app/log.monitor.cockpit/webapp/view/IntegrationDetail.view.xml` with the switch, Destination, Trigger URL and the field selector, and verify the tab appears third of four, in that order
- [ ] 4.2 Bind the field selector to the integration's own `fields` and verify it offers only that integration's fields, shows each field's label, and keeps showing the configured one when reopened
- [ ] 4.3 Wire the section to the existing `dialog` update group so the edits save together, and verify the saved values survive a reload and that the server rejection for an incomplete configuration is shown to the administrator
- [ ] 4.4 Disable Destination, Trigger URL and the field selector while the switch is off, and verify turning the switch off and saving leaves the stored values alone
- [ ] 4.5 Try to delete the field used for reprocessing from the payload fields table and verify the 409 message from the server is shown and the field survives
- [ ] 4.6 Add the pt-BR texts to `app/log.monitor.cockpit/webapp/i18n/i18n.properties` and verify no `[key]` placeholder appears in the new section

## 5. Report: selecting and triggering

- [ ] 5.1 Make the custom fields table of `app/log.monitor.report/webapp/view/Detail.view.xml` multi-select and add the "Reprocessar" action, and verify selection works together with the search, the filters and the sorting already on that table
- [ ] 5.2 Show the action only when the log's integration has reprocessing enabled, and enable it only with rows selected; verify it is absent for an integration with the switch off and appears for one with it on
- [ ] 5.3 Collect the configured field's value from each selected row into one `{ key, value }` array and call the action once with `bindContext("/reprocessLogs(...)")`, destroying the operation in a `finally` as `IntegrationDetail.controller.js` does; verify the local endpoint receives a single request with one entry per selected row
- [ ] 5.4 Refuse locally, with a message and without calling the server, when a selected row has no value for the configured field; verify with a payload row missing that key
- [ ] 5.5 Show a busy state during the call, report success with the number of records sent, and show the server's message on failure; verify all three with the endpoint answering 200, answering 500 and stopped
- [ ] 5.6 Add the pt-BR texts to `app/log.monitor.report/webapp/i18n/i18n.properties`, with the count texts using the `_one`/`_other` convention, and verify no `[key]` placeholder appears

## 6. End-to-end and documentation

- [ ] 6.1 Configure an integration end to end in the cockpit, open one of its `ERROR` logs in the report, select three rows and press "Reprocessar"; verify the endpoint receives exactly those three values under the configured key in one request
- [ ] 6.2 Verify as `alice@dummy.com` that the button behaves identically for an integration that viewer may see
- [ ] 6.3 Document the local `destinations` variable in `.env.example` and the whole feature in `CLAUDE.md`, and verify the instructions work from a clean checkout
- [ ] 6.4 Run `npm run build` and verify the archive builds with the two new dependencies and both apps
