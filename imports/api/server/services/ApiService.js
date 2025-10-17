import { logger as baseLogger } from "../utils/serverUtils";
import axios from "axios";
import { WebApp } from "meteor/webapp";
import { Meteor } from "meteor/meteor";
import Server from "../Server";
import { tmq as api } from "../../common/static_codegen/tmq/api";
import Business from "../classes/dbTemplates/Business";
import Channels from "../classes/dbTemplates/Channels";
import Consumers from "../classes/dbTemplates/Consumers";
import Inbox from "../classes/dbTemplates/Inbox";

const logger = baseLogger.child({ service: 'services/ApiService.js' });

/**
 * Centralized API Service bridging proto calls to existing HTTP endpoints
 * Implements:
 *  - SendMessage: POST /api/b/:slug/channels/messages/outbound
 *  - FetchSuggestions: POST to external suggestions URL with Basic auth
 */
export default {
    /**
     * @param {{request: api.SendMessageRequest}} param0
     * @param {(err: any, response: api.SendMessageResponse)=>void} callback
     */
    async SendMessage({ request }, callback) {
        try {
            const response = new api.SendMessageResponse();
            const businessId = request.business_id || request.businessId;
            const type = request.type || "chat";
            const text = request.text || "";
            const meta = request.meta || {};
            const inboxId = request.inbox_id || request.inboxId;

            if (!businessId) {
                response.success = false;
                response.error_message = "business_id is required";
                return callback(null, response);
            }

            // Resolve business slug by id
            const biz = await Business.findById(businessId);
            if (!biz || !biz.slug) {
                response.success = false;
                response.error_message = "business not found";
                return callback(null, response);
            }
            const slug = biz.slug;

            // Resolve channel "from" by business and type
            const channels = await Channels.findByBusinessId(businessId);
            const channelForType = Array.isArray(channels) ? channels.find(c => c.type === type) : null;
            const from = channelForType?.identifier || request.from || "";

            if (!from) {
                response.success = false;
                response.error_message = "Missing 'from' identifier (channel not configured for this type)";
                return callback(null, response);
            }

            // Derive destination 'to' from inbox -> consumer -> externalId
            if (!inboxId) {
                response.success = false;
                response.error_message = "inbox_id is required";
                return callback(null, response);
            }
            const inbox = await Inbox.findById(inboxId);
            if (!inbox || !inbox.consumerId) {
                response.success = false;
                response.error_message = "inbox not found or missing consumerId";
                return callback(null, response);
            }
            const consumer = await Consumers.findById(inbox.consumerId);
            if (!consumer || !consumer.externalId) {
                response.success = false;
                response.error_message = "consumer not found or missing externalId";
                return callback(null, response);
            }
            const to = consumer.externalId;

            logger.debug('POST outbound derived params', { slug, type, from, to });

            const payload = {
                // type,
                // from,
                // to,
                // text,
                // meta
                text,
                provider: channelForType.provider || "smarties",
                type,
                identifier: to || 'smarty-chat-main',
                messageId: crypto.randomUUID(),
                from: channelForType.identifier,
                to,
                slug,
                meta
            };

            const baseUrl = (Server.Config && (Server.Config.host || (Server.Config.app && Server.Config.app.url))) || (typeof Meteor.absoluteUrl === 'function' ? Meteor.absoluteUrl().replace(/\/$/, '') : 'http://127.0.0.1:3000');
            const url = `${baseUrl}/api/b/${slug}/channels/messages/outbound`;
            logger.debug('POST outbound request', { url, payload });
            const res = await axios.post(url, payload, { headers: { "Content-Type": "application/json" }, timeout: 15000, validateStatus: () => true });
            logger.debug('Outbound response', { status: res.status, body: res.data || {} });

            response.success = Boolean(res?.data?.ok || res?.status === 200);
            response.error_message = res?.data?.message || "";
            callback(null, response);
        } catch (error) {
            const response = new api.SendMessageResponse();
            response.success = false;
            try { logger.error('Outbound error', { error: error?.message || String(error), resp: error?.response?.data || {} }); } catch (_) { }
            response.error_message = error?.message || "Send failed";
            callback(null, response);
        }
    },

    /**
     * @param {{request: api.FetchSuggestionsRequest}} param0
     * @param {(err: any, response: api.FetchSuggestionsResponse)=>void} callback
     */
    async FetchSuggestions({ request }, callback) {
        try {
            const response = new api.FetchSuggestionsResponse();
            const { url, username, password, query } = request;
            const min = request.min || 1;
            const max = request.max || 5;
            if (!url) {
                response.success = false;
                response.error_message = "url is required";
                return callback(null, response);
            }
            const auth = username || password ? Buffer.from(`${username || ""}:${password || ""}`).toString("base64") : null;
            const res = await axios.post(url, { query, min, max }, {
                headers: {
                    "Content-Type": "application/json",
                    ...(auth ? { Authorization: `Basic ${auth}` } : {})
                }
            });
            const suggestions = res?.data?.output?.suggestions || [];
            response.success = true;
            response.error_message = "";
            response.suggestions = suggestions;
            callback(null, response);
        } catch (error) {
            const response = new api.FetchSuggestionsResponse();
            response.success = false;
            response.error_message = error?.message || "Fetch suggestions failed";
            response.suggestions = [];
            callback(null, response);
        }
    },
};


