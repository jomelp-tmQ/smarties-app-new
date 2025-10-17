import { logger as baseLogger } from "../../utils/serverUtils.js";
import Files, { FilesCollection } from '../dbTemplates/Files.js';
import { toObjectId } from '../db/helper.js';
import Server from "../../Server.js";

const logger = baseLogger.child({ service: 'classes/files/FilesManager.js' });

class FilesManager {
    constructor() { }

    static async createFile({
        fileId,
        originalName,
        businessId = null,
        userId = null,
        status = null,
        mimeType = null,
        kbStatus = null,
    }) {
        try {
            logger.debug('FilesManager.createFile', { fileId, originalName, businessId, userId });

            if (!fileId || !originalName) {
                throw new Error('Missing required parameters: fileId, originalName');
            }

            const existing = await Files.findByFileId(fileId);
            if (existing) {
                throw new Error(`File with fileId ${fileId} already exists`);
            }

            const fileDoc = new Files({
                fileId,
                businessId,
                userId,
                originalName,
                status,
                mimeType,
                kbStatus,
                createdAt: Date.now(),
            });

            await fileDoc.save();
            logger.debug('File created successfully', { fileDbId: fileDoc._id, fileId });
            return fileDoc;
        } catch (error) {
            logger.error('FilesManager.createFile failed', { error: error.message });
            throw error;
        }
    }

    static async updateFileMetadata(fileId, metadata = {}) {
        try {
            logger.debug('FilesManager.updateFileMetadata', { fileId, metadata });
            const fileDoc = await Files.findByFileId(fileId);
            if (!fileDoc) {
                throw new Error(`File not found for fileId: ${fileId}`);
            }

            const updateData = {};
            if (metadata.fileSize !== undefined) updateData.fileSize = metadata.fileSize;
            if (metadata.originalName !== undefined) updateData.originalName = metadata.originalName;
            if (metadata.mimeType !== undefined) updateData.mimeType = metadata.mimeType;
            if (metadata.status !== undefined) updateData.status = metadata.status;
            if (metadata.kbStatus !== undefined) updateData.kbStatus = metadata.kbStatus;

            if (Object.keys(updateData).length === 0) return fileDoc;

            await fileDoc.update(updateData);
            const bizId = fileDoc.businessId?._str || fileDoc.businessId?.toString();
            Server.RedisVentServer.triggers.update('fileapp', 'file', bizId, fileId, fileDoc);
            logger.debug('File metadata updated successfully', { fileId, fileDbId: fileDoc._id });
            return fileDoc;
        } catch (error) {
            logger.error('FilesManager.updateFileMetadata failed', { error: error.message });
            throw error;
        }
    }

    static async getFileByFileId(fileId) {
        try {
            return await Files.findByFileId(fileId);
        } catch (error) {
            logger.error('FilesManager.getFileByFileId failed', { error: error.message });
            throw error;
        }
    }

    static async getFilesByBusinessId(businessId, { limit = 50, offset = 0 } = {}) {
        try {
            const query = { businessId: toObjectId(businessId) };
            const docs = await FilesCollection.find(query, { sort: { createdAt: -1 }, limit: limit + offset }).fetchAsync();
            const sliced = docs.slice(offset, offset + limit);
            return sliced.map(d => new Files(d));
        } catch (error) {
            logger.error('FilesManager.getFilesByBusinessId failed', { error: error.message });
            throw error;
        }
    }

    // Status-based queries removed due to normalization

    static async deleteFile(fileId) {
        try {
            logger.debug('FilesManager.deleteFile', { fileId });
            const doc = await Files.findByFileId(fileId);
            if (!doc) throw new Error(`File not found for fileId: ${fileId}`);
            await doc.delete();
            logger.debug('File deleted successfully', { fileId, fileDbId: doc._id });
            return true;
        } catch (error) {
            logger.error('FilesManager.deleteFile failed', { error: error.message });
            throw error;
        }
    }

    static async getFileStats(businessId = null) {
        try {
            const query = businessId ? { businessId: toObjectId(businessId) } : {};
            const pipeline = [
                { $match: query },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        totalSize: { $sum: { $ifNull: ['$fileSize', 0] } }
                    }
                }
            ];
            const result = await FilesCollection.rawCollection().aggregate(pipeline).toArray();
            const stats = result[0] || { total: 0, totalSize: 0 };
            return stats;
        } catch (error) {
            logger.error('FilesManager.getFileStats failed', { error: error.message });
            throw error;
        }
    }

    static async cleanupFailedFiles(daysOld = 30) { return 0; }
}

export default FilesManager;


