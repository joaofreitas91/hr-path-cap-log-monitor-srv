# Proposal

## Why

A log whose payload is an array carries one row per record in the custom fields table — for a batch integration that is hundreds of rows. The viewer who opened that log is almost always looking for one of them: the employee whose transfer failed, the document that did not post. Today the only way to find it is to scroll and read, because the table has no search and no filter. The log list has had dynamic filters over these same fields since the report was modernized; the detail, which is where the individual records actually live, never got them.

## What Changes

- **Search field**: the custom fields table gains a toolbar with a `SearchField` that keeps the rows in which **any** declared field contains the typed text, matching partial content and ignoring case — the same matching the cockpit's list pattern and the report's `matchingLogIds` already use.
- **Per-field filters**: a "Filtros" action opens a dialog with one input per declared field, built from the integration's `IntegrationFields` the same way the report's filter bar builds its dynamic inputs. The inputs are combined with AND, and with the search field, so "the rows of employee 42 that mention 'rejeitado'" is expressible. The action shows how many field filters are active, and the dialog can clear them all at once.
- **Row counter**: the table title shows how many rows are currently displayed, so the effect of a filter is visible.
- **Empty state**: when filters are applied and no row matches, the table says so and invites the viewer to adjust them — distinct from the existing empty state for an integration that declares no field at all.
- Not changed: the payload block, which keeps showing the whole raw payload regardless of the filters.

## Capabilities

### New Capabilities

None.

### Modified Capabilities
- `report/log-detail`: the custom fields table gains a search, per-field filters, a row counter and a "no match" empty state.

## Impact

- `app/log.monitor.report/webapp/view/Detail.view.xml` — the toolbar of the custom fields table (title with counter, search field, "Filtros" action) and the second empty state.
- `app/log.monitor.report/webapp/controller/Detail.controller.js` — the filter state in a view model, combining the search and the per-field criteria into the `logs>/rows` binding, and the counter updated on `updateFinished`.
- `app/log.monitor.report/webapp/fragment/FieldFiltersDialog.fragment.xml` (new) — the dialog whose inputs are created from the integration's declared fields, reusing the dynamic-input pattern of `Report.controller.js`.
- `app/log.monitor.report/webapp/i18n/i18n.properties` — the new pt-BR texts.
- No backend, data model, authorization or deployment change; the filtering happens over the payload rows already in the browser.
