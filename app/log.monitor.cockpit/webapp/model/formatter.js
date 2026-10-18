sap.ui.define([], () => {
    "use strict";

    const StatusState = {
        RUNNING: "Information",
        SUCCESS: "Success",
        ERROR:   "Error",
        WARNING: "Warning"
    };

    const StatusIcon = {
        RUNNING: "sap-icon://synchronize",
        SUCCESS: "sap-icon://sys-enter-2",
        ERROR:   "sap-icon://error",
        WARNING: "sap-icon://alert"
    };

    return {
        statusState(sStatus) {
            return StatusState[sStatus] ?? "None";
        },

        statusIcon(sStatus) {
            return StatusIcon[sStatus] ?? "";
        },

        /**
         * Number of users of a notified group, by notification ID. A binding to
         * "integrationGroup/group/userGroups/$count" would make OData V4 request an $expand path
         * the service rejects, so the counts are collected from the loaded rows (see
         * IntegrationDetail.onNotificationGroupsUpdateFinished) and looked up here.
         */
        notifiedGroupUserCount(sNotificationId, mCounts) {
            return mCounts?.[sNotificationId] ?? 0;
        },

        // "this" is the control or the controller, depending on how UI5 binds the formatter
        statusText(sStatus) {
            if (!sStatus) return "";
            const oI18n = this.getModel ? this.getModel("i18n") : this.getView().getModel("i18n");
            return oI18n.getResourceBundle().getText(`status_${sStatus}`);
        }
    };
});
