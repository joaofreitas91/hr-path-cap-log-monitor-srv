# Design

## Context

See proposal.md — Why. What shapes the approach here is the existing structure:

- Authorization lives on the db entities via `@restrict`, and all three services are projections, so a new entity gets its rules once in `db/schema.cds`.
- `LogMonitorIntegration` has no handler file yet — `srv/integration-service.cds` is `@insertonly` for `system-user`. CAP binds `srv/integration-service.js` to it by name.
- `srv/cockpit-service.js` already carries the link hygiene the cockpit depends on: cascade deletes of link rows run as `cds.run(DELETE.from(db.X))` on the db tables (a service-level DELETE matching no rows throws 404), and duplicate links are rejected with 409 via `rejectDuplicateLink`.
- The cockpit's detail pages are `uxap:ObjectPageLayout` with `useIconTabBar="true"`; each section is a tab. `GroupDetail` already implements link/unlink against a link entity with a `TableSelectDialog` that filters out already-linked rows (`…Groups/all(link: link/group_ID ne <id>)`), a deferred `link` update group and `getCountText` toasts.
- `IntegrationDetail` binds its view with `$$updateGroupId: 'dialog'` (deferred, saved by the dialog), which is wrong for checkboxes that must save on click.
- There is no automated test suite; verification is `cds watch` plus the REST Client files in `srv/http/`.

## Goals / Non-Goals

**Goals:**

- One place in the data model for "who is notified about this integration, and for which statuses", reachable from both the cockpit and the ingestion handler.
- Ingestion stays exactly as fast and as reliable as today: notification work happens after the commit and cannot fail the request.
- The Notificação tab is built from the cockpit patterns already in the codebase, not a new one.

**Non-Goals:**

- Guaranteed delivery (no outbox, no retry queue, no delivery status stored) — see Risks.
- Other channels (Teams, webhooks), digests, rate limiting or quiet hours.
- Letting a recipient manage its own subscriptions; only `administrator` maintains notifications.
- Localisation of the e-mail: the applications are pt-BR only, so the template is pt-BR.

## Decisions

### One `IntegrationNotifications` entity with a user/group XOR

```cds
entity IntegrationNotifications @(restrict: [{ grant: ['*'], to: 'administrator' }]) : cuid, managed {
    integration      : Association to Integrations not null;
    user             : Association to Users;
    integrationGroup : Association to IntegrationGroups;
    notifyOnSuccess  : Boolean default false;
    notifyOnWarning  : Boolean default false;
    notifyOnError    : Boolean default false;
}
```

`Integrations` gets `notifications : Composition of many IntegrationNotifications on notifications.integration = $self`; `Users` and `IntegrationGroups` get back-associations named `notifications`, which the link dialogs need for their "not yet linked" filter (the same reason `Users.userGroups` exists).

