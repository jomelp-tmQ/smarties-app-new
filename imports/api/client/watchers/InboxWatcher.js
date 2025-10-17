import core from "@tmq-dev-ph/tmq-dev-core-client";
import { Meteor } from "meteor/meteor";
import { Watcher2 } from "../Watcher2";
import Client from "../Client";
import { toast } from 'sonner';
import { TOAST_STYLE } from "../../common/const";
import {
    collectionManager,
    syncManager,
    subscriptionManager
} from 'redisvent-module';
import inboxService from "../../common/static_codegen/tmq/inbox_pb";
import { Any } from "google-protobuf/google/protobuf/any_pb";
import {
    StringValue,
    BoolValue,
    Int32Value,
    DoubleValue,
} from "google-protobuf/google/protobuf/wrappers_pb";
import { ListValue, Value } from "google-protobuf/google/protobuf/struct_pb";
function listValueFromArray(arr) {
    const lv = new ListValue();
    const values = arr.map((item) => {
        const v = new Value();
        if (typeof item === "string") v.setStringValue(item);
        else if (typeof item === "number") v.setNumberValue(item);
        else if (typeof item === "boolean") v.setBoolValue(item);
        else if (item === null) v.setNullValue(0);
        else throw new Error("Only primitive arrays supported in filters");
        return v;
    });
    lv.setValuesList(values);
    return lv;
}

function anyFromJS(val) {
    const any = new Any();

    // NEW: handle arrays (e.g., array of strings)
    if (Array.isArray(val)) {
        const lv = listValueFromArray(val);
        any.setTypeUrl("type.googleapis.com/google.protobuf.ListValue");
        any.setValue(lv.serializeBinary());
        return any;
    }

    if (typeof val === "string") {
        const m = new StringValue();
        m.setValue(val);
        any.setTypeUrl("type.googleapis.com/google.protobuf.StringValue");
        any.setValue(m.serializeBinary());
        return any;
    }

    if (typeof val === "boolean") {
        const m = new BoolValue();
        m.setValue(val);
        any.setTypeUrl("type.googleapis.com/google.protobuf.BoolValue");
        any.setValue(m.serializeBinary());
        return any;
    }

    if (typeof val === "number") {
        if (Number.isInteger(val)) {
            const m = new Int32Value();
            m.setValue(val);
            any.setTypeUrl("type.googleapis.com/google.protobuf.Int32Value");
            any.setValue(m.serializeBinary());
        } else {
            const m = new DoubleValue();
            m.setValue(val);
            any.setTypeUrl("type.googleapis.com/google.protobuf.DoubleValue");
            any.setValue(m.serializeBinary());
        }
        return any;
    }

    throw new Error("Unsupported filter type for Any");
}

// import { Accounts } from 'meteor/tmq:accounts';
const { Adapter, Logger } = core;

Adapter.Meteor = Meteor;

let initialized = false;
let initializationPromise = null;


export const INTERACTION = {
    LOADING_MESSAGE: "loadingMessage",
    LOADING_INBOX: "loadingInbox",
    LOADING_SUGGESTIONS: "loadingSuggestions",
    INBOX: "inbox",
    CURRENT: "currentInteraction",
    MESSAGE_TEXT: 'text',
    MESSAGES: "messages",
    PREDEFINED_ANSWERS: "predefinedAnswers",
    SUGGESTIONS: "suggestions",
    LATEST_INTERACTION: "latestInteraction",
    UNREAD_TOTAL: "inboxUnreadTotal"
};

