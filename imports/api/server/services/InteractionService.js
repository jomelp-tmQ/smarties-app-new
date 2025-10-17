import { Adapter, Core } from "@tmq-dev-ph/tmq-dev-core-server";
import { logger as baseLogger } from "../utils/serverUtils";
const logger = baseLogger.child({ service: 'services/InteractionService.js' });
import { tmq as common } from "@tmq-dev-ph/tmq-dev-core-client/dist/static_codegen/tmq/common";
import { tmq as interaction } from "../../common/static_codegen/tmq/interaction";
import Interactions, { InteractionsCollection } from "../classes/dbTemplates/Interactions.js";
import { toObjectId, toObjectIdArray } from "../classes/db/helper.js";
import { google as gp } from "../../common/static_codegen/google/protobuf/any";
const { DefaultResponse } = common;
const { GetInteractionsRequest, GetInteractionsResponse, Interaction, InteractionPayload, InteractionAttribute, GetInteractionsByInboxIdsRequest, GetInteractionsByConsumerRequest } = interaction;

export default {
    /**
     * Get interactions by inbox ID
     * @param {Object} call
     * @param {GetInteractionsRequest} call.request
     * @param {function} callback 
     */
    GetInteractions: async function ({ request }, callback) {
        try {
            logger.debug("GetInteractions", { inboxId: request.inbox_id });

            // Validate inbox ID
            if (!request.inbox_id) {
                const response = new GetInteractionsResponse();
                response.success = false;
                response.error_message = "Inbox ID is required";
                response.total_count = 0;
                callback(null, response);
                return;
            }

            // Query interactions by inbox ID
            const interactions = await Interactions.findByInboxId(request.inbox_id);

            // Convert to protobuf format
            const response = new GetInteractionsResponse();
            response.success = true;
            response.total_count = interactions.length;
            response.error_message = "";

            // Transform each interaction to protobuf message
            response.interactions = interactions.map(entry => {
                const interactionMsg = new Interaction();
                interactionMsg.id = entry._id.toString();
                interactionMsg.business_id = entry.businessId ? entry.businessId.toString() : "";
                interactionMsg.inbox_id = entry.inboxId ? entry.inboxId.toString() : "";
                interactionMsg.channel_id = entry.channelId ? entry.channelId.toString() : "";
                interactionMsg.consumer_id = entry.consumerId ? entry.consumerId.toString() : "";
                interactionMsg.user_id = entry.userId ? entry.userId.toString() : "";
                interactionMsg.medium = entry.medium || "";
                interactionMsg.direction = entry.direction || "";
                interactionMsg.status = entry.status || "";
                interactionMsg.timestamp = entry.timestamp || 0;

                // Handle payload
                const payloadMsg = new InteractionPayload();
                if (entry.payload) {
                    payloadMsg.text = entry.payload.text || "";
                    payloadMsg.attachments = entry.payload.attachments || [];
                }
                interactionMsg.payload = payloadMsg;

                // Handle attributes
                if (entry.attributes && Array.isArray(entry.attributes)) {
                    interactionMsg.attributes = entry.attributes.map(attr => {
                        const attrMsg = new InteractionAttribute();
                        attrMsg.key = attr.key || "";
                        const any = new gp.protobuf.Any();
                        // choose a convention; here we mark it as a string-encoded value
                        any.type_url = "type.googleapis.com/string";
                        any.value = Buffer.from(String(attr.value ?? ""), "utf8"); // Uint8Array is fine too
                        attrMsg.value = any;
                        return attrMsg;
                    });
                } else {
                    interactionMsg.attributes = [];
                }

                return interactionMsg;
            });

            logger.debug("GetInteractions result", { count: interactions.length });
            callback(null, response);

        } catch (error) {
            logger.error("GetInteractions error", { error: error.message });

            const response = new GetInteractionsResponse();
            response.success = false;
            response.error_message = error.message || "Internal server error";
            response.total_count = 0;
            callback(null, response);
        }
    }
    ,
    /**
     * Get interactions by multiple inbox IDs
     * @param {Object} call
     * @param {GetInteractionsByInboxIdsRequest} call.request
     * @param {function} callback 
     */
    GetInteractionsByInboxIds: async function ({ request }, callback) {
        try {
            logger.debug("GetInteractionsByInboxIds");

            if (!request.inbox_ids || !Array.isArray(request.inbox_ids) || request.inbox_ids.length === 0) {
                const response = new GetInteractionsResponse();
                response.success = false;
                response.error_message = "inbox_ids is required";
                response.total_count = 0;
                response.interactions = [];
                callback(null, response);
                return;
            }

            const docs = await InteractionsCollection.find(
                { inboxId: { $in: toObjectIdArray(request.inbox_ids) } },
                { sort: { timestamp: 1 } }
            ).fetchAsync();

            const response = new GetInteractionsResponse();
            response.success = true;
            response.total_count = docs.length;
            response.error_message = "";
            response.interactions = docs.map(entry => {
                const interactionMsg = new Interaction();
                interactionMsg.id = entry._id.toString();
                interactionMsg.business_id = entry.businessId ? entry.businessId.toString() : "";
                interactionMsg.inbox_id = entry.inboxId ? entry.inboxId.toString() : "";
                interactionMsg.channel_id = entry.channelId ? entry.channelId.toString() : "";
                interactionMsg.consumer_id = entry.consumerId ? entry.consumerId.toString() : "";
                interactionMsg.user_id = entry.userId ? entry.userId.toString() : "";
                interactionMsg.medium = entry.medium || "";
                interactionMsg.direction = entry.direction || "";
                interactionMsg.status = entry.status || "";
                interactionMsg.timestamp = entry.timestamp || 0;

                const payloadMsg = new InteractionPayload();
                if (entry.payload) {
                    payloadMsg.text = entry.payload.text || "";
                    payloadMsg.attachments = entry.payload.attachments || [];
                }
                interactionMsg.payload = payloadMsg;

                if (entry.attributes && Array.isArray(entry.attributes)) {
                    interactionMsg.attributes = entry.attributes.map(attr => {
                        const attrMsg = new InteractionAttribute();
                        attrMsg.key = attr.key || "";
                        const any = new gp.protobuf.Any();
                        any.type_url = "type.googleapis.com/string";
                        any.value = Buffer.from(String(attr.value ?? ""), "utf8");
                        attrMsg.value = any;
                        return attrMsg;
                    });
                } else {
                    interactionMsg.attributes = [];
                }

                return interactionMsg;
            });

            logger.debug("GetInteractionsByInboxIds result", { count: docs.length });
            callback(null, response);
        } catch (error) {
            logger.error("GetInteractionsByInboxIds error", { error: error.message });
            const response = new GetInteractionsResponse();
            response.success = false;
            response.error_message = error.message || "Internal server error";
            response.total_count = 0;
            response.interactions = [];
            callback(null, response);
        }
    }
    ,
    /**
     * Get interactions by consumer ID within a business
     * @param {Object} call
     * @param {GetInteractionsByConsumerRequest} call.request
     * @param {function} callback 
     */
    GetInteractionsByConsumer: async function ({ request }, callback) {
        try {
            logger.debug("GetInteractionsByConsumer", { businessId: request.business_id, consumerId: request.consumer_id });

            if (!request.business_id || !request.consumer_id) {
                const response = new GetInteractionsResponse();
                response.success = false;
                response.error_message = "business_id and consumer_id are required";
                response.total_count = 0;
                response.interactions = [];
                callback(null, response);
                return;
            }

            // ---- Pagination (optional) ----
            const page = request.page || {};
            const lastBasis = Number(
                (page.last_basis ?? page.lastBasis ?? request.last_basis ?? request.lastBasis ?? 0)
            );
            const limit = Number(
                (page.limit ?? request.limit ?? 50)
            );

            const query = { businessId: toObjectId(request.business_id), consumerId: toObjectId(request.consumer_id), channelId: { $in: toObjectIdArray(request.channel_ids) } };
            if (lastBasis > 0) query.timestamp = { $lt: lastBasis };
            const docs = await InteractionsCollection.find(
                query,
                { sort: { timestamp: -1 }, limit }
            ).fetchAsync();

            const response = new GetInteractionsResponse();
            response.success = true;
            response.total_count = docs.length;
            response.error_message = "";
            response.interactions = docs.map(entry => {
                const interactionMsg = new Interaction();
                interactionMsg.id = entry._id.toString();
                interactionMsg.business_id = entry.businessId ? entry.businessId.toString() : "";
                interactionMsg.inbox_id = entry.inboxId ? entry.inboxId.toString() : "";
                interactionMsg.channel_id = entry.channelId ? entry.channelId.toString() : "";
                interactionMsg.consumer_id = entry.consumerId ? entry.consumerId.toString() : "";
                interactionMsg.user_id = entry.userId ? entry.userId.toString() : "";
                interactionMsg.medium = entry.medium || "";
                interactionMsg.direction = entry.direction || "";
                interactionMsg.status = entry.status || "";
                interactionMsg.timestamp = entry.timestamp || 0;

                const payloadMsg = new InteractionPayload();
                if (entry.payload) {
                    payloadMsg.text = entry.payload.text || "";
                    payloadMsg.attachments = entry.payload.attachments || [];
                }
                interactionMsg.payload = payloadMsg;

                if (entry.attributes && Array.isArray(entry.attributes)) {
                    interactionMsg.attributes = entry.attributes.map(attr => {
                        const attrMsg = new InteractionAttribute();
                        attrMsg.key = attr.key || "";
                        const any = new gp.protobuf.Any();
                        any.type_url = "type.googleapis.com/string";
                        any.value = Buffer.from(String(attr.value ?? ""), "utf8");
                        attrMsg.value = any;
                        return attrMsg;
                    });
                } else {
                    interactionMsg.attributes = [];
                }

                return interactionMsg;
            });

            // Pagination cursor: last doc's timestamp from this page
            response.last_basis = docs.length ? Number(docs[docs.length - 1].timestamp || 0) : 0;

            logger.debug("GetInteractionsByConsumer result", { count: docs.length });
            callback(null, response);
        } catch (error) {
            logger.error("GetInteractionsByConsumer error", { error: error.message });
            const response = new GetInteractionsResponse();
            response.success = false;
            response.error_message = error.message || "Internal server error";
            response.total_count = 0;
            response.interactions = [];
            callback(null, response);
        }
    }
};
