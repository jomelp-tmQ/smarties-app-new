import { Mongo } from 'meteor/mongo';
import { toObjectId, toObjectIdArray } from '../db/helper';
import { logger as baseLogger } from '../../utils/serverUtils.js';
const logger = baseLogger.child({ service: 'dbTemplates/Uploads.js' });

export const UploadsCollection = new Mongo.Collection('uploads', {
    idGeneration: 'MONGO', // keeps _id as ObjectId to match your schemas
});

export default class Uploads {
    constructor(data = {}) {
        this._id = data._id ?? null;
        this.fileId = data.fileId ?? null;
        this.businessId = data.businessId ?? null;
        this.userId = data.userId ?? null;
        this.originalName = data.originalName ?? null;
        this.fileSize = data.fileSize ?? null;
        this.mimeType = data.mimeType ?? null;
        this.fileExtension = data.fileExtension ?? null;
        this.remoteUrl = data.remoteUrl ?? null;
        this.status = data.status ?? 'pending';
        this.statusUrl = data.statusUrl ?? null;
        this.source = data.source ?? null;
        this.createdAt = data.createdAt ?? Date.now();
        this.updatedAt = data.updatedAt ?? Date.now();
        this.completedAt = data.completedAt ?? null;
        this.attributes = Array.isArray(data.attributes) ? data.attributes : [];
    }