class InboxWatcher extends Watcher2 {
    #data;
    #businessId = "";
    #spaces = { INBOX: 'inboxapp' };
    #collections = { INBOX: 'inbox' };
    #lastBasis = null;
    #unreadByConsumer = new Map();
    #filters = {};
    constructor(parent) {
        super(parent);
        this.#data = collectionManager.getCollection(this.#spaces.INBOX, this.#collections.INBOX, {
            syncEnabled: false  // We'll handle sync manually
        });
        this.listening = false;
        // initialize reactive aggregates
        this.setValue(INTERACTION.UNREAD_TOTAL, 0);
        Accounts.getCurrentUser().then((user) => {
            this.#businessId = user.businessId;
            this.SessionWatcher.listen(this.#businessId);
        }).catch((error) => {
            // log error on development
        });
    }

    get DB() {
        return this.#data;
    }

    async initialize() {
        const redisVentReady = await this.Parent.RedisVentReadyPromise;
        if (!redisVentReady) {
            toast.error("RedisVent not ready", TOAST_STYLE);
            return;
        }
        Object.values(this.#spaces).forEach(space => {
            if (!syncManager.subscribedSpaces.has(space)) syncManager.subscribeToSpace(space);
        });
    }

    async fetchInbox({ append = false, filters = {}, limit = 20, searchQuery = "" } = {}) {
        this.setValue(INTERACTION.LOADING_INBOX, true);
        try {
            // Backend returns raw inbox docs; we paginate here with page cursor
            const req = new proto.tmq.GetInboxRequest();
            req.setBusinessId(this.#businessId);
            if (typeof searchQuery === "string" && searchQuery.trim().length > 0) {
                filters = { ...filters, keywords: searchQuery.trim() };
            }
            if (filters && typeof filters === "object" && Object.keys(filters).length > 0) {
                const queries = Object.entries(filters).map(([key, value]) => {
                    const q = new proto.tmq.InboxQuery();
                    // Map simple keys to server-expected keys for channel filters
                    let mappedKey = key;
                    if (key === 'type' || key === 'channelType') mappedKey = 'type'; // server maps to channel.type
                    q.setKey(mappedKey);
                    q.setValue(anyFromJS(value));
                    return q;
                });
                req.setQueryList(queries); // <-- pass the array, no undefined vars
            }
            if (proto.tmq.Pagination && typeof req.setPage === 'function') {
                const p = new proto.tmq.Pagination();
                p.setLastBasis(append ? (this.#lastBasis || 0) : 0);
                p.setLimit(Number(limit || 10));
                req.setPage(p);
            }

            const { err, result } = await this.Parent.callFunc(0x2686675b, req);
            if (err) {
                console.error("Error fetching inbox:", err);
                toast.error("Failed to fetch inbox", TOAST_STYLE);
                return;
            }

            const response = proto.tmq.GetInboxResponse.deserializeBinary(result);
            const responseObj = response.toObject();
            if (!responseObj.success) {
                console.error("Server error:", responseObj.errorMessage);
                toast.error(responseObj.errorMessage || "Failed to fetch inbox", TOAST_STYLE);
                return;
            }

            // Client-side merge by consumerId for this page
            const rawList = Array.isArray(responseObj.inboxesList) ? responseObj.inboxesList : [];
            const byConsumer = new Map();
            const localUnread = new Map(); // Map<consumerId, Map<inboxId, unread>>
            const mapConsumerInfo = (c, consumerId) => {
                if (!c || typeof c !== 'object') {
                    return {
                        displayName: `Prospect ${consumerId.substring(0, 6)}`,
                        primaryEmail: '',
                        primaryPhone: '',
                        avatarUrl: '',
                        tagsPreview: [],
                        isVIP: false
                    };
                }
                const displayName = c.displayName || c.display_name || `Prospect ${consumerId.substring(0, 6)}`;
                const primaryEmail = c.primaryEmail || c.primary_email || '';
                const primaryPhone = c.primaryPhone || c.primary_phone || '';
                const avatarUrl = c.avatarUrl || c.avatar_url || '';
                const tagsPreview = c.tagsPreview || c.tags_preview || [];
                const isVIP = c.isVIP || c.is_vip || false;
                return { displayName, primaryEmail, primaryPhone, avatarUrl, tagsPreview, isVIP };
            };
            for (const r of rawList) {
                const consumerId = (typeof r.consumerId === 'object' && r.consumerId && r.consumerId._str)
                    ? r.consumerId._str
                    : String(r.consumerId || '');
                const inboxId = (typeof r.id === 'object' && r.id && r.id._str) ? r.id._str : String(r.id || '');
                const latestAt = Number(r.latestAt || r.createdAt || 0);
                const unread = Number(r.unreadForAssignee || 0);
                const consumerInfo = mapConsumerInfo(r.consumer, consumerId);
                // we have 2 channel id here on merge
                const channel = r.channel ? {
                    id: (r.channel.id?._str ?? r.channel.id ?? ''),
                    identifier: r.channel.identifier ?? '',
                    type: r.channel.type ?? ''
                } : null;
                const channelId = channel?.id || (typeof r.channelId === 'object' && r.channelId?._str ? r.channelId._str : (r.channelId || ''));
                // track per-inbox unread for this consumer
                let m = localUnread.get(consumerId);
                if (!m) { m = new Map(); localUnread.set(consumerId, m); }
                if (inboxId) m.set(inboxId, unread);
                let agg = byConsumer.get(consumerId);
                if (!agg) {
                    agg = {
                        _id: consumerId,
                        businessId: this.#businessId,
                        consumerId,
                        inboxIds: [],
                        channelIds: [],
                        representativeInboxId: inboxId,
                        channel,
                        unreadForAssignee: 0,
                        latestInteractionId: r.latestInteractionId || null,
                        latestSnippet: r.latestSnippet || '',
                        latestAt: latestAt,
                        latestDirection: r.latestDirection || '',
                        createdAt: latestAt,
                        consumer: consumerInfo
                    };
                    byConsumer.set(consumerId, agg);
                }
                if (inboxId) agg.inboxIds.push(inboxId);
                if (channelId) {
                    if (!Array.isArray(agg.channelIds)) agg.channelIds = [];
                    if (!agg.channelIds.includes(channelId)) agg.channelIds.push(channelId);
                }
                agg.unreadForAssignee += unread;
                if (latestAt > agg.latestAt) {
                    agg.representativeInboxId = inboxId || agg.representativeInboxId;
                    agg.latestInteractionId = r.latestInteractionId || agg.latestInteractionId;
                    agg.latestSnippet = r.latestSnippet || '';
                    agg.latestAt = latestAt;
                    agg.latestDirection = r.latestDirection || '';
                    agg.createdAt = latestAt;
                    if (r.consumer) {
                        agg.consumer = mapConsumerInfo(r.consumer, consumerId);
                    }
                    if (channel) {
                        agg.channel = channel;
                    }
                }
            }
            const transformedInbox = Array.from(byConsumer.values()).sort((a, b) => (b.latestAt || 0) - (a.latestAt || 0));

            if (!append) {
                const existing = await this.#data.find({}).fetch();
                for (const doc of existing) await this.#data.remove(doc._id);
            }
            for (const inbox of transformedInbox) {
                if (append) {
                    const existing = await this.#data.findOne({ _id: inbox._id });
                    if (existing) {
                        await this.#data.update(existing._id, inbox);
                        continue;
                    }
                }
                await this.#data.insert(inbox);
            }

            // Save cursor and loaded count/filters
            this.#lastBasis = Number(responseObj.lastBasis || responseObj.last_basis || 0);
            // if (!append && filters && typeof filters === 'object') this.#lastFilters = { ...filters };
            // persist unread maps for consumers in this page
            localUnread.forEach((map, cid) => this.#unreadByConsumer.set(cid, map));
            await this.updateUnreadAggregates();
            this.activateWatch();
        } catch (error) {
            console.error("Exception fetching inbox:", error);
            toast.error("Failed to fetch inbox", TOAST_STYLE);
        } finally {
            this.setValue(INTERACTION.LOADING_INBOX, false);
        }
    }

    async filter(filters = []) {
        delete filters._raw;
        Object.keys(filters).forEach(key => {
            const value = filters[key];
            if (
                value === null ||
                value === "" ||
                (Array.isArray(value) && value.length === 0)
            ) {
                delete filters[key];
            }
        });
        this.#filters = filters;
        await this.fetchInbox({ append: false, filters: this.#filters });
    }

    async inboxListen() {
        const redisVentReady = await this.Parent.RedisVentReadyPromise;
        if (!redisVentReady) {
            toast.error("RedisVent not ready", TOAST_STYLE);
            return;
        }

        if (this.listening) return;
        if (!this.#businessId) {
            toast.warning("Business not set", TOAST_STYLE.WARNING);
            return;
        }
        // Subscribe to real-time changes
        this.subscription = subscriptionManager.listen(
            this.#spaces.INBOX,
            this.#collections.INBOX,
            this.#businessId, // businessId as routingId
            async (change) => {
                // Handle real-time updates by mutating the merged Minimongo collection without full refetch
                switch (change.type) {
                    case 'initial':
                        break;
                    case 'insert':
                        if (!change || !change.data) break;
                        try {
                            const cid = change.data.consumerId?._str ?? change.data.consumerId;
                            const inboxId = change.id || change.data._id?._str || change.data._id;
                            if (!cid) break;
                            const merged = await this.#data.findOne({ _id: cid });
                            const unread = Number(change.data.unreadForAssignee || 0);
                            // Update unread tracking
                            let m = this.#unreadByConsumer.get(cid) || new Map();
                            if (inboxId) m.set(inboxId, unread);
                            this.#unreadByConsumer.set(cid, m);
                            const channel = change.data.channel ? {
                                id: (change.data.channel.id?._str ?? change.data.channel.id ?? ''),
                                identifier: change.data.channel.identifier ?? '',
                                type: change.data.channel.type ?? ''
                            } : null;
                            if (merged) {
                                // Update merged row: union inboxIds, sum unread, refresh preview if latestAt is newer
                                const inboxIds = new Set([...(merged.inboxIds || []), inboxId].filter(Boolean));
                                const channelIds = new Set([...(merged.channelIds || [])].filter(Boolean));
                                const channelIdVal = channel?.id;
                                if (channelIdVal) channelIds.add(channelIdVal);
                                const totalUnread = Array.from(m.values()).reduce((a, b) => a + Number(b || 0), 0);
                                const latestAt = Number(change.data.latestAt || change.data.createdAt || 0);
                                const isNewer = latestAt > Number(merged.latestAt || 0);
                                const update = {
                                    inboxIds: Array.from(inboxIds),
                                    channelIds: Array.from(channelIds),
                                    unreadForAssignee: totalUnread
                                };
                                if (isNewer) {
                                    update.representativeInboxId = inboxId || merged.representativeInboxId;
                                    update.latestInteractionId = change.data.latestInteractionId?._str ?? change.data.latestInteractionId ?? merged.latestInteractionId;
                                    update.latestSnippet = change.data.latestSnippet || '';
                                    update.latestAt = latestAt;
                                    update.latestDirection = change.data.latestDirection || '';
                                    update.createdAt = latestAt;
                                    // consumer preview (if present)
                                    if (change.data.consumer) {
                                        update.consumer = {
                                            displayName: change.data.consumer.displayName || `Prospect ${String(cid).substring(0, 6)}`,
                                            primaryEmail: change.data.consumer.primaryEmail || '',
                                            primaryPhone: change.data.consumer.primaryPhone || '',
                                            avatarUrl: change.data.consumer.avatarUrl || '',
                                            tagsPreview: change.data.consumer.tagsPreview || [],
                                            isVIP: change.data.consumer.isVIP || false,
                                        };
                                    }
                                    if (channel) {
                                        update.channel = channel;
                                    }
                                }
                                await this.#data.update(merged._id, update);
                            } else {
                                // Not in current merged set: create a new merged row for this consumer
                                const latestAt = Number(change.data.latestAt || change.data.createdAt || 0);
                                const consumer = change.data.consumer || {};
                                const newRow = {
                                    _id: cid,
                                    businessId: this.#businessId,
                                    consumerId: cid,
                                    inboxIds: inboxId ? [inboxId] : [],
                                    channelIds: (channel && channel.id) ? [channel.id] : [],
                                    representativeInboxId: inboxId || null,
                                    channel,
                                    unreadForAssignee: Array.from((this.#unreadByConsumer.get(cid) || new Map()).values()).reduce((a, b) => a + Number(b || 0), 0),
                                    latestInteractionId: change.data.latestInteractionId?._str ?? change.data.latestInteractionId ?? null,
                                    latestSnippet: change.data.latestSnippet || '',
                                    latestAt: latestAt,
                                    latestDirection: change.data.latestDirection || '',
                                    createdAt: latestAt,
                                    consumer: {
                                        displayName: consumer.displayName || `Prospect ${String(cid).substring(0, 6)}`,
                                        primaryEmail: consumer.primaryEmail || '',
                                        primaryPhone: consumer.primaryPhone || '',
                                        avatarUrl: consumer.avatarUrl || '',
                                        tagsPreview: consumer.tagsPreview || [],
                                        isVIP: consumer.isVIP || false,
                                    }
                                };
                                await this.#data.insert(newRow);
                            }
                            await this.updateUnreadAggregates();
                            this.activateWatch();
                        } catch (_e) { }
                        break;
                    case 'update':
                        if (!change || !change.data) break;
                        try {
                            let cid = change.data.consumerId?._str ?? change.data.consumerId;
                            const inboxId = change.id || change.data._id?._str || change.data._id;
                            // Some server updates (e.g., UpdateReadCount) may not include consumerId.
                            // Resolve the consumerId by looking up the merged row containing this inboxId.
                            if (!cid && inboxId) {
                                try {
                                    const affected = await this.#data.find({ inboxIds: inboxId }).fetch();
                                    if (Array.isArray(affected) && affected.length > 0) cid = affected[0]._id;
                                } catch (_e) { }
                            }
                            if (!cid) break;
                            const merged = await this.#data.findOne({ _id: cid });
                            const unread = Number(change.data.unreadForAssignee || 0);
                            // Update unread tracking
                            let m = this.#unreadByConsumer.get(cid) || new Map();
                            if (inboxId) m.set(inboxId, unread);
                            this.#unreadByConsumer.set(cid, m);
                            const channel = change.data.channel ? {
                                id: (change.data.channel.id?._str ?? change.data.channel.id ?? ''),
                                identifier: change.data.channel.identifier ?? '',
                                type: change.data.channel.type ?? ''
                            } : null;
                            if (merged) {
                                // Recompute unread total and optionally refresh preview
                                const totalUnread = Array.from(m.values()).reduce((a, b) => a + Number(b || 0), 0);
                                const latestAt = Number(change.data.latestAt || change.data.createdAt || 0);
                                const isNewer = latestAt > Number(merged.latestAt || 0);
                                const update = {
                                    unreadForAssignee: totalUnread
                                };
                                // maintain channelIds set even if not newer
                                const chanIdsSet = new Set([...(merged.channelIds || [])].filter(Boolean));
                                const chanIdVal = channel?.id;
                                if (chanIdVal) chanIdsSet.add(chanIdVal);
                                update.channelIds = Array.from(chanIdsSet);
                                if (isNewer) {
                                    update.representativeInboxId = inboxId || merged.representativeInboxId;
                                    update.latestInteractionId = change.data.latestInteractionId?._str ?? change.data.latestInteractionId ?? merged.latestInteractionId;
                                    update.latestSnippet = change.data.latestSnippet || '';
                                    update.latestAt = latestAt;
                                    update.latestDirection = change.data.latestDirection || '';
                                    update.createdAt = latestAt;
                                    if (change.data.consumer) {
                                        update.consumer = {
                                            displayName: change.data.consumer.displayName || `Prospect ${String(cid).substring(0, 6)}`,
                                            primaryEmail: change.data.consumer.primaryEmail || '',
                                            primaryPhone: change.data.consumer.primaryPhone || '',
                                            avatarUrl: change.data.consumer.avatarUrl || '',
                                            tagsPreview: change.data.consumer.tagsPreview || [],
                                            isVIP: change.data.consumer.isVIP || false,
                                        };
                                    }
                                    if (channel) {
                                        update.channel = channel;
                                    }
                                }
                                await this.#data.update(merged._id, update);
                            } else {
                                // Create merged row if it doesn't exist
                                const latestAt = Number(change.data.latestAt || change.data.createdAt || 0);
                                const consumer = change.data.consumer || {};
                                const newRow = {
                                    _id: cid,
                                    businessId: this.#businessId,
                                    consumerId: cid,
                                    inboxIds: inboxId ? [inboxId] : [],
                                    channelIds: (channel && channel.id) ? [channel.id] : [],
                                    representativeInboxId: inboxId || null,
                                    channel,
                                    unreadForAssignee: Array.from((this.#unreadByConsumer.get(cid) || new Map()).values()).reduce((a, b) => a + Number(b || 0), 0),
                                    latestInteractionId: change.data.latestInteractionId?._str ?? change.data.latestInteractionId ?? null,
                                    latestSnippet: change.data.latestSnippet || '',
                                    latestAt: latestAt,
                                    latestDirection: change.data.latestDirection || '',
                                    createdAt: latestAt,
                                    consumer: {
                                        displayName: consumer.displayName || `Prospect ${String(cid).substring(0, 6)}`,
                                        primaryEmail: consumer.primaryEmail || '',
                                        primaryPhone: consumer.primaryPhone || '',
                                        avatarUrl: consumer.avatarUrl || '',
                                        tagsPreview: consumer.tagsPreview || [],
                                        isVIP: consumer.isVIP || false,
                                    }
                                };
                                await this.#data.insert(newRow);
                            }
                            await this.updateUnreadAggregates();
                            this.activateWatch();
                        } catch (_e) { }
                        break;
                    case 'remove':
                        try {
                            const inboxId = change.id;
                            if (!inboxId) break;
                            // Find any merged row that contains this inboxId and remove it from the inboxIds set, adjust unread
                            const affected = await this.#data.find({ inboxIds: inboxId }).fetch();
                            for (const row of affected) {
                                const cid = row._id;
                                const ids = new Set(row.inboxIds || []);
                                ids.delete(inboxId);
                                // Adjust unread tracking
                                const m = this.#unreadByConsumer.get(cid) || new Map();
                                m.delete(inboxId);
                                this.#unreadByConsumer.set(cid, m);
                                const totalUnread = Array.from(m.values()).reduce((a, b) => a + Number(b || 0), 0);
                                await this.#data.update(cid, { inboxIds: Array.from(ids), unreadForAssignee: totalUnread });
                            }
                            await this.updateUnreadAggregates();
                            this.activateWatch();
                        } catch (_e) { }
                        break;
                }
            }
        );

        this.listening = true;
    }

    async updateUnreadAggregates() {
        try {
            const docs = await this.#data.find({}).fetch();
            let total = 0;
            let count = 0;
            for (const d of docs) {
                const val = Number(d.unreadForAssignee || 0);
                if (val > 0) {
                    total += val;
                    count += 1;
                }
            }
            this.setValue(INTERACTION.UNREAD_TOTAL, total);
        } catch (_e) { }
    }

    get InboxUnreadTotal() {
        return this.getValue(INTERACTION.UNREAD_TOTAL) ?? 0;
    }

    stopListening() {
        if (this.subscription) {
            this.subscription.stop();
            this.listening = false;
        }
    }
}

export default new InboxWatcher(Client);