import { Mongo } from 'meteor/mongo';
import { toObjectId, toObjectIdArray } from '../db/helper';
import { logger as baseLogger } from '../../utils/serverUtils.js';
const logger = baseLogger.child({ service: 'dbTemplates/Attachments.js' });

export const AttachmentsCollection = new Mongo.Collection('attachments', {
    idGeneration: 'MONGO', // keeps _id as ObjectId to match your schemas
});

export default class Attachments {
    constructor(data = {}) {
        this._id = data._id ?? null;
        this.businessId = data.businessId ?? null;
        this.inboxId = data.inboxId ?? null;
        this.interactionId = data.interactionId ?? null;
        this.consumerId = data.consumerId ?? null;
        this.channelId = data.channelId ?? null;
        this.originalName = data.originalName ?? null;
        this.fileSize = data.fileSize ?? null;
        this.mimeType = data.mimeType ?? null;
        this.fileExtension = data.fileExtension ?? null;
        this.localPath = data.localPath ?? null;
        this.localUrl = data.localUrl ?? null;
        this.remoteUrl = data.remoteUrl ?? null;
        this.source = data.source ?? null;
        this.recordingId = data.recordingId ?? null;
        this.createdAt = data.createdAt ?? Date.now();
        this.attributes = Array.isArray(data.attributes) ? data.attributes : [];
        this.thumbnailUrl = data.thumbnailUrl ?? null;
    }

    // Validate data according to schema
    validate() {
        // Required fields validation
        if (!this.businessId) {
            throw new Meteor.Error('validation-error', 'businessId is required');
        }
        if (!this.inboxId) {
            throw new Meteor.Error('validation-error', 'inboxId is required');
        }
        if (!this.interactionId) {
            throw new Meteor.Error('validation-error', 'interactionId is required');
        }
        if (!this.consumerId) {
            throw new Meteor.Error('validation-error', 'consumerId is required');
        }
        if (!this.channelId) {
            throw new Meteor.Error('validation-error', 'channelId is required');
        }
        if (!this.originalName || typeof this.originalName !== 'string') {
            throw new Meteor.Error('validation-error', 'originalName must be a non-empty string');
        }
        if (!this.source || typeof this.source !== 'string') {
            throw new Meteor.Error('validation-error', 'source must be a non-empty string');
        }

        // Type validations
        if (this.fileSize !== null && typeof this.fileSize !== 'number') {
            throw new Meteor.Error('validation-error', 'fileSize must be a number');
        }
        if (this.mimeType !== null && typeof this.mimeType !== 'string') {
            throw new Meteor.Error('validation-error', 'mimeType must be a string');
        }
        if (this.fileExtension !== null && typeof this.fileExtension !== 'string') {
            throw new Meteor.Error('validation-error', 'fileExtension must be a string');
        }
        if (this.localPath !== null && typeof this.localPath !== 'string') {
            throw new Meteor.Error('validation-error', 'localPath must be a string');
        }
        if (this.localUrl !== null && typeof this.localUrl !== 'string') {
            throw new Meteor.Error('validation-error', 'localUrl must be a string');
        }
        if (this.remoteUrl !== null && typeof this.remoteUrl !== 'string') {
            throw new Meteor.Error('validation-error', 'remoteUrl must be a string');
        }
        if (typeof this.createdAt !== 'number') {
            throw new Meteor.Error('validation-error', 'createdAt must be a number');
        }
        if (this.thumbnailUrl !== null && typeof this.thumbnailUrl !== 'string') {
            throw new Meteor.Error('validation-error', 'thumbnailUrl must be a string');
        }

        // Validate attributes structure (same as Interactions)
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
            createdAt: this.createdAt,
        };

        // Required fields
        doc.businessId = this.businessId ? toObjectId(this.businessId) : this.businessId;
        doc.inboxId = this.inboxId ? toObjectId(this.inboxId) : this.inboxId;
        doc.interactionId = this.interactionId ? toObjectId(this.interactionId) : this.interactionId;
        doc.consumerId = this.consumerId ? toObjectId(this.consumerId) : this.consumerId;
        doc.channelId = this.channelId ? toObjectId(this.channelId) : this.channelId;
        doc.originalName = this.originalName;
        doc.source = this.source;
        doc.recordingId = this.recordingId;

        // Optional fields - only include if they have valid values
        if (this.fileSize) doc.fileSize = this.fileSize;
        if (this.mimeType) doc.mimeType = this.mimeType;
        if (this.fileExtension) doc.fileExtension = this.fileExtension;
        if (this.localPath) doc.localPath = this.localPath;
        if (this.localUrl) doc.localUrl = this.localUrl;
        if (this.remoteUrl) doc.remoteUrl = this.remoteUrl;
        if (this.thumbnailUrl) doc.thumbnailUrl = this.thumbnailUrl;
        if (this.attributes && Array.isArray(this.attributes) && this.attributes.length > 0) {
            doc.attributes = this.attributes;
        }

