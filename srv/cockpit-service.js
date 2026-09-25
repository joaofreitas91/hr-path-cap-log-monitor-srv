import cds from '@sap/cds';

const STATUS_KEYS = ['running', 'success', 'error', 'warning'];

const emptyCounts = () => ({ ...Object.fromEntries(STATUS_KEYS.map(sKey => [sKey, 0])), total: 0 });

const mPendingLinks = new WeakMap();

export default function () {
    const { Users, Groups, Integrations, UserGroups, IntegrationGroups, IntegrationFields, IntegrationLogs } = this.entities;
    const db = cds.entities('log.monitor.db');

    // Link entities are plain associations, so deletes must clean them up explicitly.
    // Runs on the db tables: a service-level DELETE that matches no rows is rejected with 404.
    this.before('DELETE', Users, req => cds.run(DELETE.from(db.UserGroups).where({ user_ID: req.data.ID })));
    this.before('DELETE', Groups, async req => {
        await cds.run(DELETE.from(db.UserGroups).where({ group_ID: req.data.ID }));
        await cds.run(DELETE.from(db.IntegrationGroups).where({ group_ID: req.data.ID }));
    });
    this.before('DELETE', Integrations, req => cds.run(DELETE.from(db.IntegrationGroups).where({ integration_ID: req.data.ID })));

    const rejectDuplicateLink = (entity, sElement) => async req => {
        const sForeignKey = `${sElement}_ID`;
        const oPair = {
            [sForeignKey]: req.data[sForeignKey] ?? req.data[sElement]?.ID,
            group_ID: req.data.group_ID ?? req.data.group?.ID
        };
        // Requests of one $batch changeset run in parallel, so pairs created in this transaction are tracked too
        const sPairKey = `${entity.name}|${oPair[sForeignKey]}|${oPair.group_ID}`;
        if (!mPendingLinks.has(req.tx)) mPendingLinks.set(req.tx, new Set());
        const oPending = mPendingLinks.get(req.tx);
        if (oPending.has(sPairKey)) return req.reject(409, 'LINK_ALREADY_EXISTS');
        oPending.add(sPairKey);

        if (await this.run(SELECT.one.from(entity).columns('ID').where(oPair))) req.reject(409, 'LINK_ALREADY_EXISTS');
    };
    this.before('CREATE', UserGroups, rejectDuplicateLink(UserGroups, 'user'));
    this.before('CREATE', IntegrationGroups, rejectDuplicateLink(IntegrationGroups, 'integration'));

    this.after('READ', Integrations, async (result, req) => {
        const aRows = [].concat(result ?? []).filter(oRow => oRow?.ID);
        const aColumns = req.query.SELECT.columns;
        const isSelected = sName => !aColumns || aColumns.some(oCol => oCol === '*' || oCol.ref?.[0] === sName);
        if (aRows.length === 0) return;

        const aIDs = aRows.map(oRow => oRow.ID);
        const countByIntegration = async entity => new Map(
            (await this.run(
                SELECT.from(entity).columns('integration_ID', 'count(1) as count').where({ integration_ID: aIDs }).groupBy('integration_ID')
            )).map(oRow => [oRow.integration_ID, Number(oRow.count)])
        );

        for (const [sName, entity] of [['logCount', IntegrationLogs], ['fieldCount', IntegrationFields], ['groupCount', IntegrationGroups]]) {
            if (!isSelected(sName)) continue;
            const mCounts = await countByIntegration(entity);
            for (const oRow of aRows) oRow[sName] = mCounts.get(oRow.ID) ?? 0;
        }
    });

    this.on('logMetrics', async req => {
        const { from, to, integrationID } = req.data;
        const dFrom = new Date(from), dTo = new Date(to);
        if (!from || !to || isNaN(dFrom) || isNaN(dTo) || dFrom > dTo) return req.reject(400, 'INVALID_PERIOD');

        const oWhere = { executedAt: { between: dFrom.toISOString(), and: dTo.toISOString() } };
        if (integrationID) oWhere.integration_ID = integrationID;

        const aCounts = await this.run(
            SELECT.from(IntegrationLogs).columns('integration_ID', 'status', 'count(1) as count').where(oWhere).groupBy('integration_ID', 'status')
        );

        const byStatus = emptyCounts();
        const mByIntegration = new Map();
        for (const oRow of aCounts) {
            if (!mByIntegration.has(oRow.integration_ID)) {
                mByIntegration.set(oRow.integration_ID, { integrationID: oRow.integration_ID, ...emptyCounts() });
            }
            const iCount = Number(oRow.count);
            for (const oCounts of [byStatus, mByIntegration.get(oRow.integration_ID)]) {
                oCounts[oRow.status.toLowerCase()] += iCount;
                oCounts.total += iCount;
            }
        }

        if (mByIntegration.size > 0) {
            const aIntegrations = await this.run(
                SELECT.from(Integrations).columns('ID', 'description', 'source', 'target').where({ ID: [...mByIntegration.keys()] })
            );
            for (const { ID, description, source, target } of aIntegrations) {
                Object.assign(mByIntegration.get(ID), { description, source, target });
            }
        }

        const byIntegration = [...mByIntegration.values()]
            .sort((a, b) => b.total - a.total || String(a.description).localeCompare(String(b.description)));

        return { byStatus, byIntegration };
    });
}
