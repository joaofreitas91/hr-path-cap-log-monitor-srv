# Tasks

## 1. Data model

- [x] 1.1 Add `IntegrationNotifications` to `db/schema.cds` (`integration`, optional `user`, optional `integrationGroup`, `notifyOnSuccess`/`notifyOnWarning`/`notifyOnError` with default false, `@restrict` granting `*` to `administrator`), plus the `notifications` composition on `Integrations` and the `notifications` back-associations on `Users` and `IntegrationGroups`; verify `cds deploy --to sqlite` recreates `db.sqlite` with the new table and `cds watch` starts without model errors
- [x] 1.2 Expose `entity IntegrationNotifications as projection on db.IntegrationNotifications` in `srv/cockpit-service.cds` and verify `$metadata` of `/odata/v4/log-monitor-cockpit/` lists it and that `GET IntegrationNotifications` returns 200 for `john.doe@dummy.com` and 403 for `alice@dummy.com`
- [x] 1.3 Add `srv/http/cockpit-service/8 - integration-notifications.http` with requests that create a user recipient, create a group recipient, patch the flags, list the recipients of an integration and delete one; verify each request against `cds watch` and keep the file numbered in the order data must be created

## 2. Backend rules and cleanup

- [x] 2.1 Add the `before('CREATE'|'UPDATE', IntegrationNotifications)` validation in `srv/cockpit-service.js` rejecting a row with both or neither recipient (400) and an `integrationGroup` belonging to another integration (400), with the new keys in `_i18n/messages.properties`; verify with requests in the `.http` file that each invalid case is rejected with the readable message and that valid rows are still created
- [x] 2.2 Reject duplicate recipients per integration with 409 `LINK_ALREADY_EXISTS`, following the in-changeset tracking of `rejectDuplicateLink`; verify a repeated user recipient and a repeated group recipient are both rejected, including when sent twice inside one `$batch` changeset
- [x] 2.3 Extend the `Users` delete handler to also delete that user's notification rows, extend the `Groups` delete handler to delete the notifications of the group's `IntegrationGroups` links before deleting those links, and add an `IntegrationGroups` delete handler that deletes the notifications pointing at the removed link; verify with the `.http` files that after each delete no orphan row remains in `IntegrationNotifications`
- [x] 2.4 Verify the integration delete cascade covers notifications without new code (composition) by deleting an integration that notifies one user and one group and checking that both recipients are gone while the user and the group still exist

## 3. Mail transport

