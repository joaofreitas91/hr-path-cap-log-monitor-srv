sap.ui.define([
    "com/hrpath/log/monitor/cockpit/controller/BaseController"
], (BaseController) => {
    "use strict";

    return BaseController.extend("com.hrpath.log.monitor.cockpit.controller.Groups", {
        onInit() {
            BaseController.prototype.onInit.apply(this, arguments);
            this.refreshOnRouteMatched("groups", ["groupsTable"]);
        },

        onSearch(oEvent) {
            this.searchTable("groupsTable", ["description", "iasUserGroup"], oEvent.getParameter("newValue"));
        },

        onRowPress(oEvent) {
            this.getRouter().navTo("groupDetail", { id: oEvent.getSource().getBindingContext().getProperty("ID") });
        },

        onAdd() {
            this.openEntityDialog({
                fragment: "GroupDialog",
                title: this.getText("newGroup"),
                listPath: "/Groups",
                refreshTableId: "groupsTable"
            });
        },

        onEdit(oEvent) {
            this.openEntityDialog({
                fragment: "GroupDialog",
                title: this.getText("editGroup"),
                context: oEvent.getSource().getBindingContext()
            });
        },

        onDelete() {
            const aContexts = this.byId("groupsTable").getSelectedContexts();
            const sQuestion = aContexts.length === 1
                ? this.getText("deleteGroupText_one", [aContexts[0].getProperty("description")])
                : this.getText("deleteGroupText_other", [aContexts.length]);

            this.confirmDelete({
                tableId: "groupsTable",
                title: this.getText("deleteGroupsTitle"),
                text: `${sQuestion}\n\n${this.getText("deleteGroupInfo")}`,
                toastKey: "groupsDeleted"
            });
        }
    });
});
