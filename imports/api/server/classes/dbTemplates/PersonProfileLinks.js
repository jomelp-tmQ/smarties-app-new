import { Mongo } from 'meteor/mongo';
import { toObjectId } from '../db/helper';

export const PersonProfileLinksCollection = new Mongo.Collection('person_profile_links', {
    idGeneration: 'MONGO',
});

const PersonProfileLinks = {
    async updateOne(filter = {}, update = {}, options = {}) {
        const normalizedFilter = { ...filter };
        if (normalizedFilter.businessId) normalizedFilter.businessId = toObjectId(normalizedFilter.businessId);
        if (normalizedFilter.personId) normalizedFilter.personId = toObjectId(normalizedFilter.personId);
        if (normalizedFilter.profileId) normalizedFilter.profileId = toObjectId(normalizedFilter.profileId);
        return PersonProfileLinksCollection.updateAsync(normalizedFilter, update, options);
    },
    async findOne(filter = {}, options = {}) {
        const normalizedFilter = { ...filter };
        if (normalizedFilter.businessId) normalizedFilter.businessId = toObjectId(normalizedFilter.businessId);
        if (normalizedFilter.personId) normalizedFilter.personId = toObjectId(normalizedFilter.personId);
        if (normalizedFilter.profileId) normalizedFilter.profileId = toObjectId(normalizedFilter.profileId);
        return PersonProfileLinksCollection.findOneAsync(normalizedFilter, options);
    }
};

export default PersonProfileLinks;

