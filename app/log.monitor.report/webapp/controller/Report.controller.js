sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/Input",
    "sap/ui/comp/filterbar/FilterGroupItem",
    "sap/ui/model/type/DateTime",
    "sap/ui/model/json/JSONModel",
    "com/hrpath/log/monitor/report/model/formatter"
], (Controller, Filter, FilterOperator, Input, FilterGroupItem, DateTimeType, JSONModel, formatter) => {
    "use strict";

    const NO_MATCH_ID = "00000000-0000-0000-0000-000000000000";

    return Controller.extend("com.hrpath.log.monitor.report.controller.Report", {
        formatter,
        DateTimeType,

        onInit() {
            this._aDynamicFields = [];
            this._aDynamicFieldItems = [];
            this.getView().setModel(new JSONModel({ counts: {}, hasFilters: false }), "view");
        },

        onAfterRendering() {
            if (!this._initialFilterApplied) {
                this._initialFilterApplied = true;
                this.onSearch();
            }
        },

        async onIntegrationChange() {
            this._clearDynamicFieldItems();

            const sIntegrationKey = this.byId("filterIntegration").getSelectedKey();
            if (!sIntegrationKey) return;

            const oModel = this.getView().getModel();
            const oFieldsBinding = oModel.bindList(
                "/IntegrationFields",
                undefined,
                undefined,
                [
                    new Filter("integration_ID", FilterOperator.EQ, sIntegrationKey),
                    new Filter("isFilterable", FilterOperator.EQ, true)
                ]
            );
            const aContexts = await oFieldsBinding.requestContexts(0, 100);
            this._aDynamicFields = aContexts.map(oContext => oContext.getObject());
            oFieldsBinding.destroy();

            const oFilterBar = this.byId("filterBar");
            this._aDynamicFields.forEach(oField => {
                const sSafeName = this._toControlIdPart(oField.fieldName);
                const oInput = new Input(this.createId(`filterField-${sSafeName}`), {
                    placeholder: oField.label || oField.fieldName,
                    submit: () => this.onSearch()
                });
                const oFilterGroupItem = new FilterGroupItem(this.createId(`fgiField-${sSafeName}`), {
                    name: `field_${sSafeName}`,
                    groupName: "filters",
                    label: oField.label || oField.fieldName,
                    visibleInFilterBar: true,
                    control: oInput
                });
                oFilterBar.addFilterGroupItem(oFilterGroupItem);
                this._aDynamicFieldItems.push(oFilterGroupItem);
            });
        },

        _clearDynamicFieldItems() {
            const oFilterBar = this.byId("filterBar");
            this._aDynamicFieldItems.forEach(oItem => {
                oFilterBar.removeFilterGroupItem(oItem);
                oItem.getControl().destroy();
                oItem.destroy();
            });
            this._aDynamicFieldItems = [];
            this._aDynamicFields = [];
        },

        _toControlIdPart(sFieldName) {
            return sFieldName.replace(/[^A-Za-z0-9]/g, "_");
        },

        async _getMatchingLogIds(sIntegrationKey, oFieldsFilter) {
            const oModel = this.getView().getModel();
            const oOperation = oModel.bindContext("/matchingLogIds(...)");
            oOperation.setParameter("integrationID", sIntegrationKey);
            oOperation.setParameter("fieldsFilter", JSON.stringify(oFieldsFilter));
            await oOperation.execute();

            let vResult = oOperation.getBoundContext().getObject();
            if (vResult && typeof vResult === "object" && "value" in vResult) vResult = vResult.value;
            oOperation.destroy();

            try {
                return JSON.parse(vResult ?? "[]");
            } catch {
                return [];
            }
        },

        async onSearch() {
            const oBinding = this.byId("logsTable").getBinding("items");
            const aFilters = [];

            const sIntegrationKey = this.byId("filterIntegration").getSelectedKey();
            if (sIntegrationKey) {
                aFilters.push(new Filter("integration/ID", FilterOperator.EQ, sIntegrationKey));
            }

            const sSource = this.byId("filterSource").getValue();
            if (sSource) aFilters.push(new Filter({
                path: "integration/source",
                operator: FilterOperator.Contains,
                value1: sSource,
                caseSensitive: false
            }));

            const sTarget = this.byId("filterTarget").getValue();
            if (sTarget) aFilters.push(new Filter({
                path: "integration/target",
                operator: FilterOperator.Contains,
                value1: sTarget,
                caseSensitive: false
            }));

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

            if (sIntegrationKey && this._aDynamicFields.length > 0) {
                const oFieldsFilter = {};
                this._aDynamicFields.forEach(oField => {
                    const sSafeName = this._toControlIdPart(oField.fieldName);
                    const sValue = this.byId(`filterField-${sSafeName}`)?.getValue();
                    if (sValue) oFieldsFilter[oField.fieldName] = sValue;
                });

                if (Object.keys(oFieldsFilter).length > 0) {
                    const aMatchingIds = await this._getMatchingLogIds(sIntegrationKey, oFieldsFilter);
                    aFilters.push(new Filter({
                        filters: (aMatchingIds.length > 0 ? aMatchingIds : [NO_MATCH_ID])
                            .map(sId => new Filter("ID", FilterOperator.EQ, sId)),
                        and: false
                    }));
                }
            }

            this.getView().getModel("view").setProperty("/hasFilters", aFilters.length > 0);
            oBinding.filter(aFilters);
        },

        onClear() {
            this._clearDynamicFieldItems();
            this.byId("filterIntegration").setSelectedKey("");
            this.byId("filterSource").setValue("");
            this.byId("filterTarget").setValue("");
            this.byId("filterDateRange").setValue("");
            this.byId("filterStatus").setSelectedKeys(["ERROR"]);
            this.onSearch();
        },

        onTableUpdateFinished(oEvent) {
            const oHeaderContext = oEvent.getSource().getBinding("items").getHeaderContext();
            this.getView().getModel("view").setProperty("/counts/logsTable", oHeaderContext.getProperty("$count") ?? 0);
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
