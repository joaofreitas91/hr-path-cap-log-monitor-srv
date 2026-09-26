sap.ui.define([
    "com/hrpath/log/monitor/cockpit/controller/BaseController",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], (BaseController, Filter, FilterOperator, MessageBox, MessageToast) => {
    "use strict";

    const LINK_GROUP = "link";

    // Users and integrations are linked to a group the same way; only these settings differ
    const LINK_KINDS = {
        users: {
            fragment: "LinkUsersDialog",
            navigationProperty: "userGroups",
            foreignKey: "user_ID",
            linkEntitySet: "/UserGroups",
            searchPaths: ["name", "email"],
            tableId: "linkedUsersTable",
            linkedToastKey: "usersLinked",
            unlinkTextKey: "unlinkUsersText",
            unlinkedToastKey: "usersUnlinked"
        },
        integrations: {
            fragment: "LinkIntegrationsDialog",
            navigationProperty: "integrationGroups",
            foreignKey: "integration_ID",
            linkEntitySet: "/IntegrationGroups",
            searchPaths: ["description", "source", "target"],
            tableId: "linkedIntegrationsTable",
            linkedToastKey: "integrationsLinked",
            unlinkTextKey: "unlinkIntegrationsText",
            unlinkedToastKey: "integrationsUnlinked"
        }
    };

    return BaseController.extend("com.hrpath.log.monitor.cockpit.controller.GroupDetail", {
        onInit() {
            BaseController.prototype.onInit.apply(this, arguments);
            this.getRouter().getRoute("groupDetail").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched(oEvent) {
            this._sGroupId = oEvent.getParameter("arguments").id;
            this.bindViewElement(`/Groups(${this._sGroupId})`);
        },

        onNavBack() {
            this.getRouter().navTo("groups");
        },

        onEdit() {
            this.openEntityDialog({
                fragment: "GroupDialog",
                title: this.getText("editGroup"),
                context: this.getView().getBindingContext()
            });
        },

        onSearchLinkedUsers(oEvent) {
            this.searchTable("linkedUsersTable", ["user/name", "user/email"], oEvent.getParameter("newValue"));
        },

        onSearchLinkedIntegrations(oEvent) {
            this.searchTable("linkedIntegrationsTable", ["integration/description", "integration/source", "integration/target"],
                oEvent.getParameter("newValue"));
        },

        onLinkedIntegrationPress(oEvent) {
            this.getRouter().navTo("integrationDetail", { id: oEvent.getSource().getBindingContext().getProperty("integration/ID") });
        },

        onLinkUsers() {
            this._openLinkDialog("users");
        },

        onLinkIntegrations() {
            this._openLinkDialog("integrations");
        },

        onUnlinkUsers() {
            this._confirmUnlink("users");
        },

        onUnlinkIntegrations() {
            this._confirmUnlink("integrations");
        },

        /* ---------- link dialog ---------- */

        async _openLinkDialog(sKind) {
            this._oLinkKind = LINK_KINDS[sKind];
            this._mLinkDialogs ??= {};
            this._mLinkDialogs[sKind] ??= await this.loadFragment({
                name: `com.hrpath.log.monitor.cockpit.fragment.${this._oLinkKind.fragment}`
            });
            const oDialog = this._mLinkDialogs[sKind];

            // Fresh request on every open, so entities linked in the meantime are not offered
            const oBinding = oDialog.getBinding("items");
            oBinding.filter(this._getNotLinkedFilter());
            if (oBinding.isSuspended()) oBinding.resume(); else oBinding.refresh();
            oDialog.open();
        },

        _getNotLinkedFilter() {
            return new Filter({
                path: this._oLinkKind.navigationProperty,
                operator: FilterOperator.All,
                variable: "link",
                condition: new Filter("link/group_ID", FilterOperator.NE, this._sGroupId)
            });
        },

        onLinkDialogSearch(oEvent) {
            const sQuery = (oEvent.getParameter("value") ?? "").trim();
            const aFilters = [this._getNotLinkedFilter()];
            if (sQuery) {
                aFilters.push(new Filter({
                    filters: this._oLinkKind.searchPaths.map(sPath => new Filter({
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

        async onLinkDialogConfirm(oEvent) {
            const aContexts = oEvent.getParameter("selectedContexts") ?? [];
            if (aContexts.length === 0) return;

            const { foreignKey, linkEntitySet, tableId, linkedToastKey } = this._oLinkKind;
            const oModel = this.getView().getModel();
            const oLinkBinding = oModel.bindList(linkEntitySet, undefined, [], [], { $$updateGroupId: LINK_GROUP });
            aContexts.forEach(oContext => {
                oLinkBinding.create({ [foreignKey]: oContext.getProperty("ID"), group_ID: this._sGroupId })
                    .created().catch(() => { /* discarded by resetChanges below */ });
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

        _confirmUnlink(sKind) {
            const { tableId, unlinkTextKey, unlinkedToastKey } = LINK_KINDS[sKind];
            const iCount = this.byId(tableId).getSelectedContexts().length;
            const sGroup = this.getView().getBindingContext().getProperty("description");
            this.confirmDelete({
                tableId,
                title: this.getText("unlink"),
                text: `${this.getCountText(unlinkTextKey, iCount, [sGroup])}\n\n${this.getText(`${unlinkTextKey}Info`)}`,
                toastKey: unlinkedToastKey,
                confirmText: this.getText("unlink")
            });
        }
    });
});
