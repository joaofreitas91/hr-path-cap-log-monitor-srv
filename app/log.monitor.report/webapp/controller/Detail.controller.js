sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/type/DateTime",
    "sap/m/MessageToast",
    "sap/m/Column",
    "sap/m/Label",
    "sap/m/Text",
    "sap/m/ColumnListItem",
    "sap/m/ViewSettingsFilterItem",
    "sap/m/ViewSettingsItem",
    "com/hrpath/log/monitor/report/model/formatter"
], (Controller, JSONModel, Filter, FilterOperator, DateTimeType, MessageToast, Column, Label, Text, ColumnListItem, ViewSettingsFilterItem, ViewSettingsItem, formatter) => {
    "use strict";

    return Controller.extend("com.hrpath.log.monitor.report.controller.Detail", {
        formatter,
        DateTimeType,

        onInit() {
            this._aFields = [];
            this._mFieldFilters = {};
            this.getView().setModel(new JSONModel({ text: "", type: "" }), "detail");
            this.getView().setModel(new JSONModel({
                counts: {},
                hasFields: false,
                hasFieldFilters: false,
                fieldFiltersText: ""
            }), "view");
            this.getOwnerComponent().getRouter()
                .getRoute("RouteDetail")
                .attachPatternMatched(this._onRouteMatched, this);
        },

        async _onRouteMatched(oEvent) {
            const sLogId = oEvent.getParameter("arguments").logId;
            await this._load(sLogId);
        },

        async _load(sLogId) {
            const oPage = this.byId("detailPage");
            oPage.setBusy(true);
            try {
                const oView = this.getView();
                oView.bindElement({ path: `/IntegrationLogs(${sLogId})` });
                const oContext = oView.getElementBinding().getBoundContext();

                const [sPayload, sIntegrationId] = await Promise.all([
                    oContext.requestProperty("payload"),
                    oContext.requestProperty("integration_ID")
                ]);

                oView.getModel("detail").setData(this._describePayload(sPayload));
                this._buildFieldsTable(await this._readFields(sIntegrationId), sPayload);
            } catch (e) {
                MessageToast.show(this.getText("errorLoadingLogs"));
                console.error(e);
            } finally {
                oPage.setBusy(false);
            }
        },

        async _readFields(sIntegrationId) {
            const oFieldsBinding = this.getOwnerComponent().getModel().bindList(
                "/IntegrationFields",
                undefined,
                undefined,
                new Filter("integration_ID", FilterOperator.EQ, sIntegrationId)
            );
            const aContexts = await oFieldsBinding.requestContexts(0, 1000);
            const aFields = aContexts.map(oContext => oContext.getObject());
            oFieldsBinding.destroy();
            return aFields;
        },

        /**
         * One column per declared field; an array payload yields one row per element,
         * any other payload a single row.
         */
        _buildFieldsTable(aFields, sPayload) {
            const oTable = this.byId("fieldsTable");
            oTable.unbindItems();
            oTable.destroyColumns();
            oTable.destroyItems();
            this._resetFieldFilters(aFields);

            if (aFields.length === 0) return;

            aFields.forEach(oField => {
                oTable.addColumn(new Column({ header: new Label({ text: oField.label || oField.fieldName }) }));
            });

            let aRecords = [{}];
            try {
                aRecords = [].concat(JSON.parse(sPayload || "{}"));
            } catch { /* not JSON: the payload block shows the raw text */ }

            const aRows = aRecords.map(oRecord => Object.fromEntries(
                aFields.map(oField => [oField.fieldName, oRecord?.[oField.fieldName] ?? null])
            ));
            this.getView().setModel(new JSONModel({ rows: aRows }), "logs");

            const oTemplate = new ColumnListItem();
            aFields.forEach(oField => {
                oTemplate.addCell(new Text({ text: `{logs>${oField.fieldName}}` }));
            });
            oTable.bindItems({ path: "logs>/rows", template: oTemplate });
        },

        /* ---------- search and per-field filters over the payload rows ---------- */

        /** Drops the criteria of the previously shown log; the dialog is rebuilt on the next open. */
        _resetFieldFilters(aFields) {
            this._aFields = aFields;
            this._mFieldFilters = {};
            this.byId("fieldsSearch").setValue("");
            // Destroyed whole: emptying its items would leave the dialog reopening on the
            // filter page of the previous log, now without values
            this._oFieldFiltersDialog?.destroy();
            this._oFieldFiltersDialog = null;

            const oViewModel = this.getView().getModel("view");
            oViewModel.setProperty("/hasFields", aFields.length > 0);
            oViewModel.setProperty("/hasFieldFilters", false);
            oViewModel.setProperty("/counts/fieldsTable", 0);
            oViewModel.setProperty("/fieldFiltersText", this.getText("fieldFilters"));
        },

        onFieldsSearch() {
            this._filterFieldsTable();
        },

        onFieldsTableUpdateFinished(oEvent) {
            const iCount = oEvent.getSource().getBinding("items")?.getLength() ?? 0;
            this.getView().getModel("view").setProperty("/counts/fieldsTable", iCount);
        },

        /**
         * The search matches any declared field (OR); the values chosen for a field are an OR
         * of their own and every field adds an AND.
         */
        _filterFieldsTable() {
            const oBinding = this.byId("fieldsTable").getBinding("items");
            if (!oBinding) return;

            const aFilters = [];
            const sQuery = this.byId("fieldsSearch").getValue().trim();
            if (sQuery && this._aFields.length > 0) {
                aFilters.push(new Filter({
                    filters: this._aFields.map(oField => new Filter({
                        path: oField.fieldName,
                        operator: FilterOperator.Contains,
                        value1: sQuery,
                        caseSensitive: false
                    })),
                    and: false
                }));
            }
            Object.entries(this._mFieldFilters).forEach(([sFieldName, aValues]) => {
                aFilters.push(new Filter({
                    filters: aValues.map(vValue => new Filter(sFieldName, FilterOperator.EQ, vValue)),
                    and: false
                }));
            });

            const iCriteria = Object.values(this._mFieldFilters).reduce((iSum, a) => iSum + a.length, 0);
            const oViewModel = this.getView().getModel("view");
            oViewModel.setProperty("/hasFieldFilters", aFilters.length > 0);
            oViewModel.setProperty("/fieldFiltersText", iCriteria === 0
                ? this.getText("fieldFilters")
                : this.getCountText("fieldFiltersActive", iCriteria));

            oBinding.filter(aFilters);
        },

        async onOpenFieldFilters() {
            this._oFieldFiltersDialog ??= await this.loadFragment({
                name: "com.hrpath.log.monitor.report.fragment.FieldFiltersDialog"
            });
            if (this._oFieldFiltersDialog.getFilterItems().length === 0) this._buildFieldFilterItems();
            this._oFieldFiltersDialog.open();
        },

        /** One filter page per declared field, listing the values its rows actually hold. */
        _buildFieldFilterItems() {
            const aRows = this.getView().getModel("logs")?.getProperty("/rows") ?? [];

            this._aFields.forEach(oField => {
                const mValues = new Map();
                aRows.forEach(oRow => {
                    const vValue = oRow[oField.fieldName];
                    if (vValue !== null && vValue !== undefined && vValue !== "") mValues.set(String(vValue), vValue);
                });
                if (mValues.size === 0) return;

                const sFieldKey = this._toControlIdPart(oField.fieldName);
                this._oFieldFiltersDialog.addFilterItem(new ViewSettingsFilterItem({
                    key: sFieldKey,
                    text: oField.label || oField.fieldName,
                    items: [...mValues.keys()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
                        .map(sText => {
                            const oItem = new ViewSettingsItem({ key: `${sFieldKey}:${sText}`, text: sText });
                            // The raw value keeps its type, so a numeric cell still matches its filter
                            oItem.data("fieldName", oField.fieldName);
                            oItem.data("value", mValues.get(sText));
                            return oItem;
                        })
                }));
            });
        },

        onConfirmFieldFilters(oEvent) {
            this._mFieldFilters = {};
            oEvent.getParameter("filterItems").forEach(oItem => {
                const sFieldName = oItem.data("fieldName");
                (this._mFieldFilters[sFieldName] ??= []).push(oItem.data("value"));
            });
            this._filterFieldsTable();
        },

        _toControlIdPart(sFieldName) {
            return sFieldName.replace(/[^A-Za-z0-9]/g, "_");
        },

        _describePayload(sPayload) {
            if (sPayload === null || sPayload === undefined || sPayload === "") {
                return { text: "", type: this.getText("payloadEmpty") };
            }
            try {
                const vPayload = JSON.parse(sPayload);
                let sType = this.getText("payloadText");
                if (Array.isArray(vPayload)) sType = this.getCountText("payloadArray", vPayload.length);
                else if (vPayload && typeof vPayload === "object") sType = this.getText("payloadObject");
                return { text: JSON.stringify(vPayload, null, 2), type: sType };
            } catch {
                return { text: sPayload, type: this.getText("payloadText") };
            }
        },

        async onCopyPayload() {
            try {
                await navigator.clipboard.writeText(this.getView().getModel("detail").getProperty("/text"));
                MessageToast.show(this.getText("payloadCopied"));
            } catch {
                MessageToast.show(this.getText("payloadCopyFailed"));
            }
        },

        getText(sKey, aArgs) {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sKey, aArgs);
        },

        // Picks "<key>_one" or "<key>_other" by count and passes the count as {0}
        getCountText(sKey, iCount) {
            return this.getText(`${sKey}_${iCount === 1 ? "one" : "other"}`, [iCount]);
        },

        onFullScreen() {
            this._getFCL().setLayout("MidColumnFullScreen");
        },

        onExitFullScreen() {
            this._getFCL().setLayout("TwoColumnsMidExpanded");
        },

        onCloseColumn() {
            this._getFCL().setLayout("OneColumn");
        },

        _getFCL() {
            return this.getOwnerComponent().getRootControl().byId("app");
        },

        _getFCLModel() {
            return this.getOwnerComponent().getModel("fcl");
        }
    });
});
