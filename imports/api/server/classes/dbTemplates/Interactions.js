import { Mongo } from 'meteor/mongo';
import { toObjectId, toObjectIdArray } from '../db/helper';

export const InteractionsCollection = new Mongo.Collection('interactions', {
    idGeneration: 'MONGO', // keeps _id as ObjectId to match your schemas
});

export default class Interactions {
    constructor(data = {}) {
        this._id = data._id ?? null;
        this.businessId = data.businessId ?? null;
        this.inboxId = data.inboxId ?? null;
        this.channelId = data.channelId ?? null;
        this.consumerId = data.consumerId ?? null;
        this.userId = data.userId ?? null;
        this.medium = data.medium ?? null;
        this.direction = data.direction ?? null;
        this.payload = data.payload ?? { text: null, attachments: [] };
        this.status = data.status ?? null;
        this.timestamp = data.timestamp ?? Date.now();
        this.attributes = Array.isArray(data.attributes) ? data.attributes : [];
        this.messageId = data.messageId ?? null;
    }

    // Validate data according to schema
    validate() {
        // Type validations based on schema
        if (this.medium !== null && typeof this.medium !== 'string') {
            throw new Meteor.Error('validation-error', 'Medium must be a string');
        }

        if (this.direction !== null && typeof this.direction !== 'string') {
            throw new Meteor.Error('validation-error', 'Direction must be a string');
        }

        if (this.status !== null && typeof this.status !== 'string') {
            throw new Meteor.Error('validation-error', 'Status must be a string');
        }

        if (typeof this.timestamp !== 'number') {
            throw new Meteor.Error('validation-error', 'Timestamp must be a number');
        }

        // Validate payload structure
        if (this.payload && typeof this.payload !== 'object') {
            throw new Meteor.Error('validation-error', 'Payload must be an object');
        }

        if (this.payload && this.payload.text !== null && typeof this.payload.text !== 'string') {
            throw new Meteor.Error('validation-error', 'Payload text must be a string');
        }

        if (this.payload && this.payload.attachments && !Array.isArray(this.payload.attachments)) {
            throw new Meteor.Error('validation-error', 'Payload attachments must be an array');
        }

        if (this.payload && this.payload.attachments && Array.isArray(this.payload.attachments)) {
            for (const attachment of this.payload.attachments) {
                if (typeof attachment !== 'string') {
                    throw new Meteor.Error('validation-error', 'Each attachment must be a string');
                }
            }
        }

        // Validate attributes structure
        if (this.attributes && !Array.isArray(this.attributes)) {
            throw new Meteor.Error('validation-error', 'Attributes must be an array');
        }

        if (this.attributes && this.attributes.length > 0) {
            for (const attr of this.attributes) {
                if (!attr || typeof attr !== 'object') {
                    throw new Meteor.Error('validation-error', 'Each attribute must be an object');
                }
                if (!attr.key || typeof attr.key !== 'string') {
                    throw new Meteor.Error('validation-error', 'Each attribute must have a string key');
                }
                if (attr.value === undefined || attr.value === null) {
                    throw new Meteor.Error('validation-error', 'Each attribute must have a value');
                }
                // Value can be string, number, or boolean according to schema
                const valueType = typeof attr.value;
                if (!['string', 'number', 'boolean'].includes(valueType)) {
                    throw new Meteor.Error('validation-error', 'Attribute value must be string, number, or boolean');
                }
            }
        }

        return true;
    }

    async save() {
        this.validate();
        const doc = {
            timestamp: this.timestamp,
        };

        // Required fields (according to strict schema) - always include these so MongoDB validation can work
        // For required fields, include them even if null/undefined so schema validation can catch the error
        doc.businessId = this.businessId ? toObjectId(this.businessId) : this.businessId;
        doc.inboxId = this.inboxId ? toObjectId(this.inboxId) : this.inboxId;
        doc.channelId = this.channelId ? toObjectId(this.channelId) : this.channelId;
        doc.consumerId = this.consumerId ? toObjectId(this.consumerId) : this.consumerId;
        doc.medium = this.medium;
        doc.direction = this.direction;
        doc.payload = this.payload;
        doc.messageId = this.messageId ? this.messageId.toString() : null;

        // Optional fields - only include if they have valid values
        if (this.userId) {
            doc.userId = toObjectId(this.userId);
        }
        if (this.status) {
            doc.status = this.status;
        }
        if (this.attributes && Array.isArray(this.attributes) && this.attributes.length > 0) {
            doc.attributes = this.attributes;
        }

        if (this._id) {
            await InteractionsCollection.updateAsync(toObjectId(this._id), { $set: doc });
            return this._id;
        } else {
            this._id = await InteractionsCollection.insertAsync(doc);
            return this._id;
        }
    }

    static async findById(id) {
        const data = await InteractionsCollection.findOneAsync(toObjectId(id));
        return data ? new Interactions(data) : null;
    }

    static async findByBusinessId(businessId) {
        const docs = await InteractionsCollection.find(
            { businessId: toObjectId(businessId) },
            { sort: { timestamp: -1 } }
        ).fetchAsync();
        return docs.map(d => new Interactions(d));
    }

    static async findByInboxId(inboxId) {
        const docs = await InteractionsCollection.find(
            { inboxId: toObjectId(inboxId) },
            { sort: { timestamp: 1 } }
        ).fetchAsync();
        return docs.map(d => new Interactions(d));
    }

    static async findByConsumerId(consumerId) {
        const docs = await InteractionsCollection.find(
            { consumerId: toObjectId(consumerId) },
            { sort: { timestamp: -1 } }
        ).fetchAsync();
        return docs.map(d => new Interactions(d));
    }

