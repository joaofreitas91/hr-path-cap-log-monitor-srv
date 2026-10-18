namespace log.monitor.db;

using {
    cuid,
    managed
} from '@sap/cds/common';

entity Users : cuid, managed {
    name          : String(255) not null;
    email         : String(255) not null;

    userGroups    : Association to many UserGroups
                        on userGroups.user = $self;

    notifications : Association to many IntegrationNotifications
                        on notifications.user = $self;
}

entity Groups : cuid, managed {
    description       : String(255) not null;
    iasUserGroup      : String(255);

    userGroups        : Association to many UserGroups
                            on userGroups.group = $self;

    integrationGroups : Association to many IntegrationGroups
                            on integrationGroups.group = $self;
}

entity UserGroups : cuid, managed {
    user  : Association to Users not null;
    group : Association to Groups not null;
}

entity Integrations @(restrict: [
    {
        grant: ['READ'],
        to   : 'report-viewer',
        where: 'integrationGroups.group.userGroups.user.email = $user or not exists integrationGroups'
    },
    {
        grant: ['*'],
        to   : 'administrator',
    }
]) : cuid, managed {
    description       : String(255) not null;
    source            : String(100) not null;
    target            : String(100) not null;

    integrationGroups : Association to many IntegrationGroups
                            on integrationGroups.integration = $self;

    fields            : Composition of many IntegrationFields
                            on fields.integration = $self;

    logs              : Composition of many IntegrationLogs
                            on logs.integration = $self;

    notifications     : Composition of many IntegrationNotifications
                            on notifications.integration = $self;
}

entity IntegrationFields : cuid, managed {
    integration  : Association to Integrations not null;
    fieldName    : String(100) not null;
    label        : String(100) not null @mandatory;
    description  : String(255);
    isSortable   : Boolean default false;
    isFilterable : Boolean default false;
}

entity IntegrationGroups : cuid, managed {
    integration   : Association to Integrations not null;
    group         : Association to Groups not null;

    notifications : Association to many IntegrationNotifications
                        on notifications.integrationGroup = $self;
}

entity IntegrationNotifications @(restrict: [{
    grant: ['*'],
    to   : 'administrator',
}]) : cuid, managed {
    integration      : Association to Integrations not null;

    // Exactly one of user / integrationGroup is set, enforced in srv/cockpit-service.js
    user             : Association to Users;
    integrationGroup : Association to IntegrationGroups;

    notifyOnSuccess  : Boolean default false;
    notifyOnWarning  : Boolean default false;
    notifyOnError    : Boolean default false;
}


type ExecutionStatus : String(20) enum {
    Running = 'RUNNING';
    Success = 'SUCCESS';
    Error = 'ERROR';
    Warning = 'WARNING';
}

entity IntegrationLogs @(restrict: [
    {
        grant: ['CREATE'],
        to   : 'system-user',
    },
    {
        grant: ['READ'],
        to   : 'report-viewer',
        where: 'integration.integrationGroups.group.userGroups.user.email = $user'
    },
    {
        grant: ['*'],
        to   : 'administrator',
    }
]) : cuid, managed {
    executedAt  : Timestamp not null;
    status      : ExecutionStatus not null;
    payload     : LargeString;

    integration : Association to Integrations not null;
}
