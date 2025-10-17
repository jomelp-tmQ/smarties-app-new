import { logger as baseLogger } from "../../utils/serverUtils.js";
import fs from 'fs';
import path from 'path';
import { Path } from "@tmq-dev-ph/tmq-dev-core-server";
import Uploads, { UploadsCollection } from '../dbTemplates/Uploads.js';
import { toObjectId } from '../db/helper.js';

const logger = baseLogger.child({ service: 'classes/uploads/UploadsManager.js' });

/**
 * UploadsManager - Centralized file upload management for the entire application
 * Provides a single source of truth for all file operations
 */
class UploadsManager {
    constructor() { }

    /**
     * Create a new upload record
     * @param {Object} params
     * @param {string} params.fileId - Unique file identifier
     * @param {string} params.originalName - Original filename
     * @param {string} params.source - Source of the upload
     * @param {string} params.businessId - Business ID (optional)
     * @param {string} params.userId - User ID (optional)
     * @param {string} params.statusUrl - URL to check upload status (optional)
     * @param {Array} params.attributes - Additional attributes (optional)
     * @returns {Promise<Uploads>}
     */
    static async createUpload({
        fileId,
        originalName,
        source,
        businessId = null,
        userId = null,
        statusUrl = null,
        attributes = []
    }) {
        try {
            logger.debug('UploadsManager.createUpload', { fileId, originalName, source, businessId, userId });

            // Validate required parameters
            if (!fileId || !originalName || !source) {
                throw new Error('Missing required parameters: fileId, originalName, source');
            }

            // Check if fileId already exists
            const existing = await Uploads.findByFileId(fileId);
            if (existing) {
                throw new Error(`Upload with fileId ${fileId} already exists`);
            }

            const upload = new Uploads({
                fileId,
                businessId,
                userId,
                originalName,
                source,
                status: 'pending',
                statusUrl,
                attributes,
                createdAt: Date.now(),
                updatedAt: Date.now()
            });

            await upload.save();
            logger.debug('Upload created successfully', { uploadId: upload._id, fileId });
            return upload;

        } catch (error) {
            logger.error('UploadsManager.createUpload failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Update upload with file metadata after successful upload
     * @param {string} fileId - File identifier
     * @param {Object} metadata - File metadata
     * @returns {Promise<Uploads>}
     */
    static async updateUploadMetadata(fileId, metadata = {}, { finalize = false } = {}) {
        try {
            logger.debug('UploadsManager.updateUploadMetadata', { fileId, metadata });

            const upload = await Uploads.findByFileId(fileId);
            if (!upload) {
                throw new Error(`Upload not found for fileId: ${fileId}`);
            }

            // Update file metadata
            const updateData = {};
            if (metadata.fileSize !== undefined) updateData.fileSize = metadata.fileSize;
            if (metadata.mimeType !== undefined) updateData.mimeType = metadata.mimeType;
            if (metadata.fileExtension !== undefined) updateData.fileExtension = metadata.fileExtension;
            if (metadata.remoteUrl !== undefined) updateData.remoteUrl = metadata.remoteUrl;

            // Optionally finalize (mark completed) only when explicitly requested
            if (finalize === true) {
                upload.markAsCompleted();
            }

            // Apply updates
            Object.assign(upload, updateData);
            await upload.save();

            logger.debug('Upload metadata updated successfully', { fileId, uploadId: upload._id });
            return upload;

        } catch (error) {
            logger.error('UploadsManager.updateUploadMetadata failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Mark upload as completed
     * @param {string} fileId - File identifier
     * @returns {Promise<Uploads>}
     */
    static async markUploadCompleted(fileId) {
        try {
            logger.debug('UploadsManager.markUploadCompleted', { fileId });

            const upload = await Uploads.findByFileId(fileId);
            if (!upload) {
                throw new Error(`Upload not found for fileId: ${fileId}`);
            }

            upload.markAsCompleted();
            await upload.save();

            logger.debug('Upload marked as completed', { fileId, uploadId: upload._id });
            return upload;

        } catch (error) {
            logger.error('UploadsManager.markUploadCompleted failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Mark upload as failed
     * @param {string} fileId - File identifier
     * @param {string} errorMessage - Error message (optional)
     * @returns {Promise<Uploads>}
     */
    static async markUploadFailed(fileId, errorMessage = null) {
        try {
            logger.debug('UploadsManager.markUploadFailed', { fileId, errorMessage });

            const upload = await Uploads.findByFileId(fileId);
            if (!upload) {
                throw new Error(`Upload not found for fileId: ${fileId}`);
            }

            upload.markAsFailed();
            if (errorMessage) {
                upload.addAttribute('errorMessage', errorMessage);
            }
            await upload.save();

            logger.debug('Upload marked as failed', { fileId, uploadId: upload._id, errorMessage });
            return upload;

        } catch (error) {
            logger.error('UploadsManager.markUploadFailed failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Get upload by file ID
     * @param {string} fileId - File identifier
     * @returns {Promise<Uploads|null>}
     */
    static async getUploadByFileId(fileId) {
        try {
            return await Uploads.findByFileId(fileId);
        } catch (error) {
            logger.error('UploadsManager.getUploadByFileId failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Get uploads by business ID
     * @param {string} businessId - Business identifier
     * @param {Object} options - Query options
     * @returns {Promise<Uploads[]>}
     */
    static async getUploadsByBusinessId(businessId, options = {}) {
        try {
            const { limit = 50, offset = 0, status = null, source = null } = options;

            let query = { businessId: toObjectId(businessId) };
            if (status) query.status = status;
            if (source) query.source = source;

            const docs = await UploadsCollection.find(
                query,
                {
                    sort: { createdAt: -1 },
                    limit: limit + offset
                }
            ).fetchAsync();

            // Apply offset
            const result = docs.slice(offset, offset + limit);
            return result.map(d => new Uploads(d));

        } catch (error) {
            logger.error('UploadsManager.getUploadsByBusinessId failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Get uploads by status
     * @param {string} status - Upload status
     * @param {Object} options - Query options
     * @returns {Promise<Uploads[]>}
     */
    static async getUploadsByStatus(status, options = {}) {
        try {
            const { limit = 50, offset = 0 } = options;

            const docs = await UploadsCollection.find(
                { status },
                {
                    sort: { createdAt: -1 },
                    limit: limit + offset
                }
            ).fetchAsync();

            // Apply offset
            const result = docs.slice(offset, offset + limit);
            return result.map(d => new Uploads(d));

        } catch (error) {
            logger.error('UploadsManager.getUploadsByStatus failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Get uploads by source
     * @param {string} source - Upload source
     * @param {Object} options - Query options
     * @returns {Promise<Uploads[]>}
     */
    static async getUploadsBySource(source, options = {}) {
        try {
            const { limit = 50, offset = 0 } = options;

            const docs = await UploadsCollection.find(
                { source },
                {
                    sort: { createdAt: -1 },
                    limit: limit + offset
                }
            ).fetchAsync();

            // Apply offset
            const result = docs.slice(offset, offset + limit);
            return result.map(d => new Uploads(d));

        } catch (error) {
            logger.error('UploadsManager.getUploadsBySource failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Delete upload and associated file
     * @param {string} fileId - File identifier
     * @returns {Promise<boolean>}
     */
    static async deleteUpload(fileId) {
        try {
            logger.debug('UploadsManager.deleteUpload', { fileId });

            const upload = await Uploads.findByFileId(fileId);
            if (!upload) {
                throw new Error(`Upload not found for fileId: ${fileId}`);
            }

            // No local files to delete since we don't store locally anymore

            // Delete upload record
            await upload.delete();
            logger.debug('Upload deleted successfully', { fileId, uploadId: upload._id });
            return true;

        } catch (error) {
            logger.error('UploadsManager.deleteUpload failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Get upload statistics
     * @param {string} businessId - Business identifier (optional)
     * @returns {Promise<Object>}
     */
    static async getUploadStats(businessId = null) {
        try {
            const query = businessId ? { businessId: toObjectId(businessId) } : {};

            const pipeline = [
                { $match: query },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
                        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
                        totalSize: { $sum: { $ifNull: ['$fileSize', 0] } }
                    }
                }
            ];

            const result = await UploadsCollection.rawCollection().aggregate(pipeline).toArray();
            const stats = result[0] || { total: 0, pending: 0, completed: 0, failed: 0, totalSize: 0 };

            return {
                total: stats.total,
                pending: stats.pending,
                completed: stats.completed,
                failed: stats.failed,
                totalSize: stats.totalSize
            };

        } catch (error) {
            logger.error('UploadsManager.getUploadStats failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Clean up old failed uploads
     * @param {number} daysOld - Number of days old to consider for cleanup
     * @returns {Promise<number>} - Number of uploads cleaned up
     */
    static async cleanupFailedUploads(daysOld = 30) {
        try {
            const cutoffDate = Date.now() - (daysOld * 24 * 60 * 60 * 1000);

            const failedUploads = await UploadsCollection.find({
                status: 'failed',
                updatedAt: { $lt: cutoffDate }
            }).fetchAsync();

            let cleanedCount = 0;
            for (const upload of failedUploads) {
                try {
                    await this.deleteUpload(upload.fileId);
                    cleanedCount++;
                } catch (error) {
                    logger.warn('Failed to cleanup upload', { fileId: upload.fileId, error: error.message });
                }
            }

            logger.debug('Cleanup completed', { cleanedCount, daysOld });
            return cleanedCount;

        } catch (error) {
            logger.error('UploadsManager.cleanupFailedUploads failed', { error: error.message });
            throw error;
        }
    }
}

export default UploadsManager;
