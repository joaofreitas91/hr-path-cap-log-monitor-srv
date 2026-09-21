sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "com/hrpath/log/monitor/report/model/formatter"
], (Controller, Filter, FilterOperator, formatter) => {
    "use strict";

    return Controller.extend("com.hrpath.log.monitor.report.controller.Report", {
        formatter,

        onInit() { },

        onAfterRendering() {
            if (!this._initialFilterApplied) {
                this._initialFilterApplied = true;
                this.onSearch();
            }
        },

        onSearch() {
            const oBinding = this.byId("integrationsList").getBinding("items");
            const aFilters = [];

            const aIntegrationKeys = this.byId("filterIntegration").getSelectedKeys();
            if (aIntegrationKeys.length > 0) {
                aFilters.push(new Filter({
                    filters: aIntegrationKeys.map(sId => new Filter("integration/ID", FilterOperator.EQ, sId)),
                    and: false
                }));
            }

            const sSource = this.byId("filterSource").getValue();
            if (sSource) aFilters.push(new Filter("integration/source", FilterOperator.Contains, sSource));

            const sTarget = this.byId("filterTarget").getValue();
            if (sTarget) aFilters.push(new Filter("integration/target", FilterOperator.Contains, sTarget));

            const oDRS = this.byId("filterDateRange");
            const oDateFrom = oDRS.getDateValue();
            const oDateTo = oDRS.getSecondDateValue();
            const aDateFilters = [];
            if (oDateFrom) {
                const oStart = new Date(oDateFrom);
                oStart.setHours(0, 0, 0, 0);
                aDateFilters.push(new Filter("executedAt", FilterOperator.GE, oStart.toISOString()));
            }
            if (oDateTo) {
                const oEnd = new Date(oDateTo);
                oEnd.setHours(23, 59, 59, 999);
                aDateFilters.push(new Filter("executedAt", FilterOperator.LE, oEnd.toISOString()));
            }
            if (aDateFilters.length > 0) {
                aFilters.push(new Filter({ filters: aDateFilters, and: true }));
            }

            const aStatuses = this.byId("filterStatus").getSelectedKeys();
            if (aStatuses.length > 0) {
                aFilters.push(new Filter({
                    filters: aStatuses.map(s => new Filter("status", FilterOperator.EQ, s)),
                    and: false
                }));
            }

            oBinding.filter(aFilters);
        },

        onClear() {
            this.byId("filterIntegration").setSelectedKeys([]);
            this.byId("filterSource").setValue("");
            this.byId("filterTarget").setValue("");
            this.byId("filterDateRange").setValue("");
            this.byId("filterStatus").setSelectedKeys([]);
            this.byId("integrationsList").getBinding("items").filter([]);
        },

        onListUpdateFinished(oEvent) {
            const iTotal = oEvent.getParameter("total");
            const sText = `${iTotal} item${iTotal !== 1 ? "s" : ""}`;
            this.byId("itemCountText").setText(sText);
            this.byId("itemCountTextSnapped").setText(sText);
        },

        onIntegrationPress(oEvent) {
            const oContext = oEvent.getSource().getBindingContext();
            this._getFCL().setLayout("TwoColumnsMidExpanded");
            this.getOwnerComponent().getRouter().navTo("RouteDetail", {
                logId: oContext.getProperty("ID")
            });
        },

        _getFCL() {
            return this.getOwnerComponent().getRootControl().byId("app");
        }
    });
});