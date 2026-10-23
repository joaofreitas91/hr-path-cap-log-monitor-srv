import cds from '@sap/cds';
import { executeHttpRequest } from '@sap-cloud-sdk/http-client';

const LOG = cds.log('reprocessing');

// The POST runs inside the OData request, so it is bounded: a slow endpoint must not hold it open
const TIMEOUT = 20_000;

const endpointMessage = vData => {
    if (!vData) return '';
    if (typeof vData === 'string') return vData.trim();
    return vData.error?.message ?? vData.message ?? JSON.stringify(vData);
};

/**
 * POSTs the whole selection as one JSON array to sPath, resolved through the BTP destination
 * sDestination (locally the `destinations` environment variable). Returns the endpoint's answer,
 * or throws an Error carrying `status` and `reason` — what the endpoint reported — when it
 * refuses, cannot be reached or does not answer in time.
 */
export const triggerReprocessing = async (sDestination, sPath, aItems) => {
    try {
        const { data } = await executeHttpRequest({ destinationName: sDestination }, {
            method: 'post',
            url: sPath,
            data: aItems,
            headers: { 'content-type': 'application/json' },
            timeout: TIMEOUT
        }, { fetchCsrfToken: false });
        LOG.info(`reprocessing of ${aItems.length} record(s) triggered through ${sDestination}${sPath}`);
        return data;
    } catch (oError) {
        const oResponse = oError.response ?? oError.cause?.response;
        const oFailure = new Error(`reprocessing through ${sDestination}${sPath} failed`);
        oFailure.status = oResponse?.status ?? oError.cause?.code ?? oError.code ?? 'ERR';
        oFailure.reason = endpointMessage(oResponse?.data) || oError.cause?.message || oError.message;
        LOG.error(`${oFailure.message}: ${oFailure.status} ${oFailure.reason}`);
        throw oFailure;
    }
};
