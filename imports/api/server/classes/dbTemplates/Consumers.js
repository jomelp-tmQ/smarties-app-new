import { Mongo } from 'meteor/mongo';
import { toObjectId, toObjectIdArray } from '../db/helper';

export const ConsumersCollection = new Mongo.Collection('consumers', {
    idGeneration: 'MONGO', // keeps _id as ObjectId to match your schemas
});

export default class Consumers {
    constructor(data = {}) {
        this._id = data._id ?? null;
        this.businessId = data.businessId ?? null;
        this.externalId = data.externalId ?? null;
        this.name = data.name ?? { given: null, family: null };
        this.contacts = Array.isArray(data.contacts) ? data.contacts : [];
        this.tags = Array.isArray(data.tags) ? data.tags : [];
        this.createdAt = data.createdAt ?? Date.now();
    }

    // Validate data according to schema
    validate() {
        // Validate name structure if provided
        if (this.name && (typeof this.name !== 'object' || Array.isArray(this.name))) {
            throw new Meteor.Error('validation-error', 'Name must be an object with given and family properties');
        }

        // Validate contacts array structure
        if (this.contacts && !Array.isArray(this.contacts)) {
            throw new Meteor.Error('validation-error', 'Contacts must be an array');
        }

        // Validate contact structure based on schema
        if (this.contacts && Array.isArray(this.contacts)) {
            for (const contact of this.contacts) {
                if (contact && typeof contact === 'object') {
                    if (contact.phones && !Array.isArray(contact.phones)) {
                        throw new Meteor.Error('validation-error', 'Contact phones must be an array');
                    }
                    if (contact.emails && !Array.isArray(contact.emails)) {
                        throw new Meteor.Error('validation-error', 'Contact emails must be an array');
                    }
                    // Validate phone structure
                    if (contact.phones) {
                        for (const phone of contact.phones) {
                            if (phone && (typeof phone.label !== 'string' || typeof phone.value !== 'string')) {
                                throw new Meteor.Error('validation-error', 'Phone must have string label and value');
                            }
                        }
                    }
                    // Validate email structure
                    if (contact.emails) {
                        for (const email of contact.emails) {
                            if (email && (typeof email.label !== 'string' || typeof email.value !== 'string')) {
                                throw new Meteor.Error('validation-error', 'Email must have string label and value');
                            }
                        }
                    }
                }
            }
        }

        // Validate tags array
        if (this.tags && !Array.isArray(this.tags)) {
            throw new Meteor.Error('validation-error', 'Tags must be an array');
        }

        // Validate tag elements are strings
        if (this.tags && Array.isArray(this.tags)) {
            for (const tag of this.tags) {
                if (typeof tag !== 'string') {
                    throw new Meteor.Error('validation-error', 'All tags must be strings');
                }
            }
        }

        return true;
    }

    async save() {
        this.validate();
        const doc = {
            businessId: toObjectId(this.businessId),
            externalId: this.externalId,
            name: this.name,
            contacts: this.contacts,
            tags: this.tags,
            createdAt: this.createdAt,
        };

        if (this._id) {
            await ConsumersCollection.updateAsync(toObjectId(this._id), { $set: doc });
            return this._id;
        } else {
            this._id = await ConsumersCollection.insertAsync(doc);
            return this._id;
        }
    }

    static async findById(id) {
        const data = await ConsumersCollection.findOneAsync(toObjectId(id));
        return data ? new Consumers(data) : null;
    }

    static async findByBusinessId(businessId) {
        const docs = await ConsumersCollection.find({ businessId: toObjectId(businessId) }).fetchAsync();
        return docs.map(d => new Consumers(d));
    }

    static async findByExternalId(externalId) {
        const data = await ConsumersCollection.findOneAsync({ externalId });
        return data ? new Consumers(data) : null;
    }

    static async findByTags(tags) {
        const docs = await ConsumersCollection.find({ tags: { $in: tags } }).fetchAsync();
        return docs.map(d => new Consumers(d));
    }

    static async findAll() {
        const docs = await ConsumersCollection.find({}).fetchAsync();
        return docs.map(d => new Consumers(d));
    }

    async update(updateData = {}) {
        if (!this._id) throw new Meteor.Error('bad-request', 'Missing _id');
        Object.assign(this, updateData);
        this.validate();

        const $set = { ...updateData };
        if ('businessId' in $set) $set.businessId = toObjectId($set.businessId);

        await ConsumersCollection.updateAsync(toObjectId(this._id), { $set });
        return this._id;
    }

    async addContact(contact) {
        if (!this._id) {
            throw new Meteor.Error('bad-request', 'Cannot add contact to consumer without ID');
        }

        this.contacts.push(contact);

        const result = await ConsumersCollection.updateAsync(
            toObjectId(this._id),
            { $push: { contacts: contact } }
        );

        return result;
    }

    async addTag(tag) {
        if (!this._id) {
            throw new Meteor.Error('bad-request', 'Cannot add tag to consumer without ID');
        }

        if (!this.tags.includes(tag)) {
            this.tags.push(tag);

            const result = await ConsumersCollection.updateAsync(
                toObjectId(this._id),
                { $addToSet: { tags: tag } }
            );

            return result;
        }
    }

    async removeTag(tag) {
        if (!this._id) {
            throw new Meteor.Error('bad-request', 'Cannot remove tag from consumer without ID');
        }

        this.tags = this.tags.filter(t => t !== tag);

        const result = await ConsumersCollection.updateAsync(
            toObjectId(this._id),
            { $pull: { tags: tag } }
        );

        return result;
    }

    async delete() {
        if (!this._id) throw new Meteor.Error('bad-request', 'Missing _id');
        return ConsumersCollection.removeAsync(toObjectId(this._id));
    }

    static async findByBusinessIdAndExternalId(businessId, externalId) {
        const data = await ConsumersCollection.findOneAsync({ businessId: toObjectId(businessId), externalId });
        return data ? new Consumers(data) : null;
    }

    toObject() {
        return {
            _id: this._id,
            businessId: this.businessId,
            externalId: this.externalId,
            name: this.name,
            contacts: this.contacts,
            tags: this.tags,
            createdAt: this.createdAt
        };
    }
}