using {log.monitor.db as db} from '../db/schema.cds';


service LogMonitorService {
    entity Integrations      as projection on db.Integrations;
    entity IntegrationFields as projection on db.IntegrationFields;
    entity IntegrationLogs   as projection on db.IntegrationLogs;
}
