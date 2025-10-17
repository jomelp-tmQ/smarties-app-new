import { Adapter, Core } from "@tmq-dev-ph/tmq-dev-core-server";
import { logger as baseLogger } from "../utils/serverUtils";
const logger = baseLogger.child({ service: 'services/InboxService.js' });
import { tmq as common } from "@tmq-dev-ph/tmq-dev-core-client/dist/static_codegen/tmq/common";
import { tmq as inbox } from "../../common/static_codegen/tmq/inbox";
import Inbox, { InboxCollection } from "../classes/dbTemplates/Inbox.js";
import { rawObjectId, toObjectId } from "../classes/db/helper.js";
import { Mongo, MongoInternals } from 'meteor/mongo';
import { Any } from "google-protobuf/google/protobuf/any_pb.js";
import {
    StringValue,
    BoolValue,
    Int32Value,
    Int64Value,
    DoubleValue,
    FloatValue,
    BytesValue,
} from "google-protobuf/google/protobuf/wrappers_pb.js";
import { Struct, Value, ListValue } from "google-protobuf/google/protobuf/struct_pb.js";

function unpackAnyToJS(anyish) {
    // `anyish` might already be an Any instance, or a plain { type_url, value } object.
    const any = anyish instanceof Any ? anyish : rehydrateAny(anyish);

    const typeUrl = any.getTypeUrl();
    const bytes = any.getValue_asU8();

    switch (typeUrl) {
        case "type.googleapis.com/google.protobuf.StringValue":
            return StringValue.deserializeBinary(bytes).getValue();
        case "type.googleapis.com/google.protobuf.BoolValue":
            return BoolValue.deserializeBinary(bytes).getValue();
        case "type.googleapis.com/google.protobuf.Int32Value":
            return Int32Value.deserializeBinary(bytes).getValue();
        case "type.googleapis.com/google.protobuf.Int64Value":
            // Often provided as string in JS to avoid precision loss
            return Int64Value.deserializeBinary(bytes).getValue();
        case "type.googleapis.com/google.protobuf.DoubleValue":
            return DoubleValue.deserializeBinary(bytes).getValue();
        case "type.googleapis.com/google.protobuf.FloatValue":
            return FloatValue.deserializeBinary(bytes).getValue();
        case "type.googleapis.com/google.protobuf.BytesValue":
            return BytesValue.deserializeBinary(bytes).getValue_asU8();

        // Optional: if you decide to send complex JSON in a single filter using Struct
        case "type.googleapis.com/google.protobuf.Struct":
            return structToPlain(Struct.deserializeBinary(bytes));
        case "type.googleapis.com/google.protobuf.Value":
            return valueToPlain(Value.deserializeBinary(bytes));
        case "type.googleapis.com/google.protobuf.ListValue":
            return listToPlain(ListValue.deserializeBinary(bytes));

        default:
            throw new Error(`Unsupported Any type_url: ${typeUrl}`);
    }
}

function rehydrateAny(obj) {
    const a = new Any();
    // handle both snake_case and camelCase
    a.setTypeUrl(obj.type_url || obj.typeUrl || "");
    // obj.value could be Buffer or Uint8Array — both work
    a.setValue(obj.value);
    return a;
}

// Struct/Value helpers (only needed if you use Struct)
function structToPlain(structMsg) {
    const out = {};
    structMsg.getFieldsMap().forEach((val, key) => (out[key] = valueToPlain(val)));
    return out;
}
function listToPlain(listMsg) {
    return listMsg.getValuesList().map(valueToPlain);
}
function valueToPlain(valueMsg) {
    switch (valueMsg.getKindCase()) {
        case Value.KindCase.NULL_VALUE: return null;
        case Value.KindCase.BOOL_VALUE: return valueMsg.getBoolValue();
        case Value.KindCase.NUMBER_VALUE: return valueMsg.getNumberValue();
        case Value.KindCase.STRING_VALUE: return valueMsg.getStringValue();
        case Value.KindCase.STRUCT_VALUE: return structToPlain(valueMsg.getStructValue());
        case Value.KindCase.LIST_VALUE: return listToPlain(valueMsg.getListValue());
        default: return undefined;
    }
}
// import { ObjectId } from 'mongodb';

const { GetInboxRequest,
    GetInboxResponse,
    Inbox: InboxMsg,
    GetMergedInboxRequest,
    GetMergedInboxResponse,
    MergedInbox,
    Consumer: ConsumerMsg,
    ReadCountResponse,
} = inbox;

