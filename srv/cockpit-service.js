import cds from '@sap/cds';

const STATUS_KEYS = ['running', 'success', 'error', 'warning'];

const emptyCounts = () => ({ ...Object.fromEntries(STATUS_KEYS.map(sKey => [sKey, 0])), total: 0 });

const mPendingLinks = new WeakMap();

export default function () {
    const { Users, Groups, Integrations, UserGroups, IntegrationGroups, IntegrationNotifications, IntegrationFields, IntegrationLogs } = this.entities;
    const db = cds.entities('log.monitor.db');

    // Link entities are plain associations, so deletes must clean them up explicitly.
    // Runs on the db tables: a service-level DELETE that matches no rows is rejected with 404.
    this.before('DELETE', Users, async req => {
        await cds.run(DELETE.from(db.IntegrationNotifications).where({ user_ID: req.data.ID }));
        await cds.run(DELETE.from(db.UserGroups).where({ user_ID: req.data.ID }));
    });
    this.before('DELETE', Groups, async req => {
        const aLinkIDs = (await cds.run(SELECT.from(db.IntegrationGroups).columns('ID').where({ group_ID: req.data.ID }))).map(oLink => oLink.ID);
        if (aLinkIDs.length > 0) await cds.run(DELETE.from(db.IntegrationNotifications).where({ integrationGroup_ID: aLinkIDs }));
        await cds.run(DELETE.from(db.UserGroups).where({ group_ID: req.data.ID }));
        await cds.run(DELETE.from(db.IntegrationGroups).where({ group_ID: req.data.ID }));
    });
    this.before('DELETE', Integrations, req => cds.run(DELETE.from(db.IntegrationGroups).where({ integration_ID: req.data.ID })));
    // Unlinking a group from an integration must stop notifying that group about it
    this.before('DELETE', IntegrationGroups, req => cds.run(DELETE.from(db.IntegrationNotifications).where({ integrationGroup_ID: req.data.ID })));

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

    const NOTIFICATION_KEYS = [['integration_ID', 'integration'], ['user_ID', 'user'], ['integrationGroup_ID', 'integrationGroup']];

    // A notification row names exactly one recipient, a notified group must be one with access to the integration,
    // and the same recipient is never notified twice about the same integration.
    this.before(['CREATE', 'UPDATE'], IntegrationNotifications, async req => {
        const bTouchesRecipient = NOTIFICATION_KEYS.some(([sKey, sElement]) => sKey in req.data || sElement in req.data);
        if (req.event === 'UPDATE' && !bTouchesRecipient) return; // a flag-only PATCH leaves the recipient as it is

        const oRow = req.event === 'UPDATE'
            ? await this.run(SELECT.one.from(req.subject).columns('ID', ...NOTIFICATION_KEYS.map(([sKey]) => sKey)))
            : {};
        for (const [sKey, sElement] of NOTIFICATION_KEYS) {
            if (sKey in req.data || sElement in req.data) oRow[sKey] = req.data[sKey] ?? req.data[sElement]?.ID;
        }

        if (oRow.user_ID && oRow.integrationGroup_ID) return req.reject(400, 'NOTIFICATION_RECIPIENT_AMBIGUOUS');
        if (!oRow.user_ID && !oRow.integrationGroup_ID) return req.reject(400, 'NOTIFICATION_RECIPIENT_REQUIRED');

        if (oRow.integrationGroup_ID) {
            const oLink = await this.run(SELECT.one.from(IntegrationGroups).columns('integration_ID').where({ ID: oRow.integrationGroup_ID }));
            if (oLink?.integration_ID !== oRow.integration_ID) return req.reject(400, 'NOTIFICATION_GROUP_WITHOUT_ACCESS');
        }

        // Requests of one $batch changeset run in parallel, so recipients created in this transaction are tracked too
        const sPairKey = `${IntegrationNotifications.name}|${oRow.integration_ID}|${oRow.user_ID ?? oRow.integrationGroup_ID}`;
        if (!mPendingLinks.has(req.tx)) mPendingLinks.set(req.tx, new Set());
        const oPending = mPendingLinks.get(req.tx);
        if (oPending.has(sPairKey)) return req.reject(409, 'LINK_ALREADY_EXISTS');
        oPending.add(sPairKey);

        const oDuplicate = {
            integration_ID: oRow.integration_ID,
            ...(oRow.user_ID ? { user_ID: oRow.user_ID } : { integrationGroup_ID: oRow.integrationGroup_ID })
        };
        if (oRow.ID) oDuplicate.ID = { '!=': oRow.ID };
        if (await this.run(SELECT.one.from(IntegrationNotifications).columns('ID').where(oDuplicate))) req.reject(409, 'LINK_ALREADY_EXISTS');
    });

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

    // The ingestion endpoint belongs to LogMonitorIntegration, so the cockpit asks for its path
    // instead of repeating it in the app.
    this.on('integrationApiPath', () => {
        const sPath = cds.services.LogMonitorIntegration?.path ?? '/odata/v4/log-monitor-integration';
        return `${sPath}/IntegrationLogs`;
    });
}
