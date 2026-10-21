# Proposal

## Why

Today the Log Monitor is purely passive: a failing integration is only noticed when somebody opens the report app and looks. The people responsible for an integration have no way to learn that an execution ended in `ERROR` (or `WARNING`) unless they go looking for it, so failures are found late. This change turns the stored logs into push notifications by e-mail, configured per integration by the administrator in the cockpit.

## What Changes

- **Data model**: `Integrations` gains a `notifications` composition (`IntegrationNotifications`). Each row is one recipient of that integration — either a `User` (direct recipient) or an `IntegrationGroups` row (every user of a group that already has access to the integration) — plus the flags `notifyOnSuccess`, `notifyOnWarning` and `notifyOnError`. `RUNNING` never notifies. The service rejects a row that points at neither or at both, and rejects a duplicate recipient for the same integration.
- **Ingestion**: `LogMonitorIntegration` gets a handler (`srv/integration-service.js`, the first JS handler for that service) that runs **after** a log is committed: it resolves the notification rows of that log's integration whose flag matches the log's status, collects the direct users and the users of the selected groups, de-duplicates by e-mail and sends one e-mail per recipient with `nodemailer`. Sending never changes the outcome of the ingestion request — a failure is logged, not returned, and the log stays stored.
- **E-mail**: a professional HTML template (with a plain-text alternative) showing a status-coloured header, the integration (`description`, `source → target`), the execution timestamp, the log ID and a table of the payload rendered with the labels configured in `IntegrationFields` (raw keys for anything not configured, every element when the payload is an array). SMTP is configured with environment variables (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`) — a gitignored `.env` locally, `cf set-env` in Cloud Foundry. With no SMTP configured — the default in local development — nothing is sent and the skipped notification is logged.
- **Cockpit**: the integration detail page gains a third tab, **Notificação**, with two tables built on the cockpit's existing link pattern (title + counter, search, `Vincular` / `Desvincular`):
  - **Usuários** — Nome, E-mail and one checkbox per notifying status; `Vincular` offers users not yet notified for this integration.
  - **Grupos de acesso** — Descrição, Grupo IAS, number of users and the same checkboxes; `Vincular` offers only groups already listed under "Grupos com acesso", so nobody is notified about logs they cannot open in the report.
  Checkbox changes are saved immediately. Status labels follow the app's existing pt-BR texts (Sucesso / Aviso / Erro) with the colours and icons already used for log status.
- **Cleanup**: deleting an integration also deletes its notification rows (composition); deleting a user, deleting a group, or unlinking a group from an integration deletes the notification rows that pointed at them.
- Not changed: how logs are ingested or read, the authorization model (`system-user` still only creates logs, notifications are maintained only by `administrator`), and the report app.

## Capabilities

### New Capabilities
- `integration/log-notifications`: which notification rules a newly created log matches, how the recipient list is resolved from direct users and groups, de-duplication, and the guarantee that notification work never affects log ingestion.
- `integration/notification-email`: the content of the notification e-mail (subject, HTML and text body, payload rendering with the configured field labels) and how SMTP delivery is configured and what happens when it is not.
- `cockpit/notifications`: the Notificação tab on the integration detail page — the two recipient tables, linking and unlinking, and editing the per-status flags.

### Modified Capabilities
- `cockpit/link-integrity`: cascade deletes and duplicate rejection now also cover `IntegrationNotifications` (including the rows of an `IntegrationGroups` link that is removed), and a notification row must reference exactly one of user/group.
- `cockpit/integration-deletion`: the integration delete cascade now also removes the integration's notification rows.
- `cockpit/integrations`: the integration detail page now has a Notificação section in addition to the payload fields and groups-with-access sections.

## Impact

- `db/schema.cds` — new `IntegrationNotifications` entity, `notifications` composition on `Integrations`, `notifications` back-associations on `Users` and `IntegrationGroups`, `@restrict` for `administrator`.
- `srv/cockpit-service.cds` / `srv/cockpit-service.js` — expose `IntegrationNotifications`; validate the user/group XOR, reject duplicates, cascade on user/group/`IntegrationGroups` delete.
- `srv/integration-service.cds` is unchanged; new `srv/integration-service.js` (after-commit notification handler) and new `srv/lib/` modules for recipient resolution, template rendering and the SMTP transport.
- `_i18n/messages.properties` — new error texts.
- `app/log.monitor.cockpit/webapp/` — `view/IntegrationDetail.view.xml` (new section), `controller/IntegrationDetail.controller.js` (link/unlink/flags), two new `fragment/Link*NotificationDialog.fragment.xml`, `i18n/i18n.properties`, `css/style.css` if the checkbox columns need alignment.
- `package.json` — `nodemailer` dependency and the non-secret `cds.notifications` settings (`from`, `timezone`); `mta.yaml` unchanged, since the SMTP settings are environment variables.
- `CLAUDE.md` — document the notification flow and the SMTP configuration.
- `srv/http/` — requests for maintaining notifications and for triggering a notified log.
- No change to `xs-security.json` (no new scope) and no change to the HDI/XSUAA/HTML5 modules beyond the new service binding.
