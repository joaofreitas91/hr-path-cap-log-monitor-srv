export default function () {
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
};
