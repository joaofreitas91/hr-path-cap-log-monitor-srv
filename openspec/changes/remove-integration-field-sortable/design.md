# Design

## Context

`isSortable` is a `Boolean default false` on `IntegrationFields` (`db/schema.cds:68`). It is persisted, displayed in the cockpit's payload fields table, editable in the field dialog and seeded by the REST Client samples — and read by nothing. The only consumer of a field flag at runtime is the report's dynamic filter bar, which filters on `isFilterable`. Removing an element from a CDS entity is the only part of this change that is not a pure UI deletion, because the column exists in deployed HANA tables with data in it.

## Goals / Non-Goals

**Goals:**

- Remove the flag from the model, the cockpit UI and the sample payloads in one step, leaving no half-removed state.
- Keep `isFilterable` and the report's dynamic filters untouched.

**Non-Goals:**

- Introducing sorting anywhere. The report's sorting arrives in its own change and deliberately does not depend on a per-field flag.
- Preserving the stored `isSortable` values. They are not meaningful and are not migrated anywhere.

## Decisions

### Drop the element rather than deprecate it

The alternative would be keeping the column and hiding it in the UI. That leaves a column nobody writes and nobody reads, and the next person to read `db/schema.cds` has to rediscover that it is dead. Since no code reads the value, there is nothing to deprecate for: the element goes.

- *Alternative*: annotate it `@UI.Hidden` and leave it in the model — rejected, it preserves the confusion the change exists to remove.

### Accept the column drop as a destructive HANA deployment

`cds build --production` generates `.hdbtable` artifacts; removing an element produces an `ALTER TABLE ... DROP` on the next HDI deploy, which discards the stored values. This is acceptable precisely because the values have no readers — no report, no e-mail, no API response changes. The deployment itself is a normal `npm run deploy`, with no pre- or post-step.

- *Alternative*: switch `IntegrationFields` to `.hdbmigrationtable` to make the drop explicit and versioned — rejected as disproportionate for one unused boolean, and it would change the deployment artifact type of the whole entity.

## Risks / Trade-offs

- **The HDI deploy refuses the drop because the table holds data** → the drop of a nullable column with a default is a standard, supported ALTER; if the deployer still refuses, it is unblocked by allowing data loss for that table in the HDI configuration, with no consequence since the data is unused.
- **An external system sends `isSortable` when creating fields** → `IntegrationFields` is only writable through `LogMonitorCockpit`, which administrators use through the cockpit app; an unknown property in an OData payload is rejected, so a stale script would start failing loudly rather than silently. The repository's own `.http` samples are updated in the same change.
- **The values are gone and cannot be recovered** → accepted; they were never read.

## Migration Plan

1. Remove the element from `db/schema.cds` and run `cds deploy --to sqlite` to recreate the local database.
2. Remove the cockpit UI surface (column, cell, switch, help text, `initialData`) and the i18n texts in the same commit, so the model and the app never disagree.
3. Clean the `isSortable` keys out of the `srv/http/cockpit-service/` samples.
4. Deploy with `npm run build && npm run deploy`; the HDI deployer drops the column.
5. Rollback: re-add `isSortable : Boolean default false;` to the entity and redeploy. The column comes back empty for every existing field, which is equivalent to its previous state for every consumer, because there were none.