- *One entity instead of two* (`IntegrationUserNotifications` / `IntegrationGroupNotifications`): it is what the request asks for, and the ingestion handler then resolves recipients with a single query. The cost is that "exactly one of user/group" is a handler rule, not a schema constraint; it is enforced in `before('CREATE'|'UPDATE')` and both the cockpit tables only ever set one of them.
- *Pointing at `IntegrationGroups`, not at `Groups`*: the notified group must be one that already has access to the integration (the user's decision), and referencing the link row makes that structural — the "Vincular" dialog is just `IntegrationGroups` filtered by this integration, and removing the access link removes the notification with it.
- *Three boolean flags instead of a child table of statuses*: they map one-to-one to the three checkbox columns, make the recipient query a single `where` on one column, and `RUNNING` is excluded by construction. A fourth status later is one column plus one checkbox.

### Notify after the transaction commits, never inside it

The handler in `srv/integration-service.js` registers on the request outcome (`req.on('succeeded', …)`), so recipient resolution and SMTP work start only once the log is durably stored and the response is on its way. Errors there are caught and logged with the log ID; they cannot roll back the insert or change the response (spec: *Notifying never affects ingestion*).

Alternatives: `after('CREATE')` runs inside the transaction — a slow or hanging SMTP server would hold the ingestion request open and an exception would roll the log back. CAP's outbox (`cds.outboxed`) would survive a crash between commit and send, but needs its own service and persistent outbox table; deferred, and noted as the upgrade path if lost notifications become a real problem.

The `succeeded` handler runs outside the request's transaction, so its queries run through `cds.db` on the db entities (`cds.entities('log.monitor.db')`), the same way `cockpit-service.js` already reads and deletes link rows. That also sidesteps `@restrict`: the ingestion user is `system-user`, which has no read access to notifications or users.

### Recipient resolution in one query

For status `S`, the matching flag column is `notifyOn<S>`; `RUNNING` maps to no column and short-circuits. One query over the integration's rules with a deep expand returns both recipient kinds:

```js
SELECT.from(db.IntegrationNotifications)
  .where({ integration_ID, [flagColumn]: true })
  .columns(n => {
      n.user(u => { u.name, u.email }),
      n.integrationGroup(ig => ig.group(g => g.userGroups(ug => ug.user(u => { u.name, u.email }))))
  })
```

The result is flattened into a map keyed by lower-cased e-mail (dedupe, spec: *Recipient reached twice*), dropping users without an e-mail. If the deep expand turns out to be slow on HANA, the fallback is two flat queries (direct users; users of the notified groups via an `in` subselect) — same output, same contract.

### SMTP configuration from environment variables

Only the non-secret settings live in `package.json` under a `cds.notifications` section, so profiles work the same way as `db` and `auth`:

```json
"notifications": {
  "from": "log-monitor@hr-path.com",
  "timezone": "America/Sao_Paulo"
}
```

The connection itself never goes into the repository: `srv/lib/mailer.js` reads `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER` and `SMTP_PASSWORD` from the environment. Locally they live in the gitignored `.env`, which `cds` reads on its own; in Cloud Foundry they are set with `cf set-env` on the `hr-path-cap-log-monitor-srv` app, which needs a `cf restart` to pick them up. With no `SMTP_HOST` — the default, since `.env` is not deployed — the mailer returns no transporter and the handler logs the skipped notification with its recipients (spec: *Local development*). Credentials are never logged. The two `package.json` settings are overridable per environment with `CDS_NOTIFICATIONS_FROM` / `CDS_NOTIFICATIONS_TIMEZONE`.

A bound user-provided service was the alternative for the credentials; environment variables were chosen because they carry five plain strings that need no service instance created per space before the first deploy and no extra resource in `mta.yaml`.

A custom `cds.notifications` section is used rather than an entry under `cds.requires` because nothing is ever `cds.connect.to`-ed here: a `requires` entry with an unknown kind only invites a bootstrap-time surprise. The transporter is created once, cached, and uses nodemailer's connection pool; one message is sent per recipient (`Promise.allSettled`), so recipients never see each other's addresses and one rejected address cannot suppress the rest.

`mta.yaml` needs no new resource: nothing is bound, so the settings are applied to the deployed app with `cf set-env` and a `cf restart`.

### The e-mail template is a plain module, not a templating engine

`srv/lib/notification-email.js` exports `render({ log, integration, fields })` returning `{ subject, html, text }`. It builds table-based HTML with inline styles (the only thing mail clients agree on), a status band coloured like the apps' status states (`ERROR` red, `WARNING` orange, `SUCCESS` green), and the payload rendered as label/value rows: the labels come from the integration's `IntegrationFields` (`fieldName → label`), unconfigured keys keep their key, an array payload becomes one block per element, invalid JSON is shown as raw text, and an empty payload says so. Dates are formatted with `Intl.DateTimeFormat('pt-BR', …)` in `cds.env.notifications.timezone`, because the server runs in UTC and the readers do not. All values are HTML-escaped — payload content is external input. A third-party template engine would add a dependency for one template.

### Cockpit: a third section reusing the link pattern

- `IntegrationDetail.view.xml` gains `sectionNotifications` with two tables, both bound to the view's `notifications` navigation with `$$updateGroupId: '$auto'` (not the view's deferred `dialog` group, so a checkbox PATCHes on click) and `$expand` of the recipient side. The kind is a binding-time filter (`user_ID ne null` / `integrationGroup_ID ne null`); the search field must therefore not overwrite it, so `BaseController.searchTable` gains an optional filter-type argument and these two tables search with `FilterType.Control` (base filter stays as the application filter). That is the smallest change that keeps one shared search helper.
- Status columns are `CheckBox selected="{notifyOnError}"` etc., with headers using the existing status icons/colours (`formatter.statusIcon`, `statusState`) and the existing pt-BR texts `status_SUCCESS|WARNING|ERROR`. Each table's binding attaches `patchCompleted`: on failure the error is shown and `resetChanges()` puts the checkbox back (spec: *Save fails*).
- Linking reuses the `GroupDetail` mechanics — a cached `TableSelectDialog` per kind, an "all(… ne …)" filter for what is already linked, creation in a deferred `link` update group, `getCountText` toasts — expressed as a small kind map in `IntegrationDetail.controller.js`. The user dialog lists `/Users` filtered by `notifications/all(n: n/integration_ID ne <id>)`; the group dialog lists `/IntegrationGroups` filtered by `integration_ID eq <id>` and the same "not yet notified" test. New rows are created with `notifyOnError: true` only — the useful default for a log monitor, and the one status an administrator would otherwise set by hand every time.
- Unlinking reuses `confirmDelete` with texts stating that only the notification is removed.

