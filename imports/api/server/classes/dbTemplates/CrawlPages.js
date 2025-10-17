import { Mongo } from 'meteor/mongo';
import { toObjectId, toObjectIdArray, isObjectId } from '../db/helper';
import RedisVentService from '../events/RedisVentService';
import moment from 'moment';
export const CrawlPagesCollection = new Mongo.Collection('crawl_pages', {
    idGeneration: 'MONGO', // keeps _id as ObjectId to match your schemas
});

export default class CrawlPages {
    constructor(data = {}) {
        this._id = data._id ?? null;
        this.crawlId = data.crawlId ?? null;
        this.url = data.url ?? null;
        this.status = data.status ?? null;
        this.error = data.error ?? null;
        this.active = data.active ?? null;
        this.metadata = data.metadata ?? {};
        this.userId = data.userId ?? null;
        this.title = data.title ?? null;
        this.fileId = data.fileId ?? null;
        this.createdAt = data.createdAt ?? moment().valueOf();
        this.updatedAt = data.updatedAt ?? moment().valueOf();
    }

    // Validate data according to schema
    validate() {
        // Type validation for optional fields
        if (this.userId !== null && typeof this.userId !== 'string') {
            throw new Meteor.Error('validation-error', 'Channels validation failed: type must be a string');
        }

        if (this.url !== null && typeof this.url !== 'string') {
            throw new Meteor.Error('validation-error', 'Channels validation failed: identifier must be a string');
        }
        if (!this.createdAt) this.createdAt = moment().valueOf();
        if (!this.updatedAt) this.updatedAt = moment().valueOf();

        return true;
    }

    async save() {
        this.validate();
        const doc = {
            crawlId: this.crawlId,
            url: this.url,
            status: this.status,
            fileId: this.fileId,
            error: this.error,
            active: this.active,
            metadata: this.metadata,
            userId: this.userId,
            title: this.title,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
        if (this._id) {
            await CrawlPagesCollection.updateAsync(toObjectId(this._id), { $set: doc });
            return this._id;
        } else {
            this._id = await CrawlPagesCollection.insertAsync(doc);
            return this._id;
        }
    }
    toObject() {
        return {
            id: this._id._str,
            crawlId: this.crawlId,
            url: this.url,
            status: this.status,
            error: this.error,
            active: this.active,
            metadata: this.metadata,
            userId: this.userId,
            title: this.title,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
    notify() {
        RedisVentService.CrawlPages.triggerUpsert("crawlPages", this.userId, this.toObject());
    }
    static async lazyFindAllByUserId(userId, crawlId, searchQuery, lastBasis) {
        const pipeline = [];
        const match = {};
        if (userId) match.userId = userId;
        if (crawlId) match.crawlId = crawlId;
        if (searchQuery) match.url = { $regex: searchQuery, $options: "i" };
        if (lastBasis > 0) match.createdAt = { $lt: lastBasis };
        pipeline.push({ $match: match });
        pipeline.push({ $sort: { createdAt: -1 } });
        pipeline.push({ $limit: 10 });
        return CrawlPagesCollection.rawCollection().aggregate(pipeline, { allowDiskUse: true }).toArray().then(docs => {
            if (docs && docs.length) {
                return docs.map(doc => new CrawlPages(doc));
            }
            return [];
        });
    }
    static async findById(id) {
        return CrawlPagesCollection.findOneAsync({ _id: toObjectId(id) }).then(doc => new CrawlPages(doc));
    }
    static async findByCrawlIdActive(crawlId, active) {
        return CrawlPagesCollection.find({ crawlId: crawlId, active: active }).fetchAsync().then(docs => docs.length ? docs.map(doc => new CrawlPages(doc)) : []);
    }
}