using {log.monitor.db as db} from '../db/schema.cds';

service LogMonitorIntegration @(requires: ['system-user']) {
    @insertonly
    entity IntegrationLogs as projection on db.IntegrationLogs;
}