- [x] 3.1 Add `nodemailer` to `dependencies` and the non-secret `cds.notifications` section (`from`, `timezone`) to `package.json`; verify `npm install` succeeds and `cds env get notifications` prints the section
- [x] 3.2 Implement `srv/lib/mailer.js`: read the SMTP settings from the environment (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`), return no transporter when no host is configured, cache a pooled transporter with connection/socket timeouts, and never log credentials; verify that without configuration it reports "not configured" and that with a local MailDev (`npx maildev`, host `127.0.0.1`, port `1025`) a test send arrives
- [x] 3.3 Keep `mta.yaml` unchanged — nothing is bound, the variables are applied to the deployed app with `cf set-env` plus `cf restart hr-path-cap-log-monitor-srv` — and verify `npm run build` still produces the archive
- [x] 3.4 Document the SMTP configuration in `CLAUDE.md` (the environment variables, the gitignored `.env` read by `cds`, the `cf set-env`/`cf restart` commands and the skip-when-unconfigured behaviour) and verify the documented local MailDev setup works exactly as written

## 4. E-mail template

- [x] 4.1 Implement `srv/lib/notification-email.js` exporting `render({ log, integration, fields })` returning `{ subject, html, text }`: subject with status, integration description and `dd/MM/yyyy HH:mm`; HTML with inline styles, a status-coloured band and the integration, source → target, timestamp and log ID; verify by writing the rendered HTML of a sample log to a file and opening it in a browser
- [x] 4.2 Render the payload with the integration's field labels (unconfigured keys keep their key, an array payload becomes one block per element, invalid JSON is shown as raw text, an empty payload says so) and HTML-escape every value; verify all five cases — labelled keys, unknown key, array, invalid JSON, no payload — and that a payload value containing `<script>` is escaped
- [x] 4.3 Produce the plain-text alternative carrying the same status, integration, timestamp, log ID and payload values, and format dates with `Intl.DateTimeFormat('pt-BR', …)` in the configured timezone; verify the text part of a MailDev-received message is readable and shows the timestamp in `America/Sao_Paulo`

## 5. Notification handler

- [x] 5.1 Create `srv/integration-service.js` registering the notification work on `req.on('succeeded')` for `CREATE IntegrationLogs`, with every failure caught and logged with the log ID; verify a log is still created with 201 while the handler throws deliberately, and that the error appears in the server log
- [x] 5.2 Implement recipient resolution in `srv/lib/notification-recipients.js`: map the log's status to its flag column, return an empty list for `RUNNING`, run the single expanded query over `cds.db`, flatten direct users and group members, drop users without e-mail and dedupe by lower-cased e-mail; verify with logs of each status against the `.http` files that the resolved recipients match the configured rules and that a user reached directly and through a group appears once
- [x] 5.3 Send one message per recipient with `Promise.allSettled` through the mailer, logging per-recipient failures and the skipped-notification case when no transporter is configured; verify with MailDev that a `ERROR` log of an integration notifying one user and one 3-user group produces 4 separate messages, and that with MailDev stopped the POST still returns 201 and the failure is logged
- [x] 5.4 Document the notification flow in `CLAUDE.md` (the new entity, the after-commit handler, recipient resolution and the template modules) and verify the description matches the implemented files

## 6. Cockpit: Notificação tab

- [x] 6.1 Add the optional filter-type argument to `BaseController.searchTable` (default unchanged) and verify the existing searches on Usuários, Grupos de Acesso, the payload fields table and the group detail tables still filter exactly as before
- [x] 6.2 Add the `Notificação` section to `IntegrationDetail.view.xml` with the Usuários table (bound to `notifications`, `$$updateGroupId: '$auto'`, filter `user_ID ne null`, `$expand` of `user`, columns Nome and E-mail, toolbar with counter/search/Vincular/Desvincular, empty state) and verify it opens as the third tab, counts correctly and keeps the other two tabs working
- [x] 6.3 Add the Grupos de acesso table of the same section (filter `integrationGroup_ID ne null`, `$expand` of `integrationGroup/group` with its `userGroups`, columns Descrição, Grupo IAS and number of users) and verify the counter and the user count per row against the Grupos com acesso tab
- [x] 6.4 Add the three checkbox columns to both tables with the status icons, colours and pt-BR texts already used for log status, and verify a click PATCHes immediately (visible in the network trace) and survives a page reload
- [x] 6.5 Attach `patchCompleted` to both table bindings to show the error and `resetChanges()` on failure, and verify by making the service reject the PATCH temporarily that the message appears and the checkbox returns to its stored value
- [x] 6.6 Create `fragment/LinkNotificationUsersDialog.fragment.xml` and `fragment/LinkNotificationGroupsDialog.fragment.xml` and wire `Vincular` in `IntegrationDetail.controller.js` (kind map, cached dialogs, "not yet notified" filters, group dialog additionally filtered to this integration's `IntegrationGroups`, rows created with `notifyOnError: true` in the deferred `link` group, count toast); verify that already-notified entries are not offered, that only groups with access appear, that the group dialog shows its empty text for an integration with no groups, and that linking adds the rows with only Erro checked
- [x] 6.7 Wire `Desvincular` for both tables through `confirmDelete` with texts stating that only the notification is removed, and verify the user and the group still exist afterwards and that the group keeps its access to the integration
- [x] 6.8 Add every new pt-BR text to `app/log.monitor.cockpit/webapp/i18n/i18n.properties` (including the `_one`/`_other` pairs) and any alignment rule the checkbox columns need to `webapp/css/style.css`; verify no `[key]` placeholder appears anywhere in the tab and that the tables stay readable at tablet width

## 7. End-to-end verification

- [x] 7.1 With `cds watch` and MailDev running, configure notifications for an integration (one user with Erro, one group with Aviso), POST logs of each status through `srv/http/integration-service/integration-logs.http` and verify that exactly the expected messages arrive, that `SUCCESS` and `RUNNING` produce none, and that the e-mails show the payload with the configured field labels
- [x] 7.2 Remove the group's access to the integration on the group detail page and verify the notification recipient disappears from the Notificação tab and no further message reaches that group's users
- [x] 7.3 Run `npm run build` and verify the archive builds with the new fragments, i18n keys, server modules and the `nodemailer` dependency