export default {
    /**
     * Get inbox entries by business ID
     * @param {Object} call
     * @param {GetInboxRequest} call.request
     * @param {function} callback 
     */
    GetInbox: async function ({ request }, callback) {
        try {
            logger.debug("GetInbox", { businessId: request.business_id });
            let query = {};
            if (Array.isArray(request.query) && request.query.length > 0) {
                query = request.query.reduce((acc, q) => {
                    acc[q.key] = unpackAnyToJS(q.value);
                    return acc;
                }, {});
            }

            // Validate business ID
            if (!request.business_id) {
                const response = new GetInboxResponse();
                response.success = false;
                response.error_message = "Business ID is required";
                response.total_count = 0;
                callback(null, response);
                return;
            }

            const { ServerInstance } = Adapter;
            if (!ServerInstance) {
                callback({
                    code: 500,
                    message: "Server instance not initialized!",
                    status: status.INTERNAL
                });
            }

            // Pagination inputs (supports both snake_case and camelCase)
            const page = request.page || {};
            const lastBasis = Number(
                (page.last_basis ?? page.lastBasis ?? request.last_basis ?? request.lastBasis ?? 0)
            );
            const limit = Math.max(1, Number((page.limit ?? request.limit ?? 50)));

            // Build match with optional filters from request.query
            const q = query || {};
            // transform query.key if the value is array of strings to $in
            Object.keys(q).forEach(key => {
                if (Array.isArray(q[key])) {
                    // if q[key == type make it channel.type
                    if (key === 'type') {
                        q['channel.type'] = { $in: q[key] };
                        delete q[key];
                    } else if (key === 'statuses') {
                        const statuses = q[key]; // ["read", "unread"]
                        const conditions = [];
                        if (statuses.includes("read")) conditions.push({ unreadForAssignee: { $eq: 0 } });
                        if (statuses.includes("unread")) conditions.push({ unreadForAssignee: { $gt: 0 } });
                        if (conditions.length === 1) Object.assign(q, conditions[0]);
                        else if (conditions.length > 1) q.$or = conditions;
                        delete q[key];
                    }

                    else {
                        q[key] = { $in: q[key] };
                    }
                }
            });
            // Map friendly filters to nested paths
            const mapped = { ...q };
            // Allow filtering by channel.type and channel.identifier via simple keys
            // if (typeof q.type === 'string') { mapped['channel.type'] = q.type; delete mapped.type; }
            // if (typeof q.channelType === 'string') { mapped['channel.type'] = q.channelType; delete mapped.channelType; }
            // if (typeof q.identifier === 'string') { mapped['channel.identifier'] = q.identifier; delete mapped.identifier; }
            // if (typeof q.channelId === 'string') { try { mapped['channel.id'] = new rawObjectId(q.channelId); delete mapped.channelId; } catch (_) { } }
            const match = { businessId: new rawObjectId(request.business_id), ...mapped };
            const keywords = (q.keywords ?? q.keyWords ?? '').trim();
            if (keywords) {
                match.keywords = { $elemMatch: { $regex: keywords, $options: 'i' } };
            }
            const indexBasis = 'latestAt';
            if (lastBasis > 0) match[indexBasis] = { $lt: lastBasis };
            // Use rawCollection and aggregation for efficiency and future flexibility
            const col = InboxCollection.rawCollection();
            const pipeline = [
                { $match: match },
                { $sort: { [indexBasis]: -1 } },
                { $limit: limit },
            ];
            const inboxEntries = await col.aggregate(pipeline, { allowDiskUse: true }).toArray();
            // Convert to protobuf format
            const response = new GetInboxResponse();
            response.success = true;
            response.total_count = inboxEntries.length;
            response.error_message = "";

            if (inboxEntries.length === 0) {
                response.inboxes = [];
            } else {
                // Transform each inbox entry to protobuf message
                response.inboxes = inboxEntries.map(entry => {
                    const inboxMsg = new InboxMsg();
                    inboxMsg.id = entry._id && entry._id._str ? entry._id._str : String(entry._id);
                    inboxMsg.business_id = entry.businessId && entry.businessId._str ? entry.businessId._str : (entry.businessId ? String(entry.businessId) : "");
                    inboxMsg.consumer_id = entry.consumerId && entry.consumerId._str ? entry.consumerId._str : (entry.consumerId ? String(entry.consumerId) : "");
                    inboxMsg.channel_id = (entry.channel && entry.channel.id && entry.channel.id._str) ? entry.channel.id._str : (entry.channel && entry.channel.id ? String(entry.channel.id) : "");
                    // Populate channel nested message if available
                    try {
                        if (entry.channel && (entry.channel.id || entry.channel.identifier || entry.channel.type)) {
                            const ch = new inbox.Channel();
                            if (entry.channel.id) ch.id = entry.channel.id._str ? entry.channel.id._str : String(entry.channel.id);
                            if (entry.channel.identifier) ch.identifier = String(entry.channel.identifier);
                            if (entry.channel.type) ch.type = String(entry.channel.type);
                            inboxMsg.channel = ch;
                        }
                    } catch (_) { }
                    inboxMsg.status = entry.status || "";
                    inboxMsg.assignee_id = entry.assigneeId && entry.assigneeId._str ? entry.assigneeId._str : (entry.assigneeId ? String(entry.assigneeId) : "");
                    inboxMsg.locked_at = entry.lockedAt || 0;
                    inboxMsg.unread_for_assignee = entry.unreadForAssignee || 0;
                    inboxMsg.latest_interaction_id = entry.latestInteractionId && entry.latestInteractionId._str ? entry.latestInteractionId._str : (entry.latestInteractionId ? String(entry.latestInteractionId) : "");
                    inboxMsg.latest_snippet = entry.latestSnippet || "";
                    inboxMsg.latest_at = entry.latestAt || 0;
                    inboxMsg.latest_direction = entry.latestDirection || "";
                    inboxMsg.created_at = entry.createdAt || 0;
                    // Optional consumer preview (align with MergedInbox)
                    try {
                        if (entry.consumer && typeof entry.consumer === 'object') {
                            const c = new ConsumerMsg();
                            c.display_name = entry.consumer.displayName || entry.consumer.display_name || "Prospect";
                            c.primary_email = entry.consumer.primaryEmail || entry.consumer.primary_email || "";
                            c.primary_phone = entry.consumer.primaryPhone || entry.consumer.primary_phone || "";
                            c.avatar_url = entry.consumer.avatarUrl || entry.consumer.avatar_url || "";
                            c.tags_preview = entry.consumer.tagsPreview || entry.consumer.tags_preview || [];
                            c.is_vip = entry.consumer.isVIP || entry.consumer.is_vip || false;
                            inboxMsg.consumer = c;
                        }
                    } catch (_e) { }
                    return inboxMsg;
                });
            }
            // ServerInstance.RedisVentServer.triggers.insert('inboxapp', 'inbox', request.business_id, inboxEntries, { uniqueId: 'user12' });

            // Pagination cursor: last doc's latestAt from this page
            response.last_basis = inboxEntries.length ? Number((inboxEntries[inboxEntries.length - 1].latestAt) || 0) : 0;

            logger.debug("GetInbox result", { count: inboxEntries.length, limit, lastBasis });
            callback(null, response);

        } catch (error) {
            logger.error("GetInbox error", { error: error.message });

            const response = new GetInboxResponse();
            response.success = false;
            response.error_message = error.message || "Internal server error";
            response.total_count = 0;
            callback(null, response);
        }
    }
    ,
    /**
     * Get merged inbox entries grouped by consumer ID for a business
     * @param {Object} call
     * @param {GetMergedInboxRequest} call.request
     * @param {function} callback 
     */
    GetMergedInbox: async function ({ request }, callback) {
        try {
            logger.debug("GetMergedInbox", { businessId: request.business_id });

            if (!request.business_id) {
                const response = new GetMergedInboxResponse();
                response.success = false;
                response.error_message = "Business ID is required";
                response.total_count = 0;
                response.inboxes = [];
                callback(null, response);
                return;
            }

            const objectId = new rawObjectId(request.business_id);

            // ---- Extract query & page safely ----
            const q = request.query || {};
            const page = request.page || {};

            // page.last_basis might be snake_case (server) while client uses camelCase (toObject)
            const lastBasis =
                Number(
                    (page.last_basis ?? page.lastBasis ?? request.last_basis ?? request.lastBasis ?? 0)
                );

            const limit =
                Number(
                    (page.limit ?? request.limit ?? 2)
                );

            // ---- Build Match ----
            const match = { businessId: objectId };

            // support both snake_case and camelCase for query fields
            const status = q.status ?? q.Status;
            const assigneeId = q.assignee_id ?? q.assigneeId;
            const keywords = (q.keywords ?? q.keyWords ?? "").trim();

            if (status) match.status = status;
            if (assigneeId) match.assigneeId = toObjectId(assigneeId);
            if (keywords) {
                match.keywords = { $elemMatch: { $regex: keywords, $options: "i" } };
            }

            const indexBasis = "latestAt";
            if (lastBasis > 0) {
                match[indexBasis] = { $lt: lastBasis }; // fetch older than the cursor
            }

            // Group by consumerId first to collect ALL inboxIds per consumer,
            // keep the latest document for sorting and preview fields,
            // then paginate by latestAt across consumers.
            const pipeline = [
                { $match: match },
                { $sort: { [indexBasis]: -1 } },
                {
                    $group: {
                        _id: "$consumerId",
                        inboxIds: { $addToSet: "$_id" },
                        totalUnread: { $sum: { $ifNull: ["$unreadForAssignee", 0] } },
                        latestDoc: { $first: "$$ROOT" }
                    }
                },
                { $sort: { "latestDoc.latestAt": -1 } },
                { $limit: limit }
            ];

            // native driver
            const col = InboxCollection.rawCollection();
            const groups = await col.aggregate(pipeline, { allowDiskUse: true }).toArray();

            // ---- Build Response ----
            const response = new GetMergedInboxResponse();
            response.success = true;
            response.error_message = "";
            response.total_count = groups.length;
            response.inboxes = groups.map(g => {
                const latest = g.latestDoc || {};
                const merged = new MergedInbox();
                merged.consumer_id = g._id && g._id._str ? g._id._str : (g._id ? String(g._id) : "");
                merged.inbox_ids = (g.inboxIds || []).map(id => (id && id._str) ? id._str : String(id));
                merged.representative_inbox_id = latest._id && latest._id._str ? latest._id._str : (latest._id ? String(latest._id) : "");
                merged.latest_interaction_id = latest.latestInteractionId && latest.latestInteractionId._str ? latest.latestInteractionId._str : (latest.latestInteractionId || "");
                merged.latest_snippet = latest.latestSnippet || "";
                merged.latest_at = typeof latest.latestAt === "number" ? latest.latestAt : (latest.createdAt || 0);
                merged.latest_direction = latest.latestDirection || "";
                merged.total_unread_for_assignee = g.totalUnread || 0;
                // Add consumer information (mock data for now - you can replace with actual consumer lookup)
                const consumer = new ConsumerMsg();
                consumer.display_name = latest.consumer?.displayName || "Prospect";
                consumer.primary_email = latest.consumer?.primaryEmail || "";
                consumer.primary_phone = latest.consumer?.primaryPhone || "";
                consumer.avatar_url = latest.consumer?.avatarUrl || "";
                consumer.tags_preview = latest.consumer?.tagsPreview || [];
                consumer.is_vip = latest.consumer?.isVIP || false;
                merged.consumer = consumer;

                return merged;
            });

            // Pagination cursor: last group's latestAt
            response.last_basis = groups.length ? Number((groups[groups.length - 1].latestDoc?.latestAt) || 0) : 0;

            logger.debug("GetMergedInbox groups", { groups: groups ? groups.length : 0 });
            callback(null, response);

        } catch (error) {
            logger.error("GetMergedInbox error", { error: error.message });
            const response = new GetMergedInboxResponse();
            response.success = false;
            response.error_message = error.message || "Internal server error";
            response.total_count = 0;
            response.inboxes = [];
            callback(null, response);
        }
    },
    UpdateReadCount: async function ({ request }, callback) {
        try {
            const rawInboxIds = Array.isArray(request.inbox_ids) ? request.inbox_ids : [];
            const ids = rawInboxIds
                .map((item) => item && (item.inbox_ids || item.inboxId || item.inbox_id))
                .filter((v) => typeof v === 'string' && v.length > 0);

            logger.debug("UpdateReadCount", { inboxIds: ids });

            const { ServerInstance } = Adapter;
            if (!ServerInstance) {
                callback({
                    code: 500,
                    message: "Server instance not initialized!",
                    status: status.INTERNAL
                });
            }
            let updatedCount = 0;
            for (const id of ids) {
                try {
                    const doc = await Inbox.findById(id);
                    if (doc) {
                        await doc.markAsRead();
                        updatedCount += 1;
                        ServerInstance.RedisVentServer.triggers.update('inboxapp', 'inbox', request.business_id, id, { unreadForAssignee: 0 });
                    }
                } catch (e) {
                    logger.error("UpdateReadCount mark read failed", { id, error: e.message });
                }
            }

            const response = new ReadCountResponse();
            response.success = true;
            response.message = `Read count updated for ${updatedCount} inbox(es)`;
            callback(null, response);

        } catch (error) {
            logger.error("UpdateReadCount error", { error: error.message });
            const response = new ReadCountResponse();
            response.success = false;
            response.message = error.message || "Failed to update read counts";
            callback(null, response);
        }
    }
};