        try {
            if (this._id) {
                await AttachmentsCollection.updateAsync(toObjectId(this._id), { $set: doc });
                return this._id;
            } else {
                this._id = await AttachmentsCollection.insertAsync(doc);
                return this._id;
            }
        } catch (error) {
            // Enhanced error logging for debugging
            logger.error('Attachments.save failed', {
                error: error?.message,
                code: error?.code,
                errInfo: error?.errInfo,
            });

            // If it's a validation error, try to get more details
            if (error.code === 121 && error.errInfo && error.errInfo.details) {
                logger.warn('Schema validation details', { details: error.errInfo.details });
            }

            throw error;
        }
    }

    // Static finder methods (following Interactions pattern)
    static async findById(id) {
        const data = await AttachmentsCollection.findOneAsync(toObjectId(id));
        return data ? new Attachments(data) : null;
    }

    static async findByInboxId(inboxId) {
        const docs = await AttachmentsCollection.find(
            { inboxId: toObjectId(inboxId) },
            { sort: { createdAt: -1 } }
        ).fetchAsync();
        return docs.map(d => new Attachments(d));
    }

    static async findByInteractionId(interactionId) {
        const docs = await AttachmentsCollection.find(
            { interactionId: toObjectId(interactionId) },
            { sort: { createdAt: -1 } }
        ).fetchAsync();
        return docs.map(d => new Attachments(d));
    }

    static async findByBusinessId(businessId) {
        const docs = await AttachmentsCollection.find(
            { businessId: toObjectId(businessId) },
            { sort: { createdAt: -1 } }
        ).fetchAsync();
        return docs.map(d => new Attachments(d));
    }

    static async findByAttribute(key, value) {
        const docs = await AttachmentsCollection.find({
            'attributes.key': key,
            'attributes.value': value
        }).fetchAsync();
        return docs.map(d => new Attachments(d));
    }

    static async findByAttributes(attributeFilters) {
        const query = {
            $and: attributeFilters.map(filter => ({
                'attributes.key': filter.key,
                'attributes.value': filter.value
            }))
        };

        const docs = await AttachmentsCollection.find(query).fetchAsync();
        return docs.map(d => new Attachments(d));
    }

    static async findByAttributeKey(key) {
        const docs = await AttachmentsCollection.find({
            'attributes.key': key
        }).fetchAsync();

        return docs.map(d => new Attachments(d));
    }

    static async findByRecordingId(recordingId) {
        const docs = await AttachmentsCollection.find(
            { recordingId },
            { sort: { createdAt: -1 } }
        ).fetchAsync();
        return docs.map(d => new Attachments(d));
    }

    // Attribute management methods (same as Interactions)
    addAttribute(key, value) {
        if (!key || typeof key !== 'string') {
            throw new Error('Attribute key must be a non-empty string');
        }
        if (value === undefined || value === null) {
            throw new Error('Attribute value cannot be null or undefined');
        }
        this.attributes = this.attributes.filter(attr => attr.key !== key);
        this.attributes.push({ key, value });
    }

    removeAttribute(key) {
        this.attributes = this.attributes.filter(attr => attr.key !== key);
    }

    getAttribute(key) {
        const attr = this.attributes.find(attr => attr.key === key);
        return attr ? attr.value : undefined;
    }

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

    // Update methods
    async update(updateData = {}) {
        if (!this._id) throw new Meteor.Error('bad-request', 'Missing _id');
        Object.assign(this, updateData);
        this.validate();

        const $set = { ...updateData };
        if ('businessId' in $set) $set.businessId = toObjectId($set.businessId);
        if ('inboxId' in $set) $set.inboxId = toObjectId($set.inboxId);
        if ('interactionId' in $set) $set.interactionId = toObjectId($set.interactionId);
        if ('consumerId' in $set) $set.consumerId = toObjectId($set.consumerId);
        if ('channelId' in $set) $set.channelId = toObjectId($set.channelId);

        await AttachmentsCollection.updateAsync(toObjectId(this._id), { $set });
        return this._id;
    }

    async delete() {
        if (!this._id) throw new Meteor.Error('bad-request', 'Missing _id');
        return AttachmentsCollection.removeAsync(toObjectId(this._id));
    }

    toObject() {
        return {
            _id: this._id,
            businessId: this.businessId,
            inboxId: this.inboxId,
            interactionId: this.interactionId,
            consumerId: this.consumerId,
            channelId: this.channelId,
            originalName: this.originalName,
            fileSize: this.fileSize,
            mimeType: this.mimeType,
            fileExtension: this.fileExtension,
            localPath: this.localPath,
            localUrl: this.localUrl,
            remoteUrl: this.remoteUrl,
            source: this.source,
            createdAt: this.createdAt,
            attributes: this.attributes,
            thumbnailUrl: this.thumbnailUrl
        };
    }
}
