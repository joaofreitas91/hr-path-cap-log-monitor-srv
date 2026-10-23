import cds from '@sap/cds';
import { triggerReprocessing } from './lib/reprocess-trigger.js';

export default function () {
    const db = cds.entities('log.monitor.db');

    this.on('matchingLogIds', async req => {
        const { integrationID, fieldsFilter } = req.data;

        let aEntries = [];
        try {
            aEntries = Object.entries(JSON.parse(fieldsFilter || '{}')).filter(([, v]) => v);
        } catch {
            return JSON.stringify([]);
        }
        if (!integrationID || aEntries.length === 0) return JSON.stringify([]);

        const { IntegrationLogs } = this.entities;
        const aLogs = await this.run(
            SELECT.from(IntegrationLogs).columns('ID', 'payload').where({ integration_ID: integrationID })
        );

        const aMatchingIds = aLogs
            .filter(log => {
                let aRecords;
                try {
                    aRecords = [].concat(JSON.parse(log.payload ?? '{}'));
                } catch {
                    return false;
                }
                return aRecords.some(oRecord => aEntries.every(([sField, sValue]) =>
                    String(oRecord[sField] ?? '').toLowerCase().includes(String(sValue).toLowerCase())
                ));
            })
            .map(log => log.ID);

        return JSON.stringify(aMatchingIds);
    });

    // Re-runs the selected records in the source system. Everything but the selection comes
    // from the integration's own row: the caller never names the destination or the path.
    this.on('reprocessLogs', async req => {
        const { integrationID, items } = req.data;
        const { Integrations } = this.entities;

        // Read through the service projection first, so the @restrict of the db entity decides
        // whether this caller may see the integration at all; one they cannot see is not
        // reprocessable for them either, and the answer tells them nothing about it.
        const oVisible = await this.run(SELECT.one.from(Integrations).columns('ID').where({ ID: integrationID }));
        if (!oVisible) return req.reject(400, 'REPROCESS_NOT_ENABLED');

        // The destination and the trigger path are excluded from the report projection, so the
        // configuration is read from the db entity.
        const oConfig = await cds.run(SELECT.one.from(db.Integrations)
            .columns('allowReprocessing', 'reprocessDestination', 'reprocessPath', 'reprocessField_ID')
            .where({ ID: integrationID }));
        if (!oConfig.allowReprocessing) return req.reject(400, 'REPROCESS_NOT_ENABLED');

        const oField = oConfig.reprocessField_ID && await cds.run(SELECT.one.from(db.IntegrationFields)
            .columns('fieldName').where({ ID: oConfig.reprocessField_ID }));
        if (!oConfig.reprocessDestination || !oConfig.reprocessPath || !oField) return req.reject(400, 'REPROCESS_NOT_CONFIGURED');

        const aItems = (items ?? []).map(({ key, value }) => ({ key, value }));
        const bIdentified = aItems.length > 0 && aItems.every(oItem =>
            oItem.key === oField.fieldName && String(oItem.value ?? '').trim() !== ''
        );
        if (!bIdentified) return req.reject({ status: 400, message: 'REPROCESS_FIELD_WITHOUT_VALUE', args: [oField.fieldName] });

        try {
            await triggerReprocessing(oConfig.reprocessDestination, oConfig.reprocessPath, aItems);
        } catch (oError) {
            return req.reject({ status: 502, message: 'REPROCESS_TRIGGER_FAILED', args: [oError.status, oError.reason] });
        }

        return JSON.stringify({ sent: aItems.length });
    });
};
