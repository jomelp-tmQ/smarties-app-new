import { PersonProfileLinksCollection } from '../dbTemplates/PersonProfileLinks.js';
import { toObjectId } from '../db/helper';

export async function findConsumerCandidates({ businessId, consumerId, threshold = 0.7, limit = 50 }) {
    const rc = PersonProfileLinksCollection.rawCollection();
    const pipeline = [
        { $match: { businessId: toObjectId(businessId), profileId: toObjectId(consumerId), linkType: "soft", confidence: { $gte: threshold } } },
        { $lookup: { from: 'person_profile_links', localField: 'personId', foreignField: 'personId', as: 'others' } },
        { $unwind: '$others' },
        { $match: { 'others.profileId': { $ne: toObjectId(consumerId) }, 'others.confidence': { $gte: threshold } } },
        { $group: { _id: '$others.profileId', personIds: { $addToSet: '$personId' }, maxConfidence: { $max: '$others.confidence' }, evidences: { $addToSet: '$others.signals' } } },
        { $sort: { maxConfidence: -1 } },
        { $limit: limit }
    ];
    const cursor = rc.aggregate(pipeline);
    return cursor.toArray();
}

export async function listDuplicateClusters({ businessId, threshold = 0.7, limit = 200 }) {
    const rc = PersonProfileLinksCollection.rawCollection();
    const pipeline = [
        { $match: { businessId: toObjectId(businessId), linkType: "soft", confidence: { $gte: threshold } } },
        { $group: { _id: '$personId', consumers: { $addToSet: '$profileId' }, confs: { $push: '$confidence' } } },
        { $project: { size: { $size: '$consumers' }, consumers: 1, avgConfidence: { $avg: '$confs' }, maxConfidence: { $max: '$confs' } } },
        { $match: { size: { $gt: 1 } } },
        { $sort: { maxConfidence: -1, avgConfidence: -1 } },
        { $limit: limit }
    ];
    const cursor = rc.aggregate(pipeline);
    return cursor.toArray();
}

export async function explainPair({ businessId, aConsumerId, bConsumerId }) {
    const rc = PersonProfileLinksCollection.rawCollection();
    const pipeline = [
        { $match: { businessId: toObjectId(businessId), profileId: { $in: [toObjectId(aConsumerId), toObjectId(bConsumerId)] } } },
        { $group: { _id: '$personId', links: { $push: { profileId: '$profileId', confidence: '$confidence', signals: '$signals' } } } },
        { $match: { 'links.profileId': { $all: [toObjectId(aConsumerId), toObjectId(bConsumerId)] } } },
        { $project: { _id: 1, links: 1 } }
    ];
    const cursor = rc.aggregate(pipeline);
    return cursor.toArray();
}

export default { findConsumerCandidates, listDuplicateClusters, explainPair };