The link mechanics are deliberately *not* extracted from `GroupDetail` into `BaseController` in this change: that controller works, its kind map differs (different foreign keys, a base filter, initial flags), and refactoring it is not part of the request. If a third screen needs linking, that is the moment to extract it.

### Service-side validation and cleanup, next to the existing rules

In `srv/cockpit-service.js`:

- `before('CREATE'|'UPDATE', IntegrationNotifications)` rejects a row with both or neither recipient (400), rejects an `integrationGroup` that belongs to another integration (400), and rejects a duplicate recipient for the integration (409, reusing `LINK_ALREADY_EXISTS`), following `rejectDuplicateLink`'s in-changeset tracking so a `$batch` cannot slip two identical rows through.
- The `Users` delete handler also deletes that user's notification rows; the `Groups` delete handler deletes the notification rows of the group's `IntegrationGroups` links *before* deleting those links; a new `IntegrationGroups` delete handler deletes the notifications pointing at the unlinked row (this is what the cockpit's "Desvincular" on the group detail page triggers). Deleting an integration needs nothing new: `notifications` is a composition, so CAP cascades it.
- New message keys go to `_i18n/messages.properties` next to `LINK_ALREADY_EXISTS`.

## Risks / Trade-offs

- **A crash between commit and send loses the notification** (no outbox, no retry) → accepted for this change; the log itself is never lost and the failure is logged. CAP's outbox is the documented upgrade path if it matters.
- **A noisy integration can flood mailboxes** (one e-mail per log per recipient) → mitigated by `notifyOnError` being the only default and `RUNNING` not being notifiable; batching/digests are explicitly out of scope.
- **Payload content goes out by e-mail**, which may carry personal data → the administrator chooses the recipients, group recipients are restricted to groups that already have access to the integration's logs, and values are escaped; this is a deliberate consequence of the chosen e-mail content.
- **Slow or hanging SMTP server** → the send runs after the response, with nodemailer's connection and socket timeouts set, so it can only occupy a background task.
- **The XOR rule is enforced in handlers, not in the schema** → a direct database write could create an invalid row; the ingestion handler simply ignores a row with no resolvable recipient.
- **`searchTable` gains a parameter** used by two callers → the default keeps every existing caller behaving exactly as today.
- **The SMTP variables live outside the deployed archive** → a fresh space has none, so notifications are skipped until they are set with `cf set-env` and the app is restarted; documented in CLAUDE.md, and the application always starts whether they are there or not.

## Migration Plan

1. Deploy order is the normal MTA flow: `npm run build && npm run deploy`, then `cf set-env` for the SMTP variables once per space and `cf restart hr-path-cap-log-monitor-srv`. The HDI deployer creates the new table; no existing table changes and no data migration is needed.
2. With no notification rows, behaviour is identical to today — administrators opt in integration by integration.
3. Rollback: redeploy the previous MTA archive. The new table stays behind, unused and empty of effect; no rollback script is needed. To stop all notifications without redeploying, `cf unset-env hr-path-cap-log-monitor-srv SMTP_HOST` and restart (the handler then logs and skips).
