import cds from '@sap/cds';

// RUNNING has no flag and therefore never notifies
const FLAG_BY_STATUS = {
    SUCCESS: 'notifyOnSuccess',
    WARNING: 'notifyOnWarning',
    ERROR: 'notifyOnError'
};

export const resolveRecipients = async (sIntegrationID, sStatus) => {
    const sFlag = FLAG_BY_STATUS[sStatus];
    if (!sFlag) return [];

    const db = cds.entities('log.monitor.db');
    // Runs outside the request transaction on the db entities, so the ingestion user's restrictions do not apply
    const aRules = await cds.run(
        SELECT.from(db.IntegrationNotifications)
            .where({ integration_ID: sIntegrationID, [sFlag]: true })
            .columns(n => {
                n.user(u => {
                    u.name, u.email
                }),
                n.integrationGroup(ig => ig.group(g => g.userGroups(ug => ug.user(u => {
                    u.name, u.email
                }))))
            })
    );

    const mByEmail = new Map();
    const collect = oUser => {
        if (!oUser?.email) return; // a user without an e-mail address cannot be notified
        const sKey = oUser.email.toLowerCase();
        if (!mByEmail.has(sKey)) mByEmail.set(sKey, { name: oUser.name, email: oUser.email });
    };

    for (const oRule of aRules) {
        collect(oRule.user);
        for (const oUserGroup of oRule.integrationGroup?.group?.userGroups ?? []) collect(oUserGroup.user);
    }
    return [...mByEmail.values()];
};
