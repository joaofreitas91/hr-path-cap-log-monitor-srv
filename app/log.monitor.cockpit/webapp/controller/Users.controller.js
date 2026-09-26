sap.ui.define([
    "com/hrpath/log/monitor/cockpit/controller/BaseController"
], (BaseController) => {
    "use strict";

    return BaseController.extend("com.hrpath.log.monitor.cockpit.controller.Users", {
        onInit() {
            BaseController.prototype.onInit.apply(this, arguments);
            this.refreshOnRouteMatched("users", ["usersTable"]);
        },

        onSearch(oEvent) {
            this.searchTable("usersTable", ["name", "email"], oEvent.getParameter("newValue"));
        },

        onAdd() {
            this.openEntityDialog({
                fragment: "UserDialog",
                title: this.getText("newUser"),
                listPath: "/Users",
                refreshTableId: "usersTable"
            });
        },

        onEdit(oEvent) {
            this.openEntityDialog({
                fragment: "UserDialog",
                title: this.getText("editUser"),
                context: oEvent.getSource().getBindingContext()
            });
        },

        onDelete() {
            const iCount = this.byId("usersTable").getSelectedContexts().length;
            this.confirmDelete({
                tableId: "usersTable",
                title: this.getText("deleteUsersTitle"),
                text: this.getCountText("deleteUsersText", iCount),
                toastKey: "usersDeleted"
            });
        }
    });
});
