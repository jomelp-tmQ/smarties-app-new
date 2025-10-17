import { Mongo } from 'meteor/mongo';
import { toObjectId, toObjectIdArray, isObjectId } from '../db/helper';

export const ChannelsCollection = new Mongo.Collection('channels', {
    idGeneration: 'MONGO', // keeps _id as ObjectId to match your schemas
});

export default class Channels {
    constructor(data = {}) {
        this._id = data._id ?? null;
        this.businessId = data.businessId ?? null;
        this.type = data.type ?? null;
        this.identifier = data.identifier ?? null;
        this.provider = data.provider ?? null;
        this.metadata = data.metadata ?? {};
        this.status = data.status ?? null;
        this.createdAt = data.createdAt ?? Date.now();
        this.api = data.api ?? {};
    }

    // Validate data according to schema
    validate() {
        // Type validation for optional fields
        if (this.type !== null && typeof this.type !== 'string') {
            throw new Meteor.Error('validation-error', 'Channels validation failed: type must be a string');
        }

        if (this.identifier !== null && typeof this.identifier !== 'string') {
            throw new Meteor.Error('validation-error', 'Channels validation failed: identifier must be a string');
        }

        if (this.provider !== null && typeof this.provider !== 'string') {
            throw new Meteor.Error('validation-error', 'Channels validation failed: provider must be a string');
        }

        if (this.status !== null && typeof this.status !== 'string') {
            throw new Meteor.Error('validation-error', 'Channels validation failed: status must be a string');
        }

        if (this.metadata !== null && (typeof this.metadata !== 'object' || Array.isArray(this.metadata))) {
            throw new Meteor.Error('validation-error', 'Channels validation failed: metadata must be an object');
        }

        if (typeof this.createdAt !== 'number') {
            throw new Meteor.Error('validation-error', 'Channels validation failed: createdAt must be a number');
        }

        return true;
    }

    async save() {
        this.validate();
        const doc = {
            type: this.type,
            identifier: this.identifier,
            provider: this.provider,
            api: this.api,
            metadata: this.metadata,
            status: this.status,
            createdAt: this.createdAt,
        };

        // Only include fields if they have valid values matching schema types
        if (this.businessId) {
            doc.businessId = toObjectId(this.businessId);
        }

        if (this._id) {
            await ChannelsCollection.updateAsync(toObjectId(this._id), { $set: doc });
            return this._id;
        } else {
            this._id = await ChannelsCollection.insertAsync(doc);
            return this._id;
        }
    }

    static async findById(id) {
        const data = await ChannelsCollection.findOneAsync(toObjectId(id));
        return data ? new Channels(data) : null;
    }

    static async findByBusinessId(businessId) {
        const docs = await ChannelsCollection.find({ businessId: toObjectId(businessId) }).fetchAsync();
        return docs.map(d => new Channels(d));
    }

    static async findByProvider(provider) {
        const docs = await ChannelsCollection.find({ provider }).fetchAsync();
        return docs.map(d => new Channels(d));
    }

    static async findByTypeAndIdentifier(businessId, type, identifier) {
        const data = await ChannelsCollection.findOneAsync({
            businessId,
            type,
            identifier
        });
        return data ? new Channels(data) : null;
    }

    static async findAll() {
        const docs = await ChannelsCollection.find({}).fetchAsync();
        return docs.map(d => new Channels(d));
    }

    async update(updateData = {}) {
        if (!this._id) throw new Meteor.Error('bad-request', 'Missing _id');
        Object.assign(this, updateData);
        this.validate();

        const $set = { ...updateData };
        if ('businessId' in $set) $set.businessId = toObjectId($set.businessId);

        await ChannelsCollection.updateAsync(toObjectId(this._id), { $set });
        return this._id;
    }

    async delete() {
        if (!this._id) throw new Meteor.Error('bad-request', 'Missing _id');
        return ChannelsCollection.removeAsync(toObjectId(this._id));
    }

    toObject() {
        return {
            _id: this._id,
            businessId: this.businessId,
            type: this.type,
            identifier: this.identifier,
            provider: this.provider,
            api: this.api,
            metadata: this.metadata,
            status: this.status,
            createdAt: this.createdAt
        };
    }
}