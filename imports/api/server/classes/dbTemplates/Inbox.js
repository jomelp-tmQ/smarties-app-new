import { Mongo } from 'meteor/mongo';
import { toObjectId, toObjectIdArray } from '../db/helper';
import moment from 'moment';

export const InboxCollection = new Mongo.Collection('inbox', {
    idGeneration: 'MONGO', // keeps _id as ObjectId to match your schemas
});

export default class Inbox {
    constructor(data = {}) {
        this._id = data._id ?? null;
        this.businessId = data.businessId ?? null;
        this.consumerId = data.consumerId ?? null;
        // Store nested channel object only (id, identifier, type)
        this.channel = data.channel ?? null;
        this.status = data.status ?? null;
        this.assigneeId = data.assigneeId ?? null;
        this.lockedAt = data.lockedAt ?? undefined;
        this.latestInteractionId = data.latestInteractionId ?? null;
        this.latestSnippet = data.latestSnippet ?? null;
        this.keywords = Array.isArray(data.keywords) ? data.keywords : null;
        this.latestAt = data.latestAt ?? undefined;
        this.latestDirection = data.latestDirection ?? null;
        this.createdAt = data.createdAt ?? moment().valueOf();
        this.consumer = data.consumer ?? null;
        if (data.unreadForAssignee) {
            if (typeof data.unreadForAssignee !== 'number') {
                this.unreadForAssignee = 0;
            } else {
                this.unreadForAssignee = data.unreadForAssignee;
            }
        } else {
            this.unreadForAssignee = 0.0;
        }
    }

    // Validate data according to schema
    validate() {
        // Type validation based on schema
        if (this.status !== null && typeof this.status !== 'string') {
            throw new Meteor.Error('validation-error', 'Status must be a string');
        }

        if (this.latestSnippet !== null && typeof this.latestSnippet !== 'string') {
            throw new Meteor.Error('validation-error', 'Latest snippet must be a string');
        }

        if (this.latestDirection !== null && typeof this.latestDirection !== 'string') {
            throw new Meteor.Error('validation-error', 'Latest direction must be a string');
        }

        if (this.lockedAt !== undefined && typeof this.lockedAt !== 'number') {
            throw new Meteor.Error('validation-error', 'LockedAt must be a number');
        }

        if (typeof this.unreadForAssignee !== 'number') {
            throw new Meteor.Error('validation-error', 'UnreadForAssignee must be a number');
        }

        if (this.latestAt !== undefined && typeof this.latestAt !== 'number') {
            throw new Meteor.Error('validation-error', 'LatestAt must be a number');
        }

        if (typeof this.createdAt !== 'number') {
            throw new Meteor.Error('validation-error', 'CreatedAt must be a number');
        }

        return true;
    }

    async save() {
        this.validate();
        const doc = {
            createdAt: this.createdAt,
        };

        // Only include fields if they have valid values matching schema types
        if (this.businessId) {
            doc.businessId = toObjectId(this.businessId);
        }
        if (this.consumerId) {
            doc.consumerId = toObjectId(this.consumerId);
        }
        // Write nested channel object per new schema
        if (this.channel && (this.channel.id || this.channel.identifier || this.channel.type)) {
            const chan = {};
            if (this.channel.id) chan.id = toObjectId(this.channel.id);
            if (this.channel.identifier) chan.identifier = this.channel.identifier;
            if (this.channel.type) chan.type = this.channel.type;
            doc.channel = chan;
        }
        if (this.status) {
            doc.status = this.status;
        }
        if (this.assigneeId) {
            doc.assigneeId = toObjectId(this.assigneeId);
        }
        if (typeof this.unreadForAssignee === 'number') {
            doc.unreadForAssignee = this.unreadForAssignee;
        }
        if (this.latestInteractionId) {
            doc.latestInteractionId = toObjectId(this.latestInteractionId);
        }
        if (this.latestSnippet) {
            doc.latestSnippet = this.latestSnippet;
        }
        // Keywords: include existing + latestSnippet only; trim, lowercase, dedupe
        {
            const base = Array.isArray(this.keywords) ? [...this.keywords] : [];
            if (typeof this.latestSnippet === 'string') base.push(this.latestSnippet);
            const normalized = base
                .filter(v => typeof v === 'string')
                .map(s => s.toLowerCase().trim())
                .filter(s => s.length > 0);
            doc.keywords = Array.from(new Set(normalized));
        }
        if (this.latestDirection) {
            doc.latestDirection = this.latestDirection;
        }
        if (typeof this.lockedAt === 'number') {
            doc.lockedAt = this.lockedAt;
        }
        if (typeof this.latestAt === 'number') {
            doc.latestAt = this.latestAt;
        }
        if (this.consumer) {
            doc.consumer = this.consumer;
        }
        if (this._id) {
            await InboxCollection.updateAsync(toObjectId(this._id), { $set: doc });
            return this._id;
        } else {
            this._id = await InboxCollection.insertAsync(doc);
            return this._id;
        }
    }

    static async findById(id) {
        const data = await InboxCollection.findOneAsync(toObjectId(id));
        return data ? new Inbox(data) : null;
    }

