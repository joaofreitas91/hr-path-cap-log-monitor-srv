sap.ui.define([
    "com/hrpath/log/monitor/cockpit/controller/BaseController",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/FilterType",
    "sap/ui/model/Sorter",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], (BaseController, Filter, FilterOperator, FilterType, Sorter, JSONModel, MessageBox, MessageToast) => {
    "use strict";

    const SAMPLE_EXECUTED_AT = "2026-01-15T10:30:00.000Z";
    const NOTIFICATION_TABLE_IDS = ["notificationUsersTable", "notificationGroupsTable"];
    const LINK_GROUP = "link";

    // Users and groups with access become notification recipients the same way; only these settings differ
    const NOTIFICATION_KINDS = {
        users: {
            fragment: "LinkNotificationUsersDialog",
            foreignKey: "user_ID",
            searchPaths: ["name", "email"],
            tableId: "notificationUsersTable",
            linkedToastKey: "notificationUsersLinked",
            unlinkTextKey: "unlinkNotificationUsersText",
            unlinkedToastKey: "notificationUsersUnlinked"
        },
        groups: {
            fragment: "LinkNotificationGroupsDialog",
            foreignKey: "integrationGroup_ID",
            // Only groups that already have access to this integration can be notified about it
            baseFilterPath: "integration_ID",
            searchPaths: ["group/description", "group/iasUserGroup"],
            tableId: "notificationGroupsTable",
            linkedToastKey: "notificationGroupsLinked",
            unlinkTextKey: "unlinkNotificationGroupsText",
            unlinkedToastKey: "notificationGroupsUnlinked"
        }
    };

    return BaseController.extend("com.hrpath.log.monitor.cockpit.controller.IntegrationDetail", {
        onInit() {
            BaseController.prototype.onInit.apply(this, arguments);
            this.getView().setModel(new JSONModel({}), "apiSample");
            this.getRouter().getRoute("integrationDetail").attachPatternMatched(this._onRouteMatched, this);
        },

        /** The status checkboxes save on click ($auto), so a rejected PATCH is reported and rolled back here. */
        _attachNotificationPatchHandlers() {
            if (this._bPatchHandlersAttached) return;
            this._bPatchHandlersAttached = true;
            NOTIFICATION_TABLE_IDS.forEach(sTableId => {
                this.byId(sTableId).getBinding("items").attachPatchCompleted(oEvent => {
                    if (oEvent.getParameter("success")) return;
                    const oBinding = oEvent.getSource();
                    MessageBox.error(this._lastErrorMessage());
                    // The rejected change counts as pending only once the model finished handling the response
                    setTimeout(() => oBinding.resetChanges(), 0);
                });
            });
        },

        _onRouteMatched(oEvent) {
            const sId = this._sIntegrationId = oEvent.getParameter("arguments").id;
            this.bindViewElement(`/Integrations(${sId})`);
            this._attachNotificationPatchHandlers();

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

        // The recipient tables are filtered by kind at binding time, so the search must not replace that filter
        onSearchNotificationUsers(oEvent) {
            this.searchTable("notificationUsersTable", ["user/name", "user/email"], oEvent.getParameter("newValue"), FilterType.Control);
        },

        /** Collects the user count of each notified group from the loaded rows, for the Usuários column. */
        onNotificationGroupsUpdateFinished(oEvent) {
            this.onTableUpdateFinished(oEvent);
            const aContexts = oEvent.getSource().getBinding("items").getAllCurrentContexts();
            this.getViewModel().setProperty("/userCounts", Object.fromEntries(aContexts.map(oContext => [
                oContext.getProperty("ID"),
                (oContext.getObject("integrationGroup/group/userGroups") ?? []).length
            ])));
        },

        onSearchNotificationGroups(oEvent) {
            this.searchTable("notificationGroupsTable", ["integrationGroup/group/description", "integrationGroup/group/iasUserGroup"],
                oEvent.getParameter("newValue"), FilterType.Control);
        },

        /* ---------- notification recipients ---------- */

        onLinkNotificationUsers() {
            this._openNotificationLinkDialog("users");
        },

        onLinkNotificationGroups() {
            this._openNotificationLinkDialog("groups");
        },

        async _openNotificationLinkDialog(sKind) {
            this._oNotificationKind = NOTIFICATION_KINDS[sKind];
            this._mNotificationDialogs ??= {};
            this._mNotificationDialogs[sKind] ??= await this.loadFragment({
                name: `com.hrpath.log.monitor.cockpit.fragment.${this._oNotificationKind.fragment}`
            });
            const oDialog = this._mNotificationDialogs[sKind];

            // Fresh request on every open, so recipients linked in the meantime are not offered
            const oBinding = oDialog.getBinding("items");
            oBinding.filter(this._getNotNotifiedFilter());
            if (oBinding.isSuspended()) oBinding.resume(); else oBinding.refresh();
            oDialog.open();
        },

        _getNotNotifiedFilter() {
            const { baseFilterPath } = this._oNotificationKind;
            const aFilters = [new Filter({
                path: "notifications",
                operator: FilterOperator.All,
                variable: "notification",
                condition: new Filter("notification/integration_ID", FilterOperator.NE, this._sIntegrationId)
            })];
            if (baseFilterPath) aFilters.push(new Filter(baseFilterPath, FilterOperator.EQ, this._sIntegrationId));
            return new Filter({ filters: aFilters, and: true });
        },

        onNotificationLinkDialogSearch(oEvent) {
            const sQuery = (oEvent.getParameter("value") ?? "").trim();
            const aFilters = [this._getNotNotifiedFilter()];
            if (sQuery) {
                aFilters.push(new Filter({
                    filters: this._oNotificationKind.searchPaths.map(sPath => new Filter({
                        path: sPath,
                        operator: FilterOperator.Contains,
                        value1: sQuery,
                        caseSensitive: false
                    })),
                    and: false
                }));
            }
            oEvent.getSource().getBinding("items").filter(new Filter({ filters: aFilters, and: true }));
        },

        async onNotificationLinkDialogConfirm(oEvent) {
            const aContexts = oEvent.getParameter("selectedContexts") ?? [];
            if (aContexts.length === 0) return;

            const { foreignKey, tableId, linkedToastKey } = this._oNotificationKind;
            const oModel = this.getView().getModel();
            const oLinkBinding = oModel.bindList("/IntegrationNotifications", undefined, [], [], { $$updateGroupId: LINK_GROUP });
            aContexts.forEach(oContext => {
                // Erro is the useful default for a log monitor; the other statuses are checked in the table
                oLinkBinding.create({
                    integration_ID: this._sIntegrationId,
                    [foreignKey]: oContext.getProperty("ID"),
                    notifyOnError: true
                }).created().catch(() => { /* discarded by resetChanges below */ });
            });

            await oModel.submitBatch(LINK_GROUP);
            if (oModel.hasPendingChanges(LINK_GROUP)) {
                MessageBox.error(this._lastErrorMessage());
                oModel.resetChanges(LINK_GROUP);
            } else {
                MessageToast.show(this.getCountText(linkedToastKey, aContexts.length));
            }
            this.refreshTable(tableId);
        },

        onUnlinkNotificationUsers() {
            this._confirmUnlinkNotification("users");
        },

        onUnlinkNotificationGroups() {
            this._confirmUnlinkNotification("groups");
        },

        _confirmUnlinkNotification(sKind) {
            const { tableId, unlinkTextKey, unlinkedToastKey } = NOTIFICATION_KINDS[sKind];
            const iCount = this.byId(tableId).getSelectedContexts().length;
            const sIntegration = this.getView().getBindingContext().getProperty("description");
            this.confirmDelete({
                tableId,
                title: this.getText("unlink"),
                text: `${this.getCountText(unlinkTextKey, iCount, [sIntegration])}\n\n${this.getText(`${unlinkTextKey}Info`)}`,
                toastKey: unlinkedToastKey,
                confirmText: this.getText("unlink")
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
