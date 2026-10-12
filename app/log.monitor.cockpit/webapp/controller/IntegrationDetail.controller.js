sap.ui.define([
    "com/hrpath/log/monitor/cockpit/controller/BaseController",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/Sorter",
    "sap/ui/model/json/JSONModel"
], (BaseController, Filter, FilterOperator, Sorter, JSONModel) => {
    "use strict";

    const SAMPLE_EXECUTED_AT = "2026-01-15T10:30:00.000Z";

    return BaseController.extend("com.hrpath.log.monitor.cockpit.controller.IntegrationDetail", {
        onInit() {
            BaseController.prototype.onInit.apply(this, arguments);
            this.getView().setModel(new JSONModel({}), "apiSample");
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
        },

        /* ---------- integration API ---------- */

        async onShowApi() {
            const oContext = this.getView().getBindingContext();
            // Read the fields through their own binding: the fields table carries the page's search filter
            const aFields = await this.getView().getModel()
                .bindList("fields", oContext, [new Sorter("fieldName")], [], { $select: "fieldName" })
                .requestContexts(0, 1000);
            const oPayload = Object.fromEntries(aFields.map(oField => [oField.getProperty("fieldName"), ""]));
            const oSample = {
                integration_ID: oContext.getProperty("ID"),
                executedAt: SAMPLE_EXECUTED_AT,
                status: "SUCCESS",
                payload: oPayload
            };

            this.getView().getModel("apiSample").setData({
                endpoint: await this._requestApiPath(),
                hasFields: aFields.length > 0,
                // Shown expanded so it can be read; sent with payload as the JSON string the API expects
                display: JSON.stringify(oSample, null, 2),
                body: JSON.stringify({ ...oSample, payload: JSON.stringify(oPayload) }, null, 2)
            });

            this._oApiDialog ??= await this.loadFragment({ name: "com.hrpath.log.monitor.cockpit.fragment.IntegrationApiDialog" });
            this._oApiDialog.open();
        },

        async _requestApiPath() {
            const oOperation = this.getView().getModel().bindContext("/integrationApiPath(...)");
            try {
                await oOperation.execute();
                // A function returning a primitive is wrapped as { value: ... }
                const vResult = oOperation.getBoundContext().getObject();
                return (vResult && typeof vResult === "object" ? vResult.value : vResult) ?? "";
            } catch {
                return "";
            } finally {
                oOperation.destroy();
            }
        },

        onCopyApiEndpoint() {
            this.copyToClipboard(this.getView().getModel("apiSample").getProperty("/endpoint"), "apiEndpointCopied", "apiEndpointCopyFailed");
        },

        onCopyApiSample() {
            this.copyToClipboard(this.getView().getModel("apiSample").getProperty("/body"), "apiSampleCopied", "apiSampleCopyFailed");
        },

        onCloseApiDialog() {
            this._oApiDialog.close();
        }
    });
});
