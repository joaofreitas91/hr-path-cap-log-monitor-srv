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
    "com/hrpath/log/monitor/report/model/formatter"
], (Controller, JSONModel, Filter, FilterOperator, DateTimeType, MessageToast, Column, Label, Text, ColumnListItem, formatter) => {
    "use strict";

    return Controller.extend("com.hrpath.log.monitor.report.controller.Detail", {
        formatter,
        DateTimeType,

        onInit() {
            this.getView().setModel(new JSONModel({ text: "", type: "" }), "detail");
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
