using {log.monitor.db as db} from '../db/schema.cds';

service LogMonitorCockpit @(requires: ['administrator',
]) {
    entity Users             as projection on db.Users;
    entity Groups            as projection on db.Groups;
    entity UserGroups        as projection on db.UserGroups;
    entity Integrations      as projection on db.Integrations {
        *,
        virtual null as logCount   : Integer,
        virtual null as fieldCount : Integer,
        virtual null as groupCount : Integer,
    };

    entity IntegrationFields as projection on db.IntegrationFields;
    entity IntegrationGroups as projection on db.IntegrationGroups;
    entity IntegrationLogs   as projection on db.IntegrationLogs;

    type StatusCounts {
        running : Integer;
        success : Integer;
        error   : Integer;
        warning : Integer;
        total   : Integer;
    }

    type IntegrationMetrics : StatusCounts {
        integrationID : UUID;
        description   : String(255);
        source        : String(100);
        target        : String(100);
    }

    type LogMetrics {
        byStatus      : StatusCounts;
        byIntegration : many IntegrationMetrics;
    }

    function logMetrics(![from]: Timestamp, to: Timestamp, integrationID: UUID) returns LogMetrics;
}