    static async findByBusinessId(businessId, options = {}) {
        const docs = await InboxCollection.find({ businessId: toObjectId(businessId) }, options).fetchAsync();
        return docs.map(d => new Inbox(d));
    }

    static async findByConsumerId(consumerId) {
        const docs = await InboxCollection.find({ consumerId: toObjectId(consumerId) }).fetchAsync();
        return docs.map(d => new Inbox(d));
    }

    static async findByAssigneeId(assigneeId) {
        const docs = await InboxCollection.find({ assigneeId: toObjectId(assigneeId) }).fetchAsync();
        return docs.map(d => new Inbox(d));
    }

    static async findByStatus(status) {
        const docs = await InboxCollection.find({ status }).fetchAsync();
        return docs.map(d => new Inbox(d));
    }

    static async findUnreadForAssignee(assigneeId) {
        const docs = await InboxCollection.find({
            assigneeId: toObjectId(assigneeId),
            unreadForAssignee: { $gt: 0 }
        }).fetchAsync();
        return docs.map(d => new Inbox(d));
    }

    static async findAll() {
        const docs = await InboxCollection.find({}).fetchAsync();
        return docs.map(d => new Inbox(d));
    }

    static async findByBusinessIdAndConsumerIdAndChannelId(businessId, consumerId, channelId) {
        // Use nested channel.id only
        const doc = await InboxCollection.findOneAsync({
            businessId: toObjectId(businessId),
            consumerId: toObjectId(consumerId),
            'channel.id': toObjectId(channelId)
        });
        return doc ? new Inbox(doc) : null;
    }

    static async findByBusinessIdAndChannels(businessId, channels) {
        const docs = await InboxCollection.find({
            businessId: toObjectId(businessId),
            'channel.id': { $in: channels.map(c => toObjectId(c)) }
        }).fetchAsync();
        return docs.map(d => new Inbox(d));
    }

    async update(updateData = {}) {
        if (!this._id) throw new Meteor.Error('bad-request', 'Missing _id');
        Object.assign(this, updateData);
        this.validate();

        const $set = { ...updateData };
        if ('businessId' in $set) $set.businessId = toObjectId($set.businessId);
        if ('consumerId' in $set) $set.consumerId = toObjectId($set.consumerId);
        // Normalize channel updates to nested structure
        if ('channel' in $set) {
            const chan = $set.channel || {};
            const newChan = {};
            if (chan.id) newChan.id = toObjectId(chan.id);
            if (chan.identifier) newChan.identifier = chan.identifier;
            if (chan.type) newChan.type = chan.type;
            $set.channel = newChan;
        }
        if ('assigneeId' in $set) $set.assigneeId = toObjectId($set.assigneeId);
        if ('latestInteractionId' in $set) $set.latestInteractionId = toObjectId($set.latestInteractionId);

        await InboxCollection.updateAsync(toObjectId(this._id), { $set });
        return this._id;
    }

    async assignTo(assigneeId) {
        if (!this._id) {
            throw new Meteor.Error('bad-request', 'Cannot assign inbox item without ID');
        }

        this.assigneeId = toObjectId(assigneeId);

        const result = await InboxCollection.updateAsync(
            toObjectId(this._id),
            { $set: { assigneeId: this.assigneeId } }
        );

        return result;
    }

    async markAsRead() {
        if (!this._id) {
            throw new Meteor.Error('bad-request', 'Cannot mark inbox item as read without ID');
        }

        this.unreadForAssignee = 0;

        const result = await InboxCollection.updateAsync(
            toObjectId(this._id),
            { $set: { unreadForAssignee: 0 } }
        );

        return result;
    }

    async updateLatestInteraction(interactionId, snippet, direction) {
        if (!this._id) {
            throw new Meteor.Error('bad-request', 'Cannot update latest interaction without ID');
        }

        this.latestInteractionId = toObjectId(interactionId);
        this.latestSnippet = snippet;
        this.latestDirection = direction;
        this.latestAt = moment().valueOf();

        const result = await InboxCollection.updateAsync(
            toObjectId(this._id),
            {
                $set: {
                    latestInteractionId: this.latestInteractionId,
                    latestSnippet: this.latestSnippet,
                    latestDirection: this.latestDirection,
                    latestAt: this.latestAt
                },
                $inc: { unreadForAssignee: 1 }
            }
        );

        return result;
    }

    async delete() {
        if (!this._id) throw new Meteor.Error('bad-request', 'Missing _id');
        return InboxCollection.removeAsync(toObjectId(this._id));
    }

    toObject() {
        return {
            _id: this._id,
            businessId: this.businessId,
            consumerId: this.consumerId,
            channel: this.channel,
            status: this.status,
            assigneeId: this.assigneeId,
            lockedAt: this.lockedAt,
            unreadForAssignee: this.unreadForAssignee,
            latestInteractionId: this.latestInteractionId,
            latestSnippet: this.latestSnippet,
            latestAt: this.latestAt,
            latestDirection: this.latestDirection,
            createdAt: this.createdAt,
            consumer: this.consumer
        };
    }
}