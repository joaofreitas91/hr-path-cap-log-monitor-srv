sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel"
], (BaseController, JSONModel) => {
  "use strict";

  return BaseController.extend("com.hrpath.log.monitor.report.controller.App", {
    onInit() {
      const oFCLModel = new JSONModel(this._buildFCLState("OneColumn"));
      this.getOwnerComponent().setModel(oFCLModel, "fcl");

      this.byId("app").attachStateChange((oEvent) => {
        oFCLModel.setData(this._buildFCLState(oEvent.getParameter("layout")));
      });
    },

    _buildFCLState(sLayout) {
      return {
        midColumn: {
          showFullScreen: sLayout === "TwoColumnsMidExpanded",
          showExitFullScreen: sLayout === "MidColumnFullScreen",
          showCloseColumn: sLayout !== "OneColumn"
        }
      };
    }
  });
});