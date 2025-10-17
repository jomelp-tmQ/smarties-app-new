import { Mongo } from 'meteor/mongo';
import { toObjectId } from '../db/helper.js';

export const PageViewsCollection = new Mongo.Collection('page_views', {
    idGeneration: 'MONGO',
});

export default class PageViews {
    constructor(data = {}) {
        this._id = data._id ?? null;
        this.sessionId = data.sessionId ?? null;
        this.businessId = data.businessId ?? null;
        this.channelId = data.channelId ?? null;
        this.consumerId = data.consumerId ?? null;
        this.inboxId = data.inboxId ?? null;
        this.type = data.type ?? 'page';
        this.path = data.path ?? null;
        this.title = data.title ?? null;
        this.order = data.order ?? 0;
        this.timestamp = data.timestamp ?? Date.now();
        this.dwellMs = data.dwellMs ?? null;
        this.metadata = data.metadata ?? null;
        this.createdAt = data.createdAt ?? Date.now();
    }
    toObject() {
        const resolveData = (data) => {
            if (data == null) return null;
            if (typeof data === 'object') {
                if (data._str) return data._str;
                if (data._id) {
                    if (data._id._str) return data._id._str;
                    if (data._id._id) return data._id.toString();
                }
            }
            return data;
        };
        return {
            _id: this._id ? this._id._str : null,
            sessionId: resolveData(this.sessionId),
            businessId: resolveData(this.businessId),
            channelId: resolveData(this.channelId),
            consumerId: resolveData(this.consumerId),
            inboxId: resolveData(this.inboxId),
            type: this.type,
            path: this.path,
            title: this.title,
            order: this.order,
            timestamp: this.timestamp,
            dwellMs: this.dwellMs,
            metadata: this.metadata,
            createdAt: this.createdAt,
        };
    }

    async save() {
        const doc = {};

        if (this.timestamp != null) doc.timestamp = this.timestamp;
        if (this.createdAt != null) doc.createdAt = this.createdAt;

        if (this.sessionId != null) doc.sessionId = toObjectId(this.sessionId);
        if (this.businessId != null) doc.businessId = toObjectId(this.businessId);
        if (this.channelId != null) doc.channelId = toObjectId(this.channelId);
        if (this.consumerId != null) doc.consumerId = toObjectId(this.consumerId);
        if (this.inboxId != null) doc.inboxId = toObjectId(this.inboxId);

        if (this.type != null) doc.type = this.type;
        if (this.path != null) doc.path = this.path;
        if (this.title != null) doc.title = this.title;
        if (this.order != null) doc.order = this.order;
        if (this.dwellMs != null) doc.dwellMs = this.dwellMs;
        if (this.metadata != null) doc.metadata = this.metadata;

        if (this._id) {
            await PageViewsCollection.updateAsync(toObjectId(this._id), { $set: doc });
            return this._id;
        } else {
            this._id = await PageViewsCollection.insertAsync(doc);
            return this._id;
        }
    }
    static async findOne(filter, options = {}) {
        const data = await PageViewsCollection.findOneAsync(filter, options);
        return data ? new PageViews(data) : null;
    }
    static async find(filter, options = {}) {
        const data = await PageViewsCollection.find(filter, options).fetchAsync();
        return data ? data.map(item => new PageViews(item)) : [];
    }
}