    static async findByUserId(userId) {
        const docs = await InteractionsCollection.find(
            { userId: toObjectId(userId) },
            { sort: { timestamp: -1 } }
        ).fetchAsync();
        return docs.map(d => new Interactions(d));
    }

    static async findByChannelId(channelId) {
        const docs = await InteractionsCollection.find(
            { channelId: toObjectId(channelId) },
            { sort: { timestamp: -1 } }
        ).fetchAsync();
        return docs.map(d => new Interactions(d));
    }

    static async findByDirection(direction) {
        const docs = await InteractionsCollection.find(
            { direction },
            { sort: { timestamp: -1 } }
        ).fetchAsync();
        return docs.map(d => new Interactions(d));
    }

    static async findByStatus(status) {
        const docs = await InteractionsCollection.find(
            { status },
            { sort: { timestamp: -1 } }
        ).fetchAsync();
        return docs.map(d => new Interactions(d));
    }

    static async findByTimeRange(startTime, endTime) {
        const docs = await InteractionsCollection.find(
            { timestamp: { $gte: startTime, $lte: endTime } },
            { sort: { timestamp: -1 } }
        ).fetchAsync();
        return docs.map(d => new Interactions(d));
    }

    static async findAll() {
        const docs = await InteractionsCollection.find(
            {},
            { sort: { timestamp: -1 } }
        ).fetchAsync();
        return docs.map(d => new Interactions(d));
    }

    async update(updateData = {}) {
        if (!this._id) throw new Meteor.Error('bad-request', 'Missing _id');
        Object.assign(this, updateData);
        this.validate();

        const $set = { ...updateData };
        if ('businessId' in $set) $set.businessId = toObjectId($set.businessId);
        if ('inboxId' in $set) $set.inboxId = toObjectId($set.inboxId);
        if ('channelId' in $set) $set.channelId = toObjectId($set.channelId);
        if ('consumerId' in $set) $set.consumerId = toObjectId($set.consumerId);
        if ('userId' in $set) $set.userId = toObjectId($set.userId);

        await InteractionsCollection.updateAsync(toObjectId(this._id), { $set });
        return this._id;
    }

    async addAttachment(attachment) {
        if (!this._id) {
            throw new Meteor.Error('bad-request', 'Cannot add attachment to interaction without ID');
        }

        if (!this.payload.attachments) {
            this.payload.attachments = [];
        }

        this.payload.attachments.push(attachment);

        const result = await InteractionsCollection.updateAsync(
            toObjectId(this._id),
            { $push: { 'payload.attachments': attachment } }
        );

        return result;
    }

    async updateStatus(status) {
        if (!this._id) {
            throw new Meteor.Error('bad-request', 'Cannot update interaction status without ID');
        }

        this.status = status;

        const result = await InteractionsCollection.updateAsync(
            toObjectId(this._id),
            { $set: { status } }
        );

        return result;
    }

    async delete() {
        if (!this._id) throw new Meteor.Error('bad-request', 'Missing _id');
        return InteractionsCollection.removeAsync(toObjectId(this._id));
    }

    // Add attribute to the interaction
    addAttribute(key, value) {
        if (!key || typeof key !== 'string') {
            throw new Error('Attribute key must be a non-empty string');
        }

        if (value === undefined || value === null) {
            throw new Error('Attribute value cannot be null or undefined');
        }

        // Remove existing attribute with same key
        this.attributes = this.attributes.filter(attr => attr.key !== key);

        // Add new attribute
        this.attributes.push({ key, value });
    }

    // Remove attribute by key
    removeAttribute(key) {
        this.attributes = this.attributes.filter(attr => attr.key !== key);
    }

    // Get attribute value by key
    getAttribute(key) {
        const attr = this.attributes.find(attr => attr.key === key);
        return attr ? attr.value : undefined;
    }

    // Check if attribute exists
    hasAttribute(key) {
        return this.attributes.some(attr => attr.key === key);
    }

    // Get all attributes as a simple object
    getAttributesAsObject() {
        const result = {};
        this.attributes.forEach(attr => {
            result[attr.key] = attr.value;
        });
        return result;
    }

    // Set attributes from an object
    setAttributesFromObject(obj) {
        this.attributes = [];
        Object.entries(obj).forEach(([key, value]) => {
            this.addAttribute(key, value);
        });
    }

    static async findByAttribute(key, value) {
        const docs = await InteractionsCollection.find({
            'attributes.key': key,
            'attributes.value': value
        }).fetchAsync();

        return docs.map(d => new Interactions(d));
    }

    static async findByAttributes(attributeFilters) {
        const query = {
            $and: attributeFilters.map(filter => ({
                'attributes.key': filter.key,
                'attributes.value': filter.value
            }))
        };

        const docs = await InteractionsCollection.find(query).fetchAsync();
        return docs.map(d => new Interactions(d));
    }

    static async findByAttributeKey(key) {
        const docs = await InteractionsCollection.find({
            'attributes.key': key
        }).fetchAsync();

        return docs.map(d => new Interactions(d));
    }

    static async findByMessageId(messageId) {
        const docs = await InteractionsCollection.findOneAsync({
            messageId: messageId
        });
        return docs ? new Interactions(docs) : null;
    }

    toObject() {
        return {
            _id: this._id,
            businessId: this.businessId,
            inboxId: this.inboxId,
            channelId: this.channelId,
            consumerId: this.consumerId,
            userId: this.userId,
            medium: this.medium,
            direction: this.direction,
            payload: this.payload,
            status: this.status,
            timestamp: this.timestamp,
            attributes: this.attributes,
            messageId: this.messageId
        };
    }
}