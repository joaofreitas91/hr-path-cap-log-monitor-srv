namespace log.monitor.db;

using {
    cuid,
    managed
} from '@sap/cds/common';

entity Integrations : cuid, managed {
    description : String(255) not null;
    source      : String(100) not null;
    target      : String(100) not null;

    fields      : Composition of many IntegrationFields
                      on fields.integration = $self;

    logs        : Composition of many IntegrationLogs
                      on logs.integration = $self;
}

entity IntegrationFields : cuid, managed {
    integration  : Association to Integrations not null;
    fieldName    : String(100) not null;
    description  : String(255);
    isSortable   : Boolean default false;
    isFilterable : Boolean default false;
}

type ExecutionStatus : String(20) enum {
    Running = 'RUNNING';
    Success = 'SUCCESS';
    Error = 'ERROR';
    Warning = 'WARNING';
}

entity IntegrationLogs : cuid, managed {
    integration : Association to Integrations not null;
    executedAt  : Timestamp not null;
    status      : ExecutionStatus not null;
    payload     : LargeString;
}
