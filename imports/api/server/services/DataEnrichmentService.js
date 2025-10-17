import { Adapter } from "@tmq-dev-ph/tmq-dev-core-server";
import { tmq as dataenrichment } from "../../common/static_codegen/tmq/dataenrichment";
import { logger as baseLogger } from "../utils/serverUtils";
const logger = baseLogger.child({ service: 'services/DataEnrichmentService.js' });

const {
    DataEnrichmentRequest,
    DataEnrichmentResponse
} = dataenrichment;

export default {
    /**
     * Returns client-facing configuration from server settings
     * @param {Object} call
     * @param {GetClientConfigRequest} call.request
     * @param {function} callback
     */
    FetchDataEnrichment: async function ({ request }, callback) {
        try {
            logger.debug("FetchDataEnrichment", request);
            const response = new DataEnrichmentResponse();
            callback(null, response);
        } catch (error) {
            logger.error("FetchDataEnrichment error", { error: error.message });
            const response = new GetClientConfigResponse();
            response.success = false;
            response.error_message = error.message || "Internal server error";
            callback(null, response);
        }
    },
    ProcessDataEnrichment: async function ({ request }, callback) {
        try {
            logger.debug("ProcessDataEnrichment", request);
            const response = new DataEnrichmentResponse();

            callback(null, response);
        } catch (error) {
            logger.error("ProcessDataEnrichment error", { error: error.message });
            const response = new DataEnrichmentResponse();
            response.success = false;
            response.error_message = error.message || "Internal server error";
            callback(null, response);
        }
    },
};
