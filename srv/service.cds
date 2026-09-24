using {log.monitor.db as db} from '../db/schema.cds';

service LogMonitorIntegration @(requires: ['system-user']) {
    @insertonly
    entity IntegrationLogs as projection on db.IntegrationLogs;
}

service LogMonitorReport @(requires: [
    'administrator',
    'report-viewer',
]) {
    @readonly
    entity Integrations      as projection on db.Integrations;

    @readonly
    entity IntegrationFields as projection on db.IntegrationFields;

    @readonly
    entity IntegrationLogs   as projection on db.IntegrationLogs;

    function matchingLogIds(integrationID: UUID, fieldsFilter: String) returns String;
}

service LogMonitorCockpit @(requires: ['administrator',
]) {
    entity Users             as projection on db.Users;
    entity Groups            as projection on db.Groups;
    entity UserGroups        as projection on db.UserGroups;
    entity Integrations      as projection on db.Integrations;
    entity IntegrationFields as projection on db.IntegrationFields;
    entity IntegrationGroups as projection on db.IntegrationGroups;
    entity IntegrationLogs   as projection on db.IntegrationLogs;
}
