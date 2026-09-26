sap.ui.define([
    "sap/ui/core/mvc/Controller"
], (Controller) => {
    "use strict";

    // Detail routes keep their parent entry selected in the side navigation
    const ROUTE_TO_NAV_KEY = {
        dashboard: "dashboard",
        integrations: "integrations",
        integrationDetail: "integrations",
        users: "users",
        groups: "groups",
        groupDetail: "groups"
    };

    return Controller.extend("com.hrpath.log.monitor.cockpit.controller.App", {
        onInit() {
            this.getOwnerComponent().getRouter().attachRouteMatched(this._onRouteMatched, this);
        },

        _onRouteMatched(oEvent) {
            this.byId("sideNavigation").setSelectedKey(ROUTE_TO_NAV_KEY[oEvent.getParameter("name")]);
        },

        onSideNavItemSelect(oEvent) {
            this.getOwnerComponent().getRouter().navTo(oEvent.getParameter("item").getKey());
        },

        onSideNavToggle() {
            const oToolPage = this.byId("toolPage");
            oToolPage.setSideExpanded(!oToolPage.getSideExpanded());
        }
    });
});
