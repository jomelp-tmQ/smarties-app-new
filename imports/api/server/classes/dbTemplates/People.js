import { Mongo } from 'meteor/mongo';
import { toObjectId } from '../db/helper';

export const PeopleCollection = new Mongo.Collection('people', {
    idGeneration: 'MONGO',
});

const People = {
    async findOne(filter = {}) {
        const normalized = { ...filter };
        if (normalized.businessId) normalized.businessId = toObjectId(normalized.businessId);
        return PeopleCollection.findOneAsync(normalized);
    },

    async insertOne(doc = {}) {
        const insertedId = await PeopleCollection.insertAsync(doc);
        return { insertedId };
    },

    async updateOne(filter = {}, update = {}, options = {}) {
        const normalized = { ...filter };
        if (normalized._id) normalized._id = toObjectId(normalized._id);
        if (normalized.businessId) normalized.businessId = toObjectId(normalized.businessId);
        return PeopleCollection.updateAsync(normalized, update, options);
    }
};

export default People;

