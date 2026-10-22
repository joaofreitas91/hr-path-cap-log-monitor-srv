sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/Input",
    "sap/ui/comp/filterbar/FilterGroupItem",
    "sap/ui/model/type/DateTime",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/export/Spreadsheet",
    "sap/ui/export/library",
    "com/hrpath/log/monitor/report/model/formatter"
], (Controller, Filter, FilterOperator, Input, FilterGroupItem, DateTimeType, JSONModel, MessageToast, Spreadsheet, exportLibrary, formatter) => {
    "use strict";

    const NO_MATCH_ID = "00000000-0000-0000-0000-000000000000";
    const EdmType = exportLibrary.EdmType;

    return Controller.extend("com.hrpath.log.monitor.report.controller.Report", {
        formatter,
        DateTimeType,

        onInit() {
            this._aDynamicFields = [];
            this._aDynamicFieldItems = [];
            this._aFilters = [];
            // Same formatting as the executedAt column, so the file reads like the table
            this._oExportDateTime = new DateTimeType({
                pattern: "dd/MM/yyyy HH:mm:ss",
                source: { pattern: "yyyy-MM-dd'T'HH:mm:ss.SSSX" }
            });
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
            this._aFilters = aFilters;
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

        /* ---------- spreadsheet export of the filtered logs ---------- */

        async onExportLogs() {
            const oButton = this.byId("btnExportLogs");
            oButton.setBusy(true);
            try {
                const oSheet = new Spreadsheet({
                    workbook: { columns: this._buildExportColumns() },
                    dataSource: await this._readLogsForExport(),
                    fileName: `${this.getText("exportLogsFileName")}.xlsx`,
                    // The library is served from the SAPUI5 CDN, so the export worker would
                    // be cross-origin; the file is built on the main thread instead
                    worker: false
                });
                await oSheet.build();
                oSheet.destroy();
            } catch (e) {
                MessageToast.show(this.getText("exportFailed"));
                console.error(e);
            } finally {
                oButton.setBusy(false);
            }
        },

        _buildExportColumns() {
            return [
                { label: this.getText("integration"), property: "integration", type: EdmType.String, width: 32 },
                { label: this.getText("source"), property: "source", type: EdmType.String, width: 20 },
                { label: this.getText("target"), property: "target", type: EdmType.String, width: 20 },
                { label: this.getText("dateTime"), property: "executedAt", type: EdmType.String, width: 20 },
                { label: this.getText("status"), property: "status", type: EdmType.String, width: 14 }
            ];
        },

        /**
         * A binding of its own, with the filters in force: the table keeps showing the page
         * it has loaded while the file gets every matching log. The values are written as
         * the table displays them, which is why the export reads the rows instead of
         * handing the download URL to the library.
         */
        async _readLogsForExport() {
            const iCount = this.getView().getModel("view").getProperty("/counts/logsTable") ?? 0;
            const oBinding = this.getView().getModel().bindList(
                "/IntegrationLogs",
                undefined,
                undefined,
                this._aFilters,
                {
                    $select: "ID,executedAt,status",
                    $expand: "integration($select=description,source,target)"
                }
            );
            const aContexts = await oBinding.requestContexts(0, iCount);
            const aRows = aContexts.map(oContext => {
                const oLog = oContext.getObject();
                return {
                    integration: oLog.integration?.description,
                    source: oLog.integration?.source,
                    target: oLog.integration?.target,
                    executedAt: this._oExportDateTime.formatValue(oLog.executedAt, "string"),
                    status: oLog.status ? this.getText(`status_${oLog.status}`) : ""
                };
            });
            oBinding.destroy();
            return aRows;
        },

        getText(sKey) {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sKey);
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
