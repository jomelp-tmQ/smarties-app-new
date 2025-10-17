import { tmq as scrapeRequest } from "../../common/static_codegen/tmq/scrapeRequest"; // Adjust the import path to your generated protobuf file
import { Meteor } from "meteor/meteor";
import { status } from "@grpc/grpc-js";
import { ScrapeRequestData } from "../classes/dbTemplates/ScrapeRequest"; // Adjust path to the template file
import { logger as baseLogger } from "../utils/serverUtils";
const logger = baseLogger.child({ service: 'services/ScrapeRequestService.js' });

const { FetchScrapeResponse } = scrapeRequest;

export default {
    /**
     * @param {Object} call
     * @param {scrapeRequest.FetchScrapeRequest} call.request
     * @param {function} callback
     */
    fetchScrapeRequests: async function ({ request }, callback) {
        const response = new FetchScrapeResponse();
        try {
            const userId = request.userId;
            const searchQuery = request.searchQuery;
            const lastBasis = request.lastBasis;
            const page = request.page;


            if (!userId) {
                return callback({
                    code: status.INVALID_ARGUMENT,
                    message: "User ID is required.",
                });
            }

            const scrapeRequests = await ScrapeRequestData.findAllByUserId(userId, searchQuery, lastBasis, page);
            // #[ ]: @szyrelle need to check response.scrapeRequests if existing push returns error scrapeRequests is undefined
            scrapeRequests.forEach(req => {
                response.scrapeRequests.push(req.toProto());
            });
            callback(null, response);
        } catch (error) {
            logger.error("fetchScrapeRequests error", { error: error?.message || error });
            callback({
                code: status.INTERNAL,
                message: "An internal server error occurred while fetching scrape requests.",
            });
        }
    },
};