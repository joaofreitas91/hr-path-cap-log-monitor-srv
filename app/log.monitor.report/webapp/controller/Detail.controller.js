sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/m/Column",
    "sap/m/Label",
    "sap/m/Text",
    "sap/m/ColumnListItem",
    "sap/m/ObjectStatus",
    "com/hrpath/log/monitor/report/model/formatter"
], (Controller, JSONModel, Filter, FilterOperator, MessageToast, Column, Label, Text, ColumnListItem, ObjectStatus, formatter) => {
    "use strict";

    return Controller.extend("com.hrpath.log.monitor.report.controller.Detail", {
        formatter,

        onInit() {
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
                const oModel = this.getOwnerComponent().getModel();

                const oLogBinding = oModel.bindContext(`/IntegrationLogs(${sLogId})`, undefined, {
                    $select: "ID,executedAt,status,payload,integration_ID",
                    $expand: "integration($select=description,source,target)"
                });
                const logData = await oLogBinding.getBoundContext().requestObject();
                oLogBinding.destroy();
                if (!logData) throw new Error("Log not found");

                const integrationId = logData.integration_ID;

                const oFieldsBinding = oModel.bindList(
                    "/IntegrationFields",
                    undefined,
                    undefined,
                    new Filter("integration_ID", FilterOperator.EQ, integrationId)
                );
                const aFieldsContexts = await oFieldsBinding.requestContexts(0, 1000);
                const aFields = aFieldsContexts.map(oContext => oContext.getObject());
                oFieldsBinding.destroy();

                const aLog = [logData] ?? [];

                const sDate = logData.executedAt
                    ? new Date(logData.executedAt).toLocaleString("pt-BR")
                    : "";

                let payloadFormatted = "";
                try {
                    payloadFormatted = JSON.stringify(JSON.parse(logData.payload ?? "{}"), null, 2);
                } catch {
                    payloadFormatted = logData.payload ?? "";
                }

                this.getView().setModel(new JSONModel({
                    status: logData.status ?? "",
                    executedAtFormatted: sDate,
                    integrationDescription: logData.integration?.description ?? "",
                    integrationSource: logData.integration?.source ?? "",
                    integrationTarget: logData.integration?.target ?? "",
                    payloadFormatted
                }), "detail");

                this._buildLogsTable(aFields, aLog);
            } catch (e) {
                MessageToast.show(
                    this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("errorLoadingLogs")
                );
                console.error(e);
            } finally {
                oPage.setBusy(false);
            }
        },

        _buildLogsTable(aFields, aLogs) {
            const oTable = this.byId("fieldsTable");
            oTable.unbindItems();
            oTable.destroyColumns();
            oTable.destroyItems();

            const i18n = this.getOwnerComponent().getModel("i18n").getResourceBundle();

            oTable.addColumn(new Column({ header: new Label({ text: i18n.getText("status") }), width: "7rem" }));
            oTable.addColumn(new Column({ header: new Label({ text: i18n.getText("dateTime") }), width: "10rem" }));
            aFields.forEach(f => {
                oTable.addColumn(new Column({ header: new Label({ text: f.description || f.fieldName }) }));
            });

            const aRows = aLogs.map(log => {
                let payload = {};
                try { payload = JSON.parse(log.payload ?? "{}"); } catch { /**/ }
                return {
                    ...log,
                    ...Object.fromEntries(aFields.map(f => [f.fieldName, payload[f.fieldName] ?? null])),
                    executedAtFormatted: log.executedAt
                        ? new Date(log.executedAt).toLocaleString("pt-BR")
                        : ""
                };
            });

            this.getView().setModel(new JSONModel({ rows: aRows }), "logs");

            const oTemplate = new ColumnListItem();
            oTemplate.addCell(new ObjectStatus({
                text: "{logs>status}",
                state: { path: "logs>status", formatter: formatter.statusState }
            }));
            oTemplate.addCell(new Text({ text: "{logs>executedAtFormatted}" }));
            aFields.forEach(f => {
                oTemplate.addCell(new Text({ text: `{logs>${f.fieldName}}` }));
            });

            oTable.bindItems({ path: "logs>/rows", template: oTemplate });
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