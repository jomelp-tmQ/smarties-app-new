import { toObjectId, toObjectIdArray, isObjectId } from '../db/helper';
import RedisVentService from '../events/RedisVentService';
import { Mongo } from 'meteor/mongo';
import moment from 'moment';
import { logger as baseLogger } from '../../utils/serverUtils.js';
const logger = baseLogger.child({ service: 'dbTemplates/Crawl.js' });

export const CrawlCollection = new Mongo.Collection('crawl', {
    idGeneration: 'MONGO', // keeps _id as ObjectId to match your schemas
});

export default class Crawl {
    constructor(data = {}) {
        this._id = data._id ?? null;
        this.userId = data.userId ?? null;
        this.url = data.url ?? null;
        this.depth = data.depth ?? null;
        this.maxPages = data.maxPages ?? null;
        this.createdAt = data.createdAt ?? moment().valueOf();
        this.updatedAt = data.updatedAt ?? moment().valueOf();
        this.status = data.status ?? null;
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
        if (this.status !== null && typeof this.status !== 'string') this.status = "PENDING";
        return true;
    }

    async save() {
        this.validate();
        const doc = {
            userId: this.userId,
            url: this.url,
            depth: this.depth,
            maxPages: this.maxPages,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            status: this.status,
        };
        try {
            if (this._id) {
                await CrawlCollection.updateAsync(toObjectId(this._id), { $set: doc });
                return this._id;
            } else {
                this._id = await CrawlCollection.insertAsync(doc);
                return this._id;
            }
        } catch (error) {
            logger.error('Crawl.save failed', { error: error?.message || error, url: this.url, userId: this.userId });
            throw error;
        }
    }
    toObject() {
        return {
            id: this._id._str,
            userId: this.userId,
            url: this.url,
            depth: this.depth,
            maxPages: this.maxPages,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            status: this.status,
        };
    }
    static async findById(id) {
        return CrawlCollection.findOneAsync({ _id: toObjectId(id) }).then(doc => new Crawl(doc));
    }
    static async findByUrl(url, userId) {
        return CrawlCollection.findOneAsync({ url: url, userId: userId }).then(doc => doc ? new Crawl(doc) : null);
    }
    static async lazyFindAllByUserId(userId, searchQuery, lastBasis) {
        const pipeline = [];
        const match = {};
        if (userId) match.userId = userId;
        if (searchQuery) match.url = { $regex: searchQuery, $options: "i" };
        if (lastBasis > 0) match.createdAt = { $lt: lastBasis };
        pipeline.push({ $match: match });
        pipeline.push({ $sort: { createdAt: -1 } });
        pipeline.push({ $limit: 10 });
        return CrawlCollection.rawCollection().aggregate(pipeline, { allowDiskUse: true }).toArray().then(docs => {
            if (docs && docs.length) {
                return docs.map(doc => {
                    doc.id = doc._id.toString();
                    return new Crawl(doc);
                });
            }
            return [];
        });
    }
    notify() {
        RedisVentService.Crawl.triggerUpsert("crawl", this.userId, this.toObject());
    }
}