using {log.monitor.db as db} from '../db/schema.cds';

service LogMonitorReport @(requires: [
    'administrator',
    'report-viewer',
]) {
    // The destination and the trigger path are never readable by the report app: the
    // reprocessLogs action takes both from the integration's own row.
    @readonly
    entity Integrations      as projection on db.Integrations excluding {
        reprocessDestination,
        reprocessPath
    };

    @readonly
    entity IntegrationFields as projection on db.IntegrationFields;

    @readonly
    entity IntegrationLogs   as projection on db.IntegrationLogs;

    function matchingLogIds(integrationID: UUID, fieldsFilter: String) returns String;

    // One selected record: the name of the integration's configured reprocessing field
    // ("key" is a CDS keyword, hence the escape) and the value that identifies the record.
    type ReprocessItem {
        ![key] : String(100);
        value  : String;
    }

    action reprocessLogs(integrationID: UUID, items: array of ReprocessItem) returns String;
}
