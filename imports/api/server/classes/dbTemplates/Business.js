import { Mongo } from 'meteor/mongo';
import { toObjectId, toObjectIdArray } from '../db/helper';
import moment from 'moment';

export const BusinessCollection = new Mongo.Collection('business', {
    idGeneration: 'MONGO', // keeps _id as ObjectId to match your schemas
});

export default class Business {
    constructor(data = {}) {
        this._id = data._id ?? null;
        this.name = data.name ?? null;
        this.slug = data.slug ?? null;
        this.local = data.local ?? null;
        this.plan = data.plan ?? null;
        this.settings = data.settings ?? {};
        this.createdAt = data.createdAt ?? moment().valueOf();
    }

    // Validate required fields according to schema
    validate() {
        // Type validation
        if (this.name !== null && typeof this.name !== 'string') {
            throw new Meteor.Error('validation-error', 'Business validation failed: name must be a string');
        }

        if (this.slug !== null && typeof this.slug !== 'string') {
            throw new Meteor.Error('validation-error', 'Business validation failed: slug must be a string');
        }

        if (this.local !== null && typeof this.local !== 'string') {
            throw new Meteor.Error('validation-error', 'Business validation failed: local must be a string');
        }

        if (this.plan !== null && typeof this.plan !== 'string') {
            throw new Meteor.Error('validation-error', 'Business validation failed: plan must be a string');
        }

        if (this.settings !== null && (typeof this.settings !== 'object' || Array.isArray(this.settings))) {
            throw new Meteor.Error('validation-error', 'Business validation failed: settings must be an object');
        }

        if (typeof this.createdAt !== 'number') {
            throw new Meteor.Error('validation-error', 'Business validation failed: createdAt must be a number');
        }

        return true;
    }

    async save() {
        this.validate();
        const doc = {
            name: this.name,
            slug: this.slug,
            local: this.local,
            plan: this.plan,
            settings: this.settings,
            createdAt: this.createdAt,
        };

        if (this._id) {
            await BusinessCollection.updateAsync(toObjectId(this._id), { $set: doc });
            return this._id;
        } else {
            this._id = await BusinessCollection.insertAsync(doc);
            return this._id;
        }
    }

    static async findById(id) {
        const data = await BusinessCollection.findOneAsync(toObjectId(id));
        return data ? new Business(data) : null;
    }

    static async findBySlug(slug) {
        const data = await BusinessCollection.findOneAsync({ slug });
        return data ? new Business(data) : null;
    }

    static async findAll() {
        const businesses = await BusinessCollection.find({}).fetchAsync();
        return businesses.map(data => new Business(data));
    }

    async update(updateData = {}) {
        if (!this._id) throw new Meteor.Error('bad-request', 'Missing _id');
        Object.assign(this, updateData);
        this.validate();

        const $set = { ...updateData };

        await BusinessCollection.updateAsync(toObjectId(this._id), { $set });
        return this._id;
    }

    async delete() {
        if (!this._id) throw new Meteor.Error('bad-request', 'Missing _id');
        return BusinessCollection.removeAsync(toObjectId(this._id));
    }
    static async generateUniqueSlug(name) {
        const slug = name.toLowerCase().replace(/ /g, '-');
        const existingBusiness = await BusinessCollection.findOneAsync({ slug });
        if (existingBusiness) {
            return Business.generateUniqueSlug(name);
        }
        return slug;
    }
    static generateNameFromEmail(email) {
        const name = email.split('@')[0];
        return name;
    }

    toObject() {
        return {
            _id: this._id,
            name: this.name,
            slug: this.slug,
            local: this.local,
            plan: this.plan,
            settings: this.settings,
            createdAt: this.createdAt,
        };
    }
}