    // Validate data according to schema
    validate() {
        // Required fields validation
        if (!this.fileId) {
            throw new Meteor.Error('validation-error', 'fileId is required');
        }
        if (!this.originalName || typeof this.originalName !== 'string') {
            throw new Meteor.Error('validation-error', 'originalName must be a non-empty string');
        }
        if (!this.source || typeof this.source !== 'string') {
            throw new Meteor.Error('validation-error', 'source must be a non-empty string');
        }
        if (!this.status || typeof this.status !== 'string') {
            throw new Meteor.Error('validation-error', 'status must be a non-empty string');
        }

        // Validate status enum
        const validStatuses = ['pending', 'completed', 'failed'];
        if (!validStatuses.includes(this.status)) {
            throw new Meteor.Error('validation-error', `status must be one of: ${validStatuses.join(', ')}`);
        }

        // Validate source enum
        const validSources = ['api_upload', 'webhook_download', 'knowledge_base', 'messaging', 'system'];
        if (!validSources.includes(this.source)) {
            throw new Meteor.Error('validation-error', `source must be one of: ${validSources.join(', ')}`);
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
        if (this.remoteUrl !== null && typeof this.remoteUrl !== 'string') {
            throw new Meteor.Error('validation-error', 'remoteUrl must be a string');
        }
        if (this.statusUrl !== null && typeof this.statusUrl !== 'string') {
            throw new Meteor.Error('validation-error', 'statusUrl must be a string');
        }
        if (typeof this.createdAt !== 'number') {
            throw new Meteor.Error('validation-error', 'createdAt must be a number');
        }
        if (typeof this.updatedAt !== 'number') {
            throw new Meteor.Error('validation-error', 'updatedAt must be a number');
        }
        if (this.completedAt !== null && typeof this.completedAt !== 'number') {
            throw new Meteor.Error('validation-error', 'completedAt must be a number');
        }

        // Validate attributes structure
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
            fileId: this.fileId,
            originalName: this.originalName,
            source: this.source,
            status: this.status,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };

        // Optional fields - only include if they have valid values
        if (this.businessId) doc.businessId = toObjectId(this.businessId);
        if (this.userId) doc.userId = toObjectId(this.userId);
        if (this.fileSize) doc.fileSize = this.fileSize;
        if (this.mimeType) doc.mimeType = this.mimeType;
        if (this.fileExtension) doc.fileExtension = this.fileExtension;
        if (this.remoteUrl) doc.remoteUrl = this.remoteUrl;
        if (this.statusUrl) doc.statusUrl = this.statusUrl;
        if (this.completedAt) doc.completedAt = this.completedAt;
        if (this.attributes && Array.isArray(this.attributes) && this.attributes.length > 0) {
            doc.attributes = this.attributes;
        }

        try {
            if (this._id) {
                await UploadsCollection.updateAsync(toObjectId(this._id), { $set: doc });
                return this._id;
            } else {
                this._id = await UploadsCollection.insertAsync(doc);
                return this._id;
            }
        } catch (error) {
            // Enhanced error logging for debugging
            logger.error('Uploads.save failed', {
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

    // Static finder methods
    static async findById(id) {
        const data = await UploadsCollection.findOneAsync(toObjectId(id));
        return data ? new Uploads(data) : null;
    }

    static async findByFileId(fileId) {
        const data = await UploadsCollection.findOneAsync({ fileId });
        return data ? new Uploads(data) : null;
    }

    static async findByBusinessId(businessId) {
        const docs = await UploadsCollection.find(
            { businessId: toObjectId(businessId) },
            { sort: { createdAt: -1 } }
        ).fetchAsync();
        return docs.map(d => new Uploads(d));
    }

    static async findByUserId(userId) {
        const docs = await UploadsCollection.find(
            { userId: toObjectId(userId) },
            { sort: { createdAt: -1 } }
        ).fetchAsync();
        return docs.map(d => new Uploads(d));
    }

    static async findByStatus(status) {
        const docs = await UploadsCollection.find(
            { status },
            { sort: { createdAt: -1 } }
        ).fetchAsync();
        return docs.map(d => new Uploads(d));
    }

    static async findBySource(source) {
        const docs = await UploadsCollection.find(
            { source },
            { sort: { createdAt: -1 } }
        ).fetchAsync();
        return docs.map(d => new Uploads(d));
    }

    static async findByAttribute(key, value) {
        const docs = await UploadsCollection.find({
            'attributes.key': key,
            'attributes.value': value
        }).fetchAsync();
        return docs.map(d => new Uploads(d));
    }

    static async findByAttributes(attributeFilters) {
        const query = {
            $and: attributeFilters.map(filter => ({
                'attributes.key': filter.key,
                'attributes.value': filter.value
            }))
        };

        const docs = await UploadsCollection.find(query).fetchAsync();
        return docs.map(d => new Uploads(d));
    }

    // Attribute management methods
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

    // Status management methods
    markAsCompleted() {
        this.status = 'completed';
        this.completedAt = Date.now();
        this.updatedAt = Date.now();
    }

    markAsFailed() {
        this.status = 'failed';
        this.updatedAt = Date.now();
    }

    markAsPending() {
        this.status = 'pending';
        this.updatedAt = Date.now();
        this.completedAt = null;
    }

    // Update methods
    async update(updateData = {}) {
        if (!this._id) throw new Meteor.Error('bad-request', 'Missing _id');

        // Always update the updatedAt timestamp
        updateData.updatedAt = Date.now();

        Object.assign(this, updateData);
        this.validate();

        const $set = { ...updateData };
        if ('businessId' in $set) $set.businessId = toObjectId($set.businessId);
        if ('userId' in $set) $set.userId = toObjectId($set.userId);

        await UploadsCollection.updateAsync(toObjectId(this._id), { $set });
        return this._id;
    }

    async delete() {
        if (!this._id) throw new Meteor.Error('bad-request', 'Missing _id');
        return UploadsCollection.removeAsync(toObjectId(this._id));
    }

    toObject() {
        return {
            _id: this._id,
            fileId: this.fileId,
            businessId: this.businessId,
            userId: this.userId,
            originalName: this.originalName,
            fileSize: this.fileSize,
            mimeType: this.mimeType,
            fileExtension: this.fileExtension,
            remoteUrl: this.remoteUrl,
            status: this.status,
            statusUrl: this.statusUrl,
            source: this.source,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            completedAt: this.completedAt,
            attributes: this.attributes
        };
    }
    async getPresignedUrl() {
        if (this.remoteUrl) {
            return fetch(this.remoteUrl)
                .then(response => response.json())
                .then(data => {
                    if (data.success) return data.downloadUrl;
                    return null;
                })
                .catch(error => {
                    logger.error('Files.getPresignedUrl failed', { error: error?.message });
                    return null;
                });
        }
        return null;
    }
}
