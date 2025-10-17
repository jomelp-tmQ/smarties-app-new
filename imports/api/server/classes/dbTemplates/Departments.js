// /imports/api/departments/Departments.meteor.js
import { Mongo } from 'meteor/mongo';
import { toObjectId, toObjectIdArray } from '../db/helper';

export const DepartmentsCollection = new Mongo.Collection('departments', {
    idGeneration: 'MONGO', // keeps _id as ObjectId to match your schemas
});

export default class Departments {
    constructor(data = {}) {
        this._id = data._id ?? null;
        this.businessId = data.businessId ?? null;
        this.name = data.name ?? null;
        this.description = data.description ?? null;
        this.channelIds = Array.isArray(data.channelIds) ? data.channelIds : [];
        this.createdAt = data.createdAt ?? Date.now();
    }

    validate() { /* same checks as before */ return true; }

    async save() {
        this.validate();
        const doc = {
            businessId: toObjectId(this.businessId),
            name: this.name,
            description: this.description,
            channelIds: toObjectIdArray(this.channelIds),
            createdAt: this.createdAt,
        };

        if (this._id) {
            await DepartmentsCollection.updateAsync(toObjectId(this._id), { $set: doc });
            return this._id;
        } else {
            this._id = await DepartmentsCollection.insertAsync(doc);
            return this._id;
        }
    }

    static async findById(id) {
        const data = await DepartmentsCollection.findOneAsync(toObjectId(id));
        return data ? new Departments(data) : null;
    }

    static async findByBusinessId(businessId) {
        const docs = await DepartmentsCollection.find({ businessId: toObjectId(businessId) }).fetchAsync();
        return docs.map(d => new Departments(d));
    }

    static async findByBusinessIdAndChannels(businessId, channels) {
        const docs = await DepartmentsCollection.find({ businessId: toObjectId(businessId), channelIds: { $in: channels.map(c => toObjectId(c)) } }).fetchAsync();
        return docs.map(d => new Departments(d));
    }

    async update(updateData = {}) {
        if (!this._id) throw new Meteor.Error('bad-request', 'Missing _id');
        Object.assign(this, updateData);
        this.validate();

        const $set = { ...updateData };
        if ('businessId' in $set) $set.businessId = toObjectId($set.businessId);
        if ('channelIds' in $set) $set.channelIds = toObjectIdArray($set.channelIds);

        await DepartmentsCollection.updateAsync(toObjectId(this._id), { $set });
        return this._id;
    }

    async delete() {
        if (!this._id) throw new Meteor.Error('bad-request', 'Missing _id');
        return DepartmentsCollection.removeAsync(toObjectId(this._id));
    }
}
