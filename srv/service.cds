using {log.monitor.db as db} from '../db/schema.cds';

service LogMonitorIntegration {
    @insertonly
    entity IntegrationLogs as projection on db.IntegrationLogs;
}

service LogMonitorReport @(requires: [
    'administrator',
    'report-viewer',
]) {
    @readonly
    entity IntegrationLogs as projection on db.IntegrationLogs;
}

service LogMonitorCockpit @(requires: [
    'administrator',
]) {
    entity Users             as projection on db.Users;
    entity Integrations      as projection on db.Integrations;
    entity UserIntegrations  as projection on db.UserIntegrations;
    entity IntegrationFields as projection on db.IntegrationFields;
    entity IntegrationLogs   as projection on db.IntegrationLogs;

}
