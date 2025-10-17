import Attachments from '../dbTemplates/Attachments.js';
import { toObjectId } from '../db/helper.js';
import fs from 'fs';
import path from 'path';
import { fetch } from "meteor/fetch";
import { Path } from "@tmq-dev-ph/tmq-dev-core-server";
import { logger as baseLogger } from '../../utils/serverUtils.js';
const logger = baseLogger.child({ service: 'attachments/AttachmentManager.js' });

/**
 * Centralized Attachment Manager
 * Handles all attachment operations across the application
 */
class AttachmentManager {
    constructor() { }

    /**
     * Create a new attachment record
     * @param {Object} params
     * @param {string} params.businessId - Business ID
     * @param {string} params.inboxId - Inbox ID (optional)
     * @param {string} params.interactionId - Interaction ID (optional)
     * @param {string} params.consumerId - Consumer ID (optional)
     * @param {string} params.channelId - Channel ID (optional)
     * @param {string} params.originalName - Original filename
     * @param {string} params.source - Source of attachment (e.g., 'webhook_download', 'user_upload', 'api_upload')
     * @param {Object} params.metadata - Additional metadata
     * @returns {Promise<Attachments>}
     */
    static async createAttachment({
        businessId,
        inboxId = null,
        interactionId = null,
        consumerId = null,
        channelId = null,
        originalName,
        recordingId,
        source,
        metadata = {}
    }) {
        // Extract metadata fields
        const {
            fileSize,
            mimeType,
            fileExtension,
            localPath,
            localUrl,
            remoteUrl,
            attributes = [],
            thumbnailUrl,
            ...otherMetadata
        } = metadata;

        const attachmentData = new Attachments({
            businessId,
            inboxId,
            interactionId,
            consumerId,
            channelId,
            originalName,
            source,
            recordingId,
            createdAt: Date.now(),
            fileSize: fileSize ? Number(fileSize) : null,
            mimeType,
            fileExtension,
            localPath,
            localUrl,
            remoteUrl,
            attributes,
            thumbnailUrl
        });

        try {
            const _id = await attachmentData.save();
            return await Attachments.findById(_id);
        } catch (error) {
            // If validation fails, try to create the collection first
            if (error.code === 121) {
                try {
                    const { MongoInternals } = await import('meteor/mongo');
                    const db = MongoInternals.defaultRemoteCollectionDriver().mongo.db;

                    // Create collection with basic validator
                    await db.createCollection('attachments', {
                        validator: {
                            $jsonSchema: {
                                bsonType: "object",
                                title: "attachments",
                                properties: {
                                    businessId: { bsonType: "objectId" },
                                    inboxId: { bsonType: "objectId" },
                                    interactionId: { bsonType: "objectId" },
                                    consumerId: { bsonType: "objectId" },
                                    channelId: { bsonType: "objectId" },
                                    originalName: { bsonType: "string" },
                                    source: { bsonType: "string" },
                                    recordingId: { bsonType: "string" },
                                    fileSize: { bsonType: ["double", "int"] },
                                    createdAt: { bsonType: "double" }
                                },
                                required: ["businessId", "originalName", "source"]
                            }
                        },
                        validationLevel: 'strict',
                        validationAction: 'error'
                    });

                    const _id = await attachmentData.save();
                    return await Attachments.findById(_id);
                } catch (createError) {
                    logger.error('Failed to create attachments collection', { error: createError?.message });
                    throw error; // Throw original error
                }
            }
            throw error;
        }
    }

