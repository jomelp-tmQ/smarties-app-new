import { Adapter, Core } from "@tmq-dev-ph/tmq-dev-core-server";
import { logger as baseLogger } from "../utils/serverUtils";
const logger = baseLogger.child({ service: 'services/RequestDetailsService.js' });
import { status } from "@grpc/grpc-js";
import { tmq as request } from "../../common/static_codegen/tmq/requestDetails";
import Server from "../Server";

const { RequestDetailsResponse } = request;

export default {
    fetchRequestDetails: async function ({ request }, callback) {
        const response = new RequestDetailsResponse();
        try {
            const { returnUrl, apiUrl, cancelUrl, checkOutUrl, sessionStatusUrl, portalUrl, stripePublicKey, priceId } = Server.Config.billingInfo;
            const { url, name } = Server.Config.app;
            response.success = true;
            response.returnUrl = `${url}${returnUrl}`;
            response.appUrl = url;
            response.appName = name;
            response.cancelUrl = `${url}${cancelUrl}`;
            response.checkOutUrl = `${apiUrl}${checkOutUrl}`;
            response.sessionStatusUrl = `${apiUrl}${sessionStatusUrl}`;
            response.portalUrl = `${apiUrl}${portalUrl}`;
            response.stripePublicKey = stripePublicKey;
            response.priceId = priceId;
            callback(null, response);
        } catch (err) {
            logger.error('fetchRequestDetails error', { error: err?.message || err });
            callback({
                code: 500,
                message: "Server instance not initialized!",
                status: status.INTERNAL
            });
        }
    }
};