# Tasks

## 1. Handler structure

- [x] 1.1 Split `srv/service.{cds,js}` into one file pair per service (`integration-service.cds`, `report-service.{cds,js}`, `cockpit-service.{cds,js}`), keeping the report code unchanged; verify `matchingLogIds` still returns the same IDs with `srv/http/report-service/integration-logs-administrator.http`

## 2. Link integrity (`cockpit/link-integrity`)

- [x] 2.1 Add `before('DELETE')` handlers for `Users`, `Groups`, `Integrations` removing their `UserGroups`/`IntegrationGroups` rows; verify with `cds watch` that deleting a linked user, group and integration returns 204 and no link references them, while the other side of each link still exists
- [x] 2.2 Add `before('CREATE')` duplicate checks on `UserGroups` and `IntegrationGroups` with a 409 and a pt-BR message in `_i18n/messages.properties`; verify a repeated POST returns 409, a new pair returns 201, and a `$batch` with the same pair twice fails
- [x] 2.3 Add the delete and duplicate requests to `srv/http/cockpit-service/` (`1 - users.http`, `2 - groups.http`, `3 - user-groups.http`, `4 - integrations.http`, `6 - integration-groups.http`) and verify they run top-to-bottom on a fresh `cds deploy --to sqlite`

## 3. Integration deletion (`cockpit/integration-deletion`)

- [x] 3.1 Add `virtual logCount`, `fieldCount`, `groupCount` to the `LogMonitorCockpit.Integrations` projection and fill them in `after('READ')` with grouped queries; verify `GET Integrations?$select=ID,logCount,fieldCount,groupCount` returns correct numbers and that a PATCH of `logCount` has no effect
- [x] 3.2 Verify the cascade: delete an integration with logs, fields and group links and check with GETs that none remain and the linked group still exists; add these requests to `4 - integrations.http`

## 4. Log metrics (`cockpit/log-metrics`)

- [x] 4.1 Declare `StatusCounts`, `IntegrationMetrics`, `LogMetrics` and `function logMetrics(from, to, integrationID)` in `LogMonitorCockpit`; verify `$metadata` shows the function and types
- [x] 4.2 Implement the handler (400 on missing/inverted period, one grouped query, integration lookup, fold and sort); verify all scenarios of the spec with requests added to `7 - integration-logs.http` (status counts, per-integration ordering, integration filter, empty period, invalid period) and that `alice@dummy.com` gets 403
- [x] 4.3 Verify the same requests return identical results against HANA with `cds watch --profile hybrid` (if a `[hybrid]` binding is available; otherwise record it as pending for the first BTP deploy)
  - Done (2026-09-25, `npm run watch:hybrid`): with 3 tagged test integrations / 12 logs seeded in HANA and in local SQLite, 4 `logMetrics` queries (week window with ms boundary, wide window, integration filter, single-instant) and the virtual counts returned byte-identical JSON on both; test data deleted from HANA afterwards (original 1 integration / 1 log intact). 400/403 also checked on HANA

## 5. Docs

- [x] 5.1 Update `CLAUDE.md` (Services section: `LogMonitorCockpit` handlers, `logMetrics`, virtual counts) and verify the referenced files/requests exist
