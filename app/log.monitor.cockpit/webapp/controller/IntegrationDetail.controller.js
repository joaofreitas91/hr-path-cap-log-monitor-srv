sap.ui.define([
    "com/hrpath/log/monitor/cockpit/controller/BaseController",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], (BaseController, Filter, FilterOperator) => {
    "use strict";

    return BaseController.extend("com.hrpath.log.monitor.cockpit.controller.IntegrationDetail", {
        onInit() {
            BaseController.prototype.onInit.apply(this, arguments);
            this.getRouter().getRoute("integrationDetail").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched(oEvent) {
            const sId = oEvent.getParameter("arguments").id;
            this.bindViewElement(`/Integrations(${sId})`);

            // Groups are listed from /Groups so each row can count its users
            const oGroupsBinding = this.byId("accessGroupsTable").getBinding("items");
            oGroupsBinding.filter(new Filter({
                path: "integrationGroups",
                operator: FilterOperator.Any,
                variable: "link",
                condition: new Filter("link/integration_ID", FilterOperator.EQ, sId)
            }));
            if (oGroupsBinding.isSuspended()) oGroupsBinding.resume(); else oGroupsBinding.refresh();
        },

        onNavBack() {
            this.getRouter().navTo("integrations");
        },

        onEdit() {
            this.openEntityDialog({
                fragment: "IntegrationDialog",
                title: this.getText("editIntegration"),
                context: this.getView().getBindingContext()
            });
        },

        onSearchFields(oEvent) {
            this.searchTable("fieldsTable", ["fieldName", "label", "description"], oEvent.getParameter("newValue"));
        },

        onAddField() {
            this.openEntityDialog({
                fragment: "IntegrationFieldDialog",
                title: this.getText("newField"),
                listPath: "fields",
                parentContext: this.getView().getBindingContext(),
                initialData: { isFilterable: false, isSortable: false },
                refreshTableId: "fieldsTable"
            });
        },

        onEditField(oEvent) {
            this.openEntityDialog({
                fragment: "IntegrationFieldDialog",
                title: this.getText("editField"),
                context: oEvent.getSource().getBindingContext()
            });
        },

        onDeleteFields() {
            const iCount = this.byId("fieldsTable").getSelectedContexts().length;
            this.confirmDelete({
                tableId: "fieldsTable",
                title: this.getText("deleteFieldsTitle"),
                text: this.getCountText("deleteFieldsText", iCount),
                toastKey: "fieldsDeleted"
            });
        },

        onAccessGroupPress(oEvent) {
            this.getRouter().navTo("groupDetail", { id: oEvent.getSource().getBindingContext().getProperty("ID") });
        }
    });
});
