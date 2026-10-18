import cds from '@sap/cds';
import { resolveRecipients } from './lib/notification-recipients.js';
import { render } from './lib/notification-email.js';
import { mailer, sender } from './lib/mailer.js';

const LOG = cds.log('notifications');

export default function () {
    const { IntegrationLogs } = this.entities;
    const db = cds.entities('log.monitor.db');

    const notifyLog = async oLog => {
        const aRecipients = await resolveRecipients(oLog.integration_ID, oLog.status);
        if (aRecipients.length === 0) return;

        const oTransporter = mailer();
        if (!oTransporter) {
            LOG.info(`Notification for log ${oLog.ID} skipped, SMTP is not configured. Recipients:`, aRecipients.map(oRecipient => oRecipient.email).join(', '));
            return;
        }

        const oIntegration = await cds.run(
            SELECT.one.from(db.Integrations).columns('ID', 'description', 'source', 'target').where({ ID: oLog.integration_ID })
        );
        const aFields = await cds.run(
            SELECT.from(db.IntegrationFields).columns('fieldName', 'label').where({ integration_ID: oLog.integration_ID })
        );
        const { subject, html, text } = render({ log: oLog, integration: oIntegration, fields: aFields });

        // One message per recipient, so recipients never see each other and one rejected address cannot suppress the rest
        const aResults = await Promise.allSettled(aRecipients.map(oRecipient => oTransporter.sendMail({
            from: sender(),
            to: { name: oRecipient.name, address: oRecipient.email },
            subject,
            html,
            text
        })));

        aResults.forEach((oResult, iIndex) => {
            if (oResult.status === 'rejected') {
                LOG.error(`Could not notify ${aRecipients[iIndex].email} about log ${oLog.ID}:`, oResult.reason?.message ?? oResult.reason);
            }
        });
        LOG.info(`Log ${oLog.ID} notified ${aResults.filter(oResult => oResult.status === 'fulfilled').length} of ${aRecipients.length} recipients`);
    };

    // The notification work is registered on the request outcome, so it starts only once the log is committed
    // and can neither roll the insert back nor change the response.
    // IntegrationLogs is @insertonly, so the handler result is the insert result, not the log: the values come from req.data.
    this.after('CREATE', IntegrationLogs, (result, req) => {
        const oLog = { ...req.data, ID: req.data.ID ?? [].concat(result ?? [])[0]?.ID };
        req.on('succeeded', () => notifyLog(oLog).catch(oError => LOG.error(`Could not notify about log ${oLog.ID}:`, oError)));
    });
}
