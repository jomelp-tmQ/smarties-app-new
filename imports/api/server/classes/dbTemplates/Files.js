import { Mongo } from 'meteor/mongo';
import { toObjectId } from '../db/helper';
import { logger as baseLogger } from '../../utils/serverUtils.js';
const logger = baseLogger.child({ service: 'dbTemplates/Files.js' });

export const FilesCollection = new Mongo.Collection('filesUploads', {
    idGeneration: 'MONGO',
});

export default class Files {
    constructor(data = {}) {
        this._id = data._id ?? null;
        this.fileId = data.fileId ?? null;
        this.businessId = data.businessId ?? null;
        this.userId = data.userId ?? null;
        this.originalName = data.originalName ?? null;
        this.fileSize = data.fileSize ?? null;
        this.mimeType = data.mimeType ?? null;
        this.status = data.status ?? null; // optional status mirror
        this.kbStatus = data.kbStatus ?? null; // optional knowledge-base processing status
        this.createdAt = data.createdAt ?? Date.now();
    }

    validate() {
        if (!this.fileId) {
            throw new Meteor.Error('validation-error', 'fileId is required');
        }
        if (!this.originalName || typeof this.originalName !== 'string') {
            throw new Meteor.Error('validation-error', 'originalName must be a non-empty string');
        }
        if (this.fileSize !== null && typeof this.fileSize !== 'number') {
            throw new Meteor.Error('validation-error', 'fileSize must be a number');
        }
        if (this.mimeType !== null && typeof this.mimeType !== 'string') {
            throw new Meteor.Error('validation-error', 'mimeType must be a string');
        }
        if (this.status !== null && typeof this.status !== 'string') {
            throw new Meteor.Error('validation-error', 'status must be a string');
        }
        if (this.kbStatus !== null && typeof this.kbStatus !== 'string') {
            throw new Meteor.Error('validation-error', 'kbStatus must be a string');
        }
        if (this.kbStatus) {
            const validKbStatuses = ['queued', 'completed', 'failed'];
            if (!validKbStatuses.includes(this.kbStatus)) {
                throw new Meteor.Error('validation-error', `kbStatus must be one of: ${validKbStatuses.join(', ')}`);
            }
        }
        if (typeof this.createdAt !== 'number') {
            throw new Meteor.Error('validation-error', 'createdAt must be a number');
        }

        return true;
    }

    static async fetchAll(query, options) {
        const files = await FilesCollection.find(query, options).fetchAsync();
        return files ? files.map(file => new Files(file)) : null;
    }

    async save() {
        this.validate();
        const doc = {
            fileId: this.fileId,
            originalName: this.originalName,
            createdAt: this.createdAt,
        };

        if (this.businessId) doc.businessId = toObjectId(this.businessId);
        if (this.userId) doc.userId = toObjectId(this.userId);
        if (this.fileSize) doc.fileSize = this.fileSize;
        if (this.mimeType) doc.mimeType = this.mimeType;
        if (this.status) doc.status = this.status;
        if (this.kbStatus) doc.kbStatus = this.kbStatus;

        try {
            if (this._id) {
                await FilesCollection.updateAsync(toObjectId(this._id), { $set: doc });
                return this._id;
            } else {
                this._id = await FilesCollection.insertAsync(doc);
                return this._id;
            }
        } catch (error) {
            logger.error('Files.save failed', {
                error: error?.message,
                code: error?.code,
                errInfo: error?.errInfo,
                // Avoid logging full doc if it may contain sensitive data
            });

            if (error.code === 121 && error.errInfo && error.errInfo.details) {
                logger.warn('Schema validation details', { details: error.errInfo.details });
            }

            throw error;
        }
    }

    static async findById(id) {
        const data = await FilesCollection.findOneAsync(toObjectId(id));
        return data ? new Files(data) : null;
    }

    static async findByFileId(fileId) {
        const data = await FilesCollection.findOneAsync({ fileId });
        return data ? new Files(data) : null;
    }

    static async findByBusinessId(businessId) {
        const docs = await FilesCollection.find(
            { businessId: toObjectId(businessId) },
            { sort: { createdAt: -1 } }
        ).fetchAsync();
        return docs.map(d => new Files(d));
    }

    async update(updateData = {}) {
        if (!this._id) throw new Meteor.Error('bad-request', 'Missing _id');

        Object.assign(this, updateData);
        this.validate();

        const $set = { ...updateData };
        if ('businessId' in $set) $set.businessId = toObjectId($set.businessId);
        if ('userId' in $set) $set.userId = toObjectId($set.userId);

        await FilesCollection.updateAsync(toObjectId(this._id), { $set });
        return this._id;
    }

    async delete() {
        if (!this._id) throw new Meteor.Error('bad-request', 'Missing _id');
        return FilesCollection.removeAsync(toObjectId(this._id));
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
            status: this.status,
            kbStatus: this.kbStatus,
            createdAt: this.createdAt,

        };
    }
}


