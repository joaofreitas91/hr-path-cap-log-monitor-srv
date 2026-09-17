using {log.monitor.db as db} from '../db/schema.cds';


service LogMonitorIntegration @(requires: [
    'admin',
    'system-user',
]) {
    @insertonly
    entity IntegrationLogs as projection on db.IntegrationLogs;
}

service LogMonitorReport @(requires: ['user',
]) {
    @readonly
    entity IntegrationLogs as projection on db.IntegrationLogs;
}

service LogMonitorCockpit {
    entity Users             as projection on db.Users;
    entity Integrations      as projection on db.Integrations;
    entity UserIntegrations  as projection on db.UserIntegrations;
    entity IntegrationFields as projection on db.IntegrationFields;
    entity IntegrationLogs   as projection on db.IntegrationLogs;

}