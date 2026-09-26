sap.ui.define([
    "com/hrpath/log/monitor/cockpit/controller/BaseController",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/format/DateFormat",
    "sap/ui/core/format/NumberFormat",
    "sap/ui/core/theming/Parameters",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], (BaseController, Filter, FilterOperator, JSONModel, DateFormat, NumberFormat, Parameters, MessageBox, MessageToast) => {
    "use strict";

    const STATUS_ORDER = ["SUCCESS", "ERROR", "WARNING", "RUNNING"];
    const STATUS_COLOR_PARAMETERS = {
        SUCCESS: "sapPositiveElementColor",
        ERROR: "sapNegativeElementColor",
        WARNING: "sapCriticalElementColor",
        RUNNING: "sapInformativeElementColor"
    };
    const TOP_INTEGRATIONS = 10;

    const oPercentFormat = NumberFormat.getPercentInstance({ maxFractionDigits: 1 });
    const oIntegerFormat = NumberFormat.getIntegerInstance({ groupingEnabled: true });
    const oDateFormat = DateFormat.getDateInstance({ pattern: "dd/MM/yyyy" });
    const oDateTimeFormat = DateFormat.getDateTimeInstance({ pattern: "dd/MM/yyyy HH:mm:ss" });

    return BaseController.extend("com.hrpath.log.monitor.cockpit.controller.Dashboard", {
        onInit() {
            BaseController.prototype.onInit.apply(this, arguments);
            this.getView().setModel(new JSONModel({ integrationID: "", busy: false, total: 0 }), "dashboard");
            this.getView().setModel(new JSONModel({}), "payload");
            this._setLastDays(7);
            this._initStatusChart();
            this.getRouter().getRoute("dashboard").attachPatternMatched(() => this._load());
        },

        /* ---------- filters ---------- */

        onPeriodChange(oEvent) {
            if (!oEvent.getParameter("valid") || !oEvent.getParameter("to")) return;
            const oModel = this.getView().getModel("dashboard");
            const dTo = new Date(oEvent.getParameter("to"));
            dTo.setHours(23, 59, 59, 999);
            oModel.setProperty("/to", dTo);
            this._load();
        },

        onIntegrationChange() {
            this._load();
        },

        onQuickPeriod(oEvent) {
            this._setLastDays(Number(oEvent.getSource().data("days")));
            this._load();
        },

        _setLastDays(iDays) {
            const dTo = new Date();
            dTo.setHours(23, 59, 59, 999);
            const dFrom = new Date();
            dFrom.setDate(dFrom.getDate() - (iDays - 1));
            dFrom.setHours(0, 0, 0, 0);
            const oModel = this.getView().getModel("dashboard");
            oModel.setProperty("/from", dFrom);
            oModel.setProperty("/to", dTo);
        },

        /* ---------- data ---------- */

        async _load() {
            const oDashboard = this.getView().getModel("dashboard");
            const { from: dFrom, to: dTo } = oDashboard.getData();
            const sIntegrationID = this.byId("filterIntegration").getSelectedKey();
            oDashboard.setProperty("/integrationID", sIntegrationID);
            oDashboard.setProperty("/busy", true);

            const aFilters = [
                new Filter("status", FilterOperator.EQ, "ERROR"),
                new Filter("executedAt", FilterOperator.BT, dFrom.toISOString(), dTo.toISOString())
            ];
            if (sIntegrationID) aFilters.push(new Filter("integration_ID", FilterOperator.EQ, sIntegrationID));
            const oErrorsBinding = this.byId("errorLogsTable").getBinding("items");
            oErrorsBinding.filter(aFilters);
            if (oErrorsBinding.isSuspended()) oErrorsBinding.resume();

            try {
                const oOperation = this.getView().getModel().bindContext("/logMetrics(...)");
                oOperation.setParameter("from", dFrom.toISOString());
                oOperation.setParameter("to", dTo.toISOString());
                if (sIntegrationID) oOperation.setParameter("integrationID", sIntegrationID);
                await oOperation.execute();
                this._applyMetrics(oOperation.getBoundContext().getObject(), dFrom, dTo);
            } catch (oError) {
                MessageBox.error(oError.message);
            } finally {
                oDashboard.setProperty("/busy", false);
            }
        },

        _applyMetrics({ byStatus, byIntegration }, dFrom, dTo) {
            const iTotal = byStatus.total;
            const percentOf = (iPart, iWhole) => (iWhole ? iPart / iWhole : 0);
            const sPeriod = `${oDateFormat.format(dFrom)} – ${oDateFormat.format(dTo)}`;

            const aStatusData = STATUS_ORDER.map(sKey => {
                const iCount = byStatus[sKey.toLowerCase()];
                return {
                    key: sKey,
                    label: this.getText(`status_${sKey}`),
                    count: iCount,
                    percentText: oPercentFormat.format(percentOf(iCount, iTotal))
                };
            });

            const aKpis = [{
                key: "TOTAL",
                title: this.getText("kpiTotal"),
                value: oIntegerFormat.format(iTotal),
                subtitle: sPeriod
            }, ...aStatusData.map(oStatus => ({
                key: oStatus.key,
                title: this.getText(`kpi_${oStatus.key}`),
                value: oIntegerFormat.format(oStatus.count),
                subtitle: this.getText("percentOfTotal", [oStatus.percentText])
            }))];

            // byIntegration comes sorted by total from the service
            const aTop = byIntegration.slice(0, TOP_INTEGRATIONS);
            const iMax = aTop[0]?.total || 1;
            const toWidth = (iPart, iWhole) => `${percentOf(iPart, iWhole) * 100}%`;
            const aTopIntegrations = aTop.map(oRow => ({
                description: oRow.description,
                systems: `${oRow.source} → ${oRow.target}`,
                total: oRow.total,
                widthPercent: toWidth(oRow.total, iMax),
                successPercent: toWidth(oRow.success, oRow.total),
                errorPercent: toWidth(oRow.error, oRow.total),
                warningPercent: toWidth(oRow.warning, oRow.total),
                runningPercent: toWidth(oRow.running, oRow.total)
            }));

            const oDashboard = this.getView().getModel("dashboard");
            oDashboard.setProperty("/total", iTotal);
            oDashboard.setProperty("/totalText", oIntegerFormat.format(iTotal));
            oDashboard.setProperty("/periodText", sPeriod);
            oDashboard.setProperty("/statusData", aStatusData);
            oDashboard.setProperty("/kpis", aKpis);
            oDashboard.setProperty("/topIntegrations", aTopIntegrations);
        },

        _initStatusChart() {
            const oChart = this.byId("statusChart");
            const aParameterNames = STATUS_ORDER.map(sKey => STATUS_COLOR_PARAMETERS[sKey]);
            const applyColors = mColors => oChart.setVizProperties({
                title: { visible: false },
                legend: { visible: false },
                plotArea: {
                    colorPalette: aParameterNames.map(sName => mColors[sName]),
                    innerRadiusRatio: 0.72,
                    dataLabel: { visible: false },
                    drawingEffect: "normal"
                },
                interaction: { selectability: { mode: "NONE" } }
            });
            const mColors = Parameters.get({ name: aParameterNames, callback: applyColors });
            if (mColors) applyColors(mColors);
        },

        /* ---------- payload dialog ---------- */

        async onShowPayload(oEvent) {
            const oContext = oEvent.getSource().getBindingContext();
            const sPayload = await oContext.requestProperty("payload");
            const { text, type } = this._describePayload(sPayload);

            this.getView().getModel("payload").setData({
                id: oContext.getProperty("ID"),
                description: oContext.getProperty("integration/description"),
                systems: `${oContext.getProperty("integration/source")} → ${oContext.getProperty("integration/target")}`,
                status: oContext.getProperty("status"),
                executedAt: oDateTimeFormat.format(new Date(oContext.getProperty("executedAt"))),
                type,
                text
            });

            this._oPayloadDialog ??= await this.loadFragment({ name: "com.hrpath.log.monitor.cockpit.fragment.PayloadDialog" });
            this._oPayloadDialog.open();
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
                await navigator.clipboard.writeText(this.getView().getModel("payload").getProperty("/text"));
                MessageToast.show(this.getText("payloadCopied"));
            } catch {
                MessageToast.show(this.getText("payloadCopyFailed"));
            }
        },

        onClosePayload() {
            this._oPayloadDialog.close();
        }
    });
});
