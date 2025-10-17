import { tmq as common } from "../../common/static_codegen/tmq/common"; // Adjust the import path to your generated protobuf file
import { tmq as crawl } from "../../common/static_codegen/tmq/crawl"; // Adjust the import path to your generated protobuf file
import Business, { BusinessCollection } from "../classes/dbTemplates/Business"; // Adjust path to the template file
import CrawlPages, { CrawlPagesCollection } from "../classes/dbTemplates/CrawlPages"; // Adjust path to the template file
import Crawl, { CrawlCollection } from "../classes/dbTemplates/Crawl"; // Adjust path to the template file
import RedisVentService from "../classes/events/RedisVentService";
import { Meteor } from "meteor/meteor";
import { fetch } from "meteor/fetch";
import { status } from "@grpc/grpc-js";
import Server from "../Server";
import { logger as baseLogger } from "../utils/serverUtils";
const logger = baseLogger.child({ service: 'services/CrawlService.js' });

const { FetchCrawlRequestsResponse, FetchCrawlPagesResponse } = crawl;

export default {
    /**
     * @param {Object} call
     * @param {crawl.CrawlRequest} call.request
     * @param {function} callback
     */
    Crawl: async function ({ request }, callback) {
        const response = new common.DefaultResponse();
        try {
            const userId = request.userId;
            const url = request.url;
            const depth = request.depth;
            const maxPages = request.max_pages;



            if (!userId) {
                return callback({
                    code: status.INVALID_ARGUMENT,
                    message: "User ID is required.",
                });
            }

            const existingCrawl = await Crawl.findByUrl(url, userId);
            if (existingCrawl) {
                return callback({
                    code: status.INVALID_ARGUMENT,
                    message: "Crawl url already existing",
                });
            }

            const user = await Meteor.users.findOneAsync({ _id: userId });
            if (!user) {
                return callback({
                    code: status.INVALID_ARGUMENT,
                    message: "User not found.",
                });
            }
            const businessId = user.businessId;
            const business = await Business.findById(businessId);

            if (!business) {
                return callback({
                    code: status.INVALID_ARGUMENT,
                    message: "Business not found.",
                });
            }

            const webhookUrl = `${Server.Config.app.url}/webhook/${business.slug}/crawl-results`;

            const crawl = new Crawl({
                userId: userId,
                url: url,
                depth: depth,
                maxPages: maxPages
            });
            await crawl.save();
            const requestPayload = {
                id: crawl._id._str,
                url: url,
                businessId: business._id._str,
                webhookUrl: webhookUrl,
                depth: depth,
                max_pages: maxPages
            };

            const endpoint = Server.Config.crawl.serverUrl;
            await fetch(endpoint, {
                method: "POST",
                body: JSON.stringify(requestPayload),
                headers: {
                    "Content-Type": "application/json"
                }
            });

            RedisVentService.Crawl.triggerUpsert("crawl", userId, crawl.toObject());
            response.success = true;
            callback(null, response);
        } catch (error) {
            logger.error("Crawl error", { error: error?.message || error });
            callback({
                code: status.INTERNAL,
                message: "An internal server error occurred while fetching scrape requests.",
            });
        }
    },
    /**
     * 
     * @param {Object} call 
     * @param {crawl.FetchCrawlRequestsRequest} call.request
     * @param {function} callback
     */
    fetchCrawlRequests: async function ({ request }, callback) {
        const response = new FetchCrawlRequestsResponse();
        try {
            const userId = request.userId;
            const searchQuery = request.searchQuery;
            const lastBasis = request.lastBasis;

            const crawlPages = await Crawl.lazyFindAllByUserId(userId, searchQuery, lastBasis);
            response.crawlRequests = crawlPages.map(doc => {
                const proto = new crawl.Crawl({
                    id: doc._id.toString(),
                    created_at: doc.createdAt,
                    updated_at: doc.updatedAt,
                    user_id: doc.userId,
                    status: doc.status,
                    url: doc.url,
                    depth: doc.depth,
                    max_pages: doc.maxPages
                });
                return proto;
            });
            response.lastBasis = crawlPages[crawlPages.length - 1]?.createdAt ?? 0;
            callback(null, response);
        } catch (error) {
            logger.error("fetchCrawlRequests error", { error: error?.message || error });
            callback({
                code: status.INTERNAL,
                message: "An internal server error occurred while fetching scrape requests.",
            });
        }
    },
    /**
     * 
     * @param {Object} call 
     * @param {crawl.FetchCrawlPagesRequest} call.request
     * @param {function} callback
     */
    fetchCrawlPages: async function ({ request }, callback) {
        const response = new FetchCrawlPagesResponse();
        try {
            const userId = request.userId;
            const crawlId = request.crawlId;
            const searchQuery = request.searchQuery;
            const lastBasis = request.lastBasis;

            const crawlPages = await CrawlPages.lazyFindAllByUserId(userId, crawlId, searchQuery, lastBasis);
            response.crawlPages = crawlPages.map(doc => {
                const proto = new crawl.CrawlPages({
                    id: doc._id.toString(),
                    crawl_id: doc.crawlId,
                    file_id: doc.fileId,
                    active: doc.active,
                    user_id: doc.userId,
                    created_at: doc.createdAt,
                    updated_at: doc.updatedAt,
                    url: doc.url,
                    title: doc.title,
                    status: doc.status,
                    error: doc.error,
                });
                return proto;
            });
            response.lastBasis = crawlPages[crawlPages.length - 1]?.createdAt ?? 0;
            callback(null, response);
        } catch (error) {
            logger.error("fetchCrawlPages error", { error: error?.message || error });
            callback({
                code: status.INTERNAL,
                message: "An internal server error occurred while fetching crawl pages.",
            });
        }
    },
    /**
     * 
     * @param {Object} call 
     * @param {crawl.UpdateCrawlPagesRequest} call.request
     * @param {*} callback 
     */
    updateCrawlPages: async function ({ request }, callback) {
        const response = new common.DefaultResponse();
        try {
            const userId = request.userId;
            const id = request.id;
            const active = request.active;
            const crawlPage = await CrawlPages.findById(id);
            if (!crawlPage) {
                return callback({
                    code: status.INVALID_ARGUMENT,
                    message: "Crawl page not found.",
                });
            }
            crawlPage.active = active;
            await crawlPage.save();
            response.success = true;
            RedisVentService.CrawlPages.triggerUpsert("crawlPages", userId, crawlPage.toObject());
            callback(null, response);
        } catch (error) {
            logger.error("updateCrawlPages error", { error: error?.message || error });
            callback({
                code: status.INTERNAL,
                message: "An internal server error occurred while updating crawl pages.",
            });
        }
    }
};