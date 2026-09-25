using {log.monitor.db as db} from '../db/schema.cds';

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
