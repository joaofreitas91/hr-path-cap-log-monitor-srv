sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Messaging",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/type/DateTime",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "com/hrpath/log/monitor/cockpit/model/formatter"
], (Controller, Messaging, Filter, FilterOperator, JSONModel, DateTimeType, MessageBox, MessageToast, formatter) => {
    "use strict";

    const DIALOG_GROUP = "dialog";
    const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    /**
     * Shared list pattern of the cockpit: search with counter, multi-select delete and one
     * create/edit dialog per entity. Table counters are kept in view>/counts/<tableId> and
     * edits run in the deferred "dialog" update group.
     */
    return Controller.extend("com.hrpath.log.monitor.cockpit.controller.BaseController", {
        formatter,
        DateTimeType,

        onInit() {
            this.getView().setModel(new JSONModel({ selected: {}, search: {}, counts: {}, dialogTitle: "" }), "view");
        },

        getRouter() {
            return this.getOwnerComponent().getRouter();
        },

        getText(sKey, aArgs) {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sKey, aArgs);
        },

        // Picks "<key>_one" or "<key>_other" by count and passes the count as {0}
        getCountText(sKey, iCount, aMoreArgs = []) {
            return this.getText(`${sKey}_${iCount === 1 ? "one" : "other"}`, [iCount, ...aMoreArgs]);
        },

        getViewModel() {
            return this.getView().getModel("view");
        },

        /* ---------- list pattern ---------- */

        onTableUpdateFinished(oEvent) {
            const oTable = oEvent.getSource();
            const sTableId = this._localId(oTable);
            const oHeaderContext = oTable.getBinding("items").getHeaderContext();
            this.getViewModel().setProperty(`/counts/${sTableId}`, oHeaderContext.getProperty("$count") ?? 0);
        },

        onTableSelectionChange(oEvent) {
            this._updateSelectedCount(oEvent.getSource());
        },

        searchTable(sTableId, aPaths, sQuery) {
            const sTrimmed = (sQuery ?? "").trim();
            this.getViewModel().setProperty(`/search/${sTableId}`, sTrimmed);
            const aFilters = sTrimmed ? [new Filter({
                filters: aPaths.map(sPath => new Filter({
                    path: sPath,
                    operator: FilterOperator.Contains,
                    value1: sTrimmed,
                    caseSensitive: false
                })),
                and: false
            })] : [];
            this.byId(sTableId).getBinding("items").filter(aFilters);
        },

        /**
         * Binds the view to an entity (edits in the "dialog" group); revisiting the same entity
         * refreshes it instead, so counters and sections reflect changes made on other pages.
         */
        bindViewElement(sPath) {
            const oElementBinding = this.getView().getElementBinding();
            if (oElementBinding?.getPath() === sPath) {
                oElementBinding.refresh();
            } else {
                this.getView().bindElement({ path: sPath, parameters: { $$updateGroupId: DIALOG_GROUP } });
            }
        },

        refreshTable(sTableId) {
            const oBinding = this.byId(sTableId).getBinding("items");
            if (!oBinding?.getContext() && oBinding?.isRelative()) return;
            if (oBinding?.isRelative()) {
                // Relative bindings (e.g. an integration's fields) are refreshed through their parent
                oBinding.getContext().getBinding().refresh();
            } else {
                oBinding?.refresh();
            }
        },

        _updateSelectedCount(oTable) {
            this.getViewModel().setProperty(`/selected/${this._localId(oTable)}`, oTable.getSelectedContexts().length);
        },

        _localId(oControl) {
            return this.getView().getLocalId(oControl.getId());
        },

        /**
         * Asks for confirmation and deletes the selected rows of a table.
         * @param {object} mOptions tableId, title, text, toastKey, confirmText, state ("warning" for destructive cascades)
         */
        confirmDelete({ tableId, title, text, toastKey, confirmText, state }) {
            const oTable = this.byId(tableId);
            const aContexts = oTable.getSelectedContexts();
            if (aContexts.length === 0) return;

            const sConfirm = confirmText ?? this.getText("delete");
            MessageBox[state === "warning" ? "warning" : "confirm"](text, {
                title,
                actions: [sConfirm, MessageBox.Action.CANCEL],
                emphasizedAction: sConfirm,
                onClose: async sAction => {
                    if (sAction !== sConfirm) return;
                    try {
                        await Promise.all(aContexts.map(oContext => oContext.delete("$auto")));
                        MessageToast.show(this.getCountText(toastKey, aContexts.length));
                    } catch (oError) {
                        MessageBox.error(oError.message);
                    }
                    oTable.removeSelections(true);
                    this._updateSelectedCount(oTable);
                }
            });
        },

        /* ---------- create / edit dialog ---------- */

        /**
         * Opens an entity dialog. Without a context a new entity is created in the "dialog" group,
         * under sListPath (absolute, or relative to oParentContext); with a context it is edited.
         */
        async openEntityDialog({ fragment, title, context, listPath, parentContext, initialData, refreshTableId }) {
            this._mDialogs ??= {};
            const bFirstOpen = !this._mDialogs[fragment];
            // Added to the view only after its context is set, so it never binds to the view's entity
            this._mDialogs[fragment] ??= await this.loadFragment({
                name: `com.hrpath.log.monitor.cockpit.fragment.${fragment}`,
                addToDependents: false
            });
            const oDialog = this._mDialogs[fragment];

            let oContext = context;
            if (!oContext) {
                this._oCreateBinding = this.getView().getModel().bindList(listPath, parentContext, [], [], {
                    $$updateGroupId: DIALOG_GROUP
                });
                oContext = this._oCreateBinding.create(initialData ?? {});
                // created() rejects when the dialog is cancelled and the transient context is deleted
                oContext.created().catch(() => { /* creation cancelled */ });
            }

            this._oDialogState = { dialog: oDialog, context: oContext, isNew: !context, refreshTableId };
            this.getViewModel().setProperty("/dialogTitle", title);
            this._getDialogInputs(oDialog).forEach(oInput => oInput.setValueState("None"));
            oDialog.setBindingContext(oContext);
            if (bFirstOpen) this.getView().addDependent(oDialog);
            oDialog.open();
        },

        async onDialogSave() {
            const { dialog: oDialog, context: oContext, isNew, refreshTableId } = this._oDialogState;
            if (!this._validateDialog(oDialog)) {
                MessageToast.show(this.getText("fixFieldsBeforeSave"));
                return;
            }

            const oModel = this.getView().getModel();
            oDialog.setBusy(true);
            try {
                await oModel.submitBatch(DIALOG_GROUP);
                // A failed request stays pending in the group (and created() would not settle)
                if (oModel.hasPendingChanges(DIALOG_GROUP)) throw new Error(this._lastErrorMessage());
                if (isNew) await oContext.created();
            } catch (oError) {
                oDialog.setBusy(false);
                MessageBox.error(oError.message || this._lastErrorMessage());
                return;
            }
            oDialog.setBusy(false);
            oDialog.close();
            MessageToast.show(this.getText("saved"));
            if (refreshTableId) this.refreshTable(refreshTableId);
        },

        onDialogCancel() {
            this._discardDialogChanges();
            this._oDialogState.dialog.close();
        },

        // Escape closes the dialog like "Cancelar"
        onDialogEscape(oPromise) {
            this._discardDialogChanges();
            oPromise.resolve();
        },

        _discardDialogChanges() {
            const { context: oContext, isNew } = this._oDialogState;
            if (isNew) {
                oContext.delete().catch(() => { /* transient context discarded */ });
            } else {
                this.getView().getModel().resetChanges(DIALOG_GROUP);
            }
        },

        /**
         * Refreshes the given tables whenever the route is matched again (e.g. when coming back
         * from a detail page), so counters and rows reflect changes made elsewhere.
         */
        refreshOnRouteMatched(sRoute, aTableIds, fnMatched) {
            this.getRouter().getRoute(sRoute).attachPatternMatched(oEvent => {
                if (this._bRouteMatchedBefore) aTableIds.forEach(sTableId => this.refreshTable(sTableId));
                this._bRouteMatchedBefore = true;
                fnMatched?.(oEvent);
            });
        },

        _getDialogInputs(oDialog) {
            return oDialog.findAggregatedObjects(true, oControl => oControl.isA("sap.m.InputBase"));
        },

        _validateDialog(oDialog) {
            let bValid = true;
            this._getDialogInputs(oDialog).forEach(oInput => {
                const sValue = (oInput.getValue() ?? "").trim();
                let sError = "";
                if (oInput.getRequired() && !sValue) {
                    sError = this.getText("requiredField");
                } else if (oInput.getType?.() === "Email" && sValue && !EMAIL_PATTERN.test(sValue)) {
                    sError = this.getText("invalidEmail");
                }
                oInput.setValueState(sError ? "Error" : "None");
                oInput.setValueStateText(sError);
                bValid &&= !sError;
            });
            return bValid;
        },

        _lastErrorMessage() {
            const aErrors = Messaging.getMessageModel().getData().filter(oMessage => oMessage.getType() === "Error");
            return aErrors.at(-1)?.getMessage() ?? this.getText("saveFailed");
        }
    });
});
