import AttachmentManager from '../classes/attachments/AttachmentManager.js';
import { logger as baseLogger } from "../utils/serverUtils";
import { tmq as attachment } from "../../common/static_codegen/tmq/attachment";
import { tmq as inbox } from "../../common/static_codegen/tmq/inbox";
import { rawObjectId, toObjectIdArray } from '../classes/db/helper.js';
import Attachments, { AttachmentsCollection } from '../classes/dbTemplates/Attachments.js';
import Server from '../Server.js';

const logger = baseLogger.child({ service: 'services/AttachmentService.js' });

/**
 * Attachment Service for API endpoints
 * Provides REST-like interface for attachment operations
 */
export default {
    /**
     * Fetch attachments across multiple inbox IDs (merged) with pagination
     * @param {Object} call
     * @param {attachment.GetAttachmentsByInboxIdsRequest} call.request
     * @param {function} callback 
     */
    async GetAttachmentsByInboxIds({ request }, callback) {
        try {
            logger.debug('AttachmentService.GetAttachmentsByInboxIds', request);
            const rawInboxIds = Array.isArray(request.inbox_ids) ? request.inbox_ids : [];
            const ids = rawInboxIds
                .map((item) => item && (item.inbox_ids || item.inboxId || item.inbox_id))
                .filter((v) => typeof v === 'string' && v.length > 0);

            if (!ids || ids.length === 0) {
                const response = new attachment.GetAttachmentsResponse();
                response.success = false;
                response.error_message = 'inbox_ids is required';
                response.total_count = 0;
                response.attachments = [];
                callback(null, response);
                return;
            }

            // Pagination
            const page = request.page || {};
            const lastBasis = Number(
                (page.last_basis ?? page.lastBasis ?? request.last_basis ?? request.lastBasis ?? 0)
            );
            const limit = Number(
                (page.limit ?? request.limit ?? 50)
            );

            const query = { inboxId: { $in: ids.map((id) => new rawObjectId(id)) }, deletedAt: { $exists: false } };
            if (lastBasis > 0) query.createdAt = { $lt: lastBasis };

            // Use native driver when querying with raw ObjectIds to avoid type mismatch
            const col = AttachmentsCollection.rawCollection();
            const docs = await col
                .find(query, { sort: { createdAt: -1 }, limit })
                .toArray();

            const response = new attachment.GetAttachmentsResponse();
            response.success = true;
            response.error_message = '';
            response.total_count = docs.length;
            response.attachments = docs.map((entry) => {
                const msg = new attachment.Attachment();
                msg.id = entry._id?.toString?.() || String(entry._id);
                msg.business_id = entry.businessId?.toString?.() || String(entry.businessId || '');
                msg.inbox_id = entry.inboxId?.toString?.() || String(entry.inboxId || '');
                msg.interaction_id = entry.interactionId?.toString?.() || String(entry.interactionId || '');
                msg.consumer_id = entry.consumerId?.toString?.() || String(entry.consumerId || '');
                msg.channel_id = entry.channelId?.toString?.() || String(entry.channelId || '');
                msg.original_name = entry.originalName || '';
                msg.file_size = Number(entry.fileSize || 0);
                msg.mime_type = entry.mimeType || '';
                msg.file_extension = entry.fileExtension || '';
                msg.local_path = entry.localPath || '';
                msg.local_url = entry.localUrl || '';
                msg.remote_url = entry.remoteUrl || '';
                msg.source = entry.source || '';
                msg.recording_id = entry.recordingId || '';
                msg.created_at = Number(entry.createdAt || 0);
                msg.thumbnail_url = entry.thumbnailUrl || '';

                // Attributes -> AttachmentAttribute(Any)
                if (Array.isArray(entry.attributes)) {
                    msg.attributes = entry.attributes.map((attr) => {
                        const a = new attachment.AttachmentAttribute();
                        a.key = attr.key || '';
                        const any = new (require('../../common/static_codegen/google/protobuf/any').google).protobuf.Any();
                        any.type_url = 'type.googleapis.com/string';
                        any.value = Buffer.from(String(attr.value ?? ''), 'utf8');
                        a.value = any;
                        return a;
                    });
                } else {
                    msg.attributes = [];
                }

                return msg;
            });

            response.last_basis = docs.length ? Number(docs[docs.length - 1].createdAt || 0) : 0;
            callback(null, response);
        } catch (error) {
            logger.error('AttachmentService.GetAttachmentsByInboxIds error', { error: error.message });
            const response = new attachment.GetAttachmentsResponse();
            response.success = false;
            response.error_message = error.message || 'Internal server error';
            response.total_count = 0;
            response.attachments = [];
            response.last_basis = 0;
            callback(null, response);
        }
    },
    /**
     * Upload file and create attachment
     * @param {Object} call
     * @param {Object} call.request
     * @param {function} callback 
     */
    async uploadAttachment({ request }, callback) {
        try {
            logger.debug('AttachmentService.uploadAttachment', request);

            const {
                businessId,
                data, // Base64 encoded or buffer
                originalName,
                mimeType,
                source = 'api_upload',
                context = {},
                attributes = []
            } = request;

            if (!businessId || !data || !originalName) {
                const response = {
                    success: false,
                    error_message: 'Missing required fields: businessId, data, originalName',
                    attachment: null
                };
                callback(null, response);
                return;
            }

            // Convert base64 to buffer if needed
            let fileData;
            if (typeof data === 'string' && data.startsWith('data:')) {
                // Handle data URL format: data:mime/type;base64,data
                const base64Data = data.split(',')[1];
                fileData = Buffer.from(base64Data, 'base64');
            } else if (typeof data === 'string') {
                // Assume it's base64
                fileData = Buffer.from(data, 'base64');
            } else {
                fileData = data;
            }

            const attachment = await AttachmentManager.uploadAndCreateAttachment({
                businessId,
                data: fileData,
                originalName,
                mimeType,
                source,
                context,
                attributes
            });

            const response = {
                success: true,
                error_message: '',
                attachment: attachment.toObject()
            };

            callback(null, response);

        } catch (error) {
            logger.error('AttachmentService.uploadAttachment error', { error: error.message });
            const response = {
                success: false,
                error_message: error.message || 'Upload failed',
                attachment: null
            };
            callback(null, response);
        }
    },

    /**
     * Download file from URL and create attachment
     * @param {Object} call
     * @param {Object} call.request
     * @param {function} callback 
     */
    async downloadAttachment({ request }, callback) {
        try {
            logger.debug('AttachmentService.downloadAttachment', request);

            const {
                businessId,
                remoteUrl,
                originalName,
                source = 'api_download',
                context = {},
                attributes = []
            } = request;

            if (!businessId || !remoteUrl) {
                const response = {
                    success: false,
                    error_message: 'Missing required fields: businessId, remoteUrl',
                    attachment: null
                };
                callback(null, response);
                return;
            }

            const attachment = await AttachmentManager.downloadAndCreateAttachment({
                businessId,
                remoteUrl,
                originalName,
                source,
                context,
                attributes
            });

            const response = {
                success: true,
                error_message: '',
                attachment: attachment.toObject()
            };

            callback(null, response);

        } catch (error) {
            logger.error('AttachmentService.downloadAttachment error', { error: error.message });
            const response = {
                success: false,
                error_message: error.message || 'Download failed',
                attachment: null
            };
            callback(null, response);
        }
    },

    /**
     * Get attachments with filters
     * @param {Object} call
     * @param {Object} call.request
     * @param {function} callback 
     */
    async getAttachments({ request }, callback) {
        try {
            logger.debug('AttachmentService.getAttachments', request);

            const {
                businessId,
                filters = {},
                pagination = {}
            } = request;

            if (!businessId) {
                const response = {
                    success: false,
                    error_message: 'Missing required field: businessId',
                    attachments: [],
                    total_count: 0
                };
                callback(null, response);
                return;
            }

            const attachments = await AttachmentManager.getAttachments({
                businessId,
                ...filters,
                limit: pagination.limit || 50,
                offset: pagination.offset || 0
            });

            const response = {
                success: true,
                error_message: '',
                attachments: attachments.map(a => a.toObject()),
                total_count: attachments.length
            };

            callback(null, response);

        } catch (error) {
            logger.error('AttachmentService.getAttachments error', { error: error.message });
            const response = {
                success: false,
                error_message: error.message || 'Failed to get attachments',
                attachments: [],
                total_count: 0
            };
            callback(null, response);
        }
    },

    /**
     * Get attachment by ID
     * @param {Object} call
     * @param {Object} call.request
     * @param {function} callback 
     */
    async getAttachment({ request }, callback) {
        try {
            logger.debug('AttachmentService.getAttachment', request);

            const { attachmentId } = request;

            if (!attachmentId) {
                const response = {
                    success: false,
                    error_message: 'Missing required field: attachmentId',
                    attachment: null
                };
                callback(null, response);
                return;
            }

            const attachment = await AttachmentManager.getAttachmentById(attachmentId);

            const response = {
                success: true,
                error_message: '',
                attachment: attachment ? attachment.toObject() : null
            };

            callback(null, response);

        } catch (error) {
            logger.error('AttachmentService.getAttachment error', { error: error.message });
            const response = {
                success: false,
                error_message: error.message || 'Failed to get attachment',
                attachment: null
            };
            callback(null, response);
        }
    },

    /**
     * Get attachments by recording ID
     * @param {Object} call
     * @param {Object} call.request
     * @param {function} callback 
     */
    async getAttachmentsByRecordingId({ request }, callback) {
        try {
            logger.debug('AttachmentService.getAttachmentsByRecordingId', request);

            const { recordingId } = request;

            if (!recordingId) {
                const response = {
                    success: false,
                    error_message: 'Missing required field: recordingId',
                    attachments: [],
                    total_count: 0
                };
                callback(null, response);
                return;
            }

            const attachments = await AttachmentManager.getAttachmentsByRecordingId(recordingId);

            const response = {
                success: true,
                error_message: '',
                attachments: attachments.map(a => a.toObject()),
                total_count: attachments.length
            };

            callback(null, response);

        } catch (error) {
            logger.error('AttachmentService.getAttachmentsByRecordingId error', { error: error.message });
            const response = {
                success: false,
                error_message: error.message || 'Failed to get attachments by recording ID',
                attachments: [],
                total_count: 0
            };
            callback(null, response);
        }
    },

    /**
     * Update attachment metadata
     * @param {Object} call
     * @param {Object} call.request
     * @param {function} callback 
     */
    async updateAttachment({ request }, callback) {
        try {
            logger.debug('AttachmentService.updateAttachment', request);

            const { attachmentId, updateData } = request;

            if (!attachmentId || !updateData) {
                const response = {
                    success: false,
                    error_message: 'Missing required fields: attachmentId, updateData',
                    attachment: null
                };
                callback(null, response);
                return;
            }

            const attachment = await AttachmentManager.updateAttachment(attachmentId, updateData);

            const response = {
                success: true,
                error_message: '',
                attachment: attachment.toObject()
            };

            callback(null, response);

        } catch (error) {
            logger.error('AttachmentService.updateAttachment error', { error: error.message });
            const response = {
                success: false,
                error_message: error.message || 'Failed to update attachment',
                attachment: null
            };
            callback(null, response);
        }
    },
    /**
     * Get attachment statistics
     * @param {Object} call
     * @param {Object} call.request
     * @param {function} callback 
     */
    async getAttachmentStats({ request }, callback) {
        try {
            logger.debug('AttachmentService.getAttachmentStats', request);

            const { businessId } = request;

            if (!businessId) {
                const response = {
                    success: false,
                    error_message: 'Missing required field: businessId',
                    stats: null
                };
                callback(null, response);
                return;
            }

            const stats = await AttachmentManager.getAttachmentStats(businessId);

            const response = {
                success: true,
                error_message: '',
                stats
            };

            callback(null, response);

        } catch (error) {
            logger.error('AttachmentService.getAttachmentStats error', { error: error.message });
            const response = {
                success: false,
                error_message: error.message || 'Failed to get attachment stats',
                stats: null
            };
            callback(null, response);
        }
    },
    /**
     * Soft-delete an attachment by id (sets deletedAt) and emit RedisVent remove
     */
    async DeleteAttachment({ request }, callback) {
        try {
            const attachmentId = request.attachment_id || request.attachmentId || request.id;
            if (!attachmentId || typeof attachmentId !== 'string') {
                callback(null, { success: false, error_message: 'missing_attachment_id' });
                return;
            }

            const col = AttachmentsCollection.rawCollection();
            const _id = new rawObjectId(attachmentId);
            const existing = await col.findOne({ _id });

            if (!existing) {
                callback(null, { success: false, error_message: 'attachment_not_found' });
                return;
            }

            await col.updateOne({ _id }, { $set: { deletedAt: Date.now() } });

            try {
                const consumerid = existing.consumerId?.toString?.() || String(existing.consumerId || '');
                if (consumerid) Server.RedisVentServer.triggers.remove('attachmentapp', 'attachment', consumerid, attachmentId);
            } catch (_) { }

            callback(null, { success: true, error_message: '' });
        } catch (error) {
            callback(null, { success: false, error_message: error?.message || 'delete_failed' });
        }
    }
};
