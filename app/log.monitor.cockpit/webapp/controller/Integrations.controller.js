sap.ui.define([
    "com/hrpath/log/monitor/cockpit/controller/BaseController"
], (BaseController) => {
    "use strict";

    return BaseController.extend("com.hrpath.log.monitor.cockpit.controller.Integrations", {
        onInit() {
            BaseController.prototype.onInit.apply(this, arguments);
            this.refreshOnRouteMatched("integrations", ["integrationsTable"]);
        },

        onSearch(oEvent) {
            this.searchTable("integrationsTable", ["description", "source", "target"], oEvent.getParameter("newValue"));
        },

        onRowPress(oEvent) {
            this.getRouter().navTo("integrationDetail", { id: oEvent.getSource().getBindingContext().getProperty("ID") });
        },

        onAdd() {
            this.openEntityDialog({
                fragment: "IntegrationDialog",
                title: this.getText("newIntegration"),
                listPath: "/Integrations",
                refreshTableId: "integrationsTable"
            });
        },

        onEdit(oEvent) {
            this.openEntityDialog({
                fragment: "IntegrationDialog",
                title: this.getText("editIntegration"),
                context: oEvent.getSource().getBindingContext()
            });
        },

        onDelete() {
            const aContexts = this.byId("integrationsTable").getSelectedContexts();
            const sum = sProperty => aContexts.reduce((iSum, oContext) => iSum + (oContext.getProperty(sProperty) ?? 0), 0);
            const sQuestion = aContexts.length === 1
                ? this.getText("deleteIntegrationText_one", [aContexts[0].getProperty("description")])
                : this.getText("deleteIntegrationText_other", [aContexts.length]);

            this.confirmDelete({
                tableId: "integrationsTable",
                title: this.getText("deleteIntegrationsTitle"),
                text: [
                    sQuestion,
                    this.getText("deleteIntegrationWarning"),
                    this.getText("deleteIntegrationImpact", [sum("logCount"), sum("fieldCount")])
                ].join("\n\n"),
                toastKey: "integrationsDeleted",
                state: "warning"
            });
        }
    });
});