    /**
     * Download a file from URL and create attachment record
     * @param {Object} params
     * @param {string} params.businessId - Business ID
     * @param {string} params.remoteUrl - URL to download from
     * @param {string} params.originalName - Original filename
     * @param {string} params.source - Source of the download
     * @param {Object} params.context - Context information (inboxId, interactionId, etc.)
     * @param {Object} params.attributes - Additional attributes
     * @returns {Promise<Attachments>}
     */
    static async downloadAndCreateAttachment({
        businessId,
        remoteUrl,
        originalName,
        recordingId,
        source = 'webhook_download',
        context = {},
        attributes = []
    }) {
        try {
            const resp = await fetch(remoteUrl);
            if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);

            // Try to detect filename from Content-Disposition
            const cd = resp.headers?.get && resp.headers.get('content-disposition');
            let detectedName = null;
            if (cd) {
                const match = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(cd);
                detectedName = decodeURIComponent(match?.[1] || match?.[2] || '');
            }

            const finalName = originalName || detectedName || `attachment_${Date.now()}`;
            const safeName = finalName.replace(/[^a-zA-Z0-9._-]/g, '_');
            const localFilePath = path.join(Path.UPLOAD, safeName);

            // Ensure upload dir exists
            await fs.promises.mkdir(Path.UPLOAD, { recursive: true });
            const arrayBuf = await resp.arrayBuffer();
            await fs.promises.writeFile(localFilePath, Buffer.from(arrayBuf));

            const localUrl = `/.upload/${encodeURIComponent(safeName)}`;
            const fileSize = arrayBuf.byteLength;
            const mimeType = resp.headers?.get?.('content-type') || 'application/octet-stream';
            const fileExtension = path.extname(finalName).toLowerCase();

            // Create attachment record
            const attachment = await this.createAttachment({
                businessId,
                originalName: finalName,
                recordingId,
                source,
                ...context,
                metadata: {
                    fileSize,
                    mimeType,
                    fileExtension,
                    localPath: localFilePath,
                    localUrl,
                    remoteUrl,
                    attributes
                }
            });

            return attachment;
        } catch (error) {
            logger.error('Failed to download and create attachment', { error: error?.message });
            throw error;
        }
    }

    /**
     * Upload a file from buffer/data and create attachment record
     * @param {Object} params
     * @param {string} params.businessId - Business ID
     * @param {Buffer|ArrayBuffer} params.data - File data
     * @param {string} params.originalName - Original filename
     * @param {string} params.mimeType - MIME type
     * @param {string} params.source - Source of the upload
     * @param {Object} params.context - Context information
     * @param {Object} params.attributes - Additional attributes
     * @returns {Promise<Attachments>}
     */
    static async uploadAndCreateAttachment({
        businessId,
        data,
        originalName,
        mimeType = 'application/octet-stream',
        source = 'user_upload',
        context = {},
        recordingId,
        attributes = []
    }) {
        try {
            const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
            const localFilePath = path.join(Path.UPLOAD, safeName);

            // Ensure upload dir exists
            await fs.promises.mkdir(Path.UPLOAD, { recursive: true });

            const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
            await fs.promises.writeFile(localFilePath, buffer);

            const localUrl = `/.upload/${encodeURIComponent(safeName)}`;
            const fileSize = buffer.length;
            const fileExtension = path.extname(originalName).toLowerCase();

            // Create attachment record
            const attachment = await this.createAttachment({
                businessId,
                originalName,
                recordingId,
                source,
                ...context,
                metadata: {
                    fileSize,
                    mimeType,
                    fileExtension,
                    localPath: localFilePath,
                    localUrl,
                    attributes
                }
            });

            return attachment;
        } catch (error) {
            logger.error('Failed to upload and create attachment', { error: error?.message });
            throw error;
        }
    }

    /**
     * Get attachments by various filters
     * @param {Object} filters - Filter criteria
     * @returns {Promise<Attachments[]>}
     */
    static async getAttachments(filters = {}) {
        const {
            businessId,
            inboxId,
            interactionId,
            consumerId,
            channelId,
            recordingId,
            source,
            limit = 50,
            offset = 0,
            sortBy = 'createdAt',
            sortOrder = -1
        } = filters;

        const query = {};
        if (businessId) query.businessId = toObjectId(businessId);
        if (inboxId) query.inboxId = toObjectId(inboxId);
        if (interactionId) query.interactionId = toObjectId(interactionId);
        if (consumerId) query.consumerId = toObjectId(consumerId);
        if (channelId) query.channelId = toObjectId(channelId);
        if (recordingId) query.recordingId = recordingId;
        if (source) query.source = source;

        const docs = await Attachments.AttachmentsCollection.find(
            query,
            {
                sort: { [sortBy]: sortOrder },
                limit,
                skip: offset
            }
        ).fetchAsync();

        return docs.map(d => new Attachments(d));
    }

    /**
     * Get attachment by ID
     * @param {string} attachmentId - Attachment ID
     * @returns {Promise<Attachments|null>}
     */
    static async getAttachmentById(attachmentId) {
        return await Attachments.findById(attachmentId);
    }

    /**
     * Get attachments by recording ID
     * @param {string} recordingId - Recording ID
     * @returns {Promise<Attachments[]>}
     */
    static async getAttachmentsByRecordingId(recordingId) {
        return await Attachments.findByRecordingId(recordingId);
    }

    /**
     * Update attachment metadata
     * @param {string} attachmentId - Attachment ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<Attachments>}
     */
    static async updateAttachment(attachmentId, updateData) {
        const attachment = await Attachments.findById(attachmentId);
        if (!attachment) throw new Error('attachment_not_found');

        await attachment.update(updateData);
        return await Attachments.findById(attachmentId);
    }

    /**
     * Delete attachment (both record and file)
     * @param {string} attachmentId - Attachment ID
     * @returns {Promise<boolean>}
     */
    static async deleteAttachment(attachmentId) {
        const attachment = await Attachments.findById(attachmentId);
        if (!attachment) throw new Error('attachment_not_found');

        // Delete local file if it exists
        if (attachment.localPath) {
            try {
                await fs.promises.unlink(attachment.localPath);
            } catch (error) {
                logger.warn('Failed to delete local file', { error: error?.message });
            }
        }

        // Delete database record
        await attachment.delete();
        return true;
    }

    /**
     * Get attachment statistics for a business
     * @param {string} businessId - Business ID
     * @returns {Promise<Object>}
     */
    static async getAttachmentStats(businessId) {
        const pipeline = [
            { $match: { businessId: toObjectId(businessId) } },
            {
                $group: {
                    _id: null,
                    totalCount: { $sum: 1 },
                    totalSize: { $sum: '$fileSize' },
                    bySource: { $push: '$source' },
                    byMimeType: { $push: '$mimeType' }
                }
            }
        ];

        const result = await Attachments.AttachmentsCollection.rawCollection().aggregate(pipeline).toArray();
        const stats = result[0] || { totalCount: 0, totalSize: 0, bySource: [], byMimeType: [] };

        // Count by source
        const sourceCount = {};
        stats.bySource.forEach(source => {
            sourceCount[source] = (sourceCount[source] || 0) + 1;
        });

        // Count by MIME type
        const mimeTypeCount = {};
        stats.byMimeType.forEach(mimeType => {
            mimeTypeCount[mimeType] = (mimeTypeCount[mimeType] || 0) + 1;
        });

        return {
            totalCount: stats.totalCount,
            totalSize: stats.totalSize,
            bySource: sourceCount,
            byMimeType: mimeTypeCount
        };
    }

    /**
     * Clean up orphaned attachments (attachments without valid references)
     * @param {string} businessId - Business ID
     * @returns {Promise<number>} - Number of attachments cleaned up
     */
    static async cleanupOrphanedAttachments(businessId) {
        // This would need to be implemented based on your business logic
        // For example, remove attachments that reference deleted interactions, etc.
        return 0;
    }
}

export default AttachmentManager;
