sap.ui.define([], () => {
    "use strict";

    const StatusState = {
        RUNNING: "Success",
        SUCCESS: "Success",
        ERROR:   "Error",
        WARNING: "Warning"
    };

    return {
        statusState(sStatus) {
            return StatusState[sStatus] ?? "None";
        }
    };
});
