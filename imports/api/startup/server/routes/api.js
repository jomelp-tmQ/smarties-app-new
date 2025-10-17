import { WebApp } from 'meteor/webapp';
import fs from 'fs';
import path from 'path';
import bodyParser from 'body-parser';
import connectRoute from 'connect-route';
import { LogLevel, Logger } from "@tmq/logger";
import { fetch } from "meteor/fetch";

import SchemaErrorHandler from '../../../server/utils/schemaErrorHandler.js';
import InteractionManager from '../../../server/classes/interactions/InteractionManager.js';
import AttachmentManager from '../../../server/classes/attachments/AttachmentManager.js';
import UploadsManager from '../../../server/classes/uploads/UploadsManager.js';
import FilesManager from '../../../server/classes/files/FilesManager.js';
import Server from '../../../server/Server.js';
import Interactions from '../../../server/classes/dbTemplates/Interactions.js';
import Sessions, { SessionsCollection } from '../../../server/classes/dbTemplates/Sessions.js';
import PageViews from '../../../server/classes/dbTemplates/PageViews.js';
import { IdentityResolution } from '../../../server/classes/identity/IdentityResolution.js';
import { rankPersonsForConsumer } from '../../../server/classes/identity/IdentityRanker.js';
import { Path } from "@tmq-dev-ph/tmq-dev-core-server";
// PIPELINE PROCESSORS
import { PostOutboundRequestProcessor } from "../../../server/classes/pipeline/processors/postOutboundRequestProcessor.js";
import { PostInboundRequestProcessor } from "../../../server/classes/pipeline/processors/postInboundRequestProcessor.js";
import { ChannelProviderProcessor } from "../../../server/classes/pipeline/processors/channelProviderProcessor.js";
import { HttpOutboundProcessor } from "../../../server/classes/pipeline/processors/httpOutboundProcessor.js";
import { HttpInboundProcessor } from "../../../server/classes/pipeline/processors/httpInboundProcessor.js";
import { InteractionProcessor } from "../../../server/classes/pipeline/processors/interactionProcessor.js";
import { ConsumerProcessor } from "../../../server/classes/pipeline/processors/consumerProcessor.js";
import { BusinessProcessor } from "../../../server/classes/pipeline/processors/businessProcessor.js";
import { ChannelProcessor } from "../../../server/classes/pipeline/processors/channelProcessor.js";
import { HttpOutProcessor } from "../../../server/classes/pipeline/processors/httpOutProcessor.js";
import { httpResponseFrame } from "../../../server/classes/pipeline/frames/httpResponseFrame.js";
import { PersonProcessor } from "../../../server/classes/pipeline/processors/personProcessor.js";
import { InboxProcessor } from "../../../server/classes/pipeline/processors/inboxProcessor.js";
import { httpReqFrame } from "../../../server/classes/pipeline/frames/httpReqFrame.js";
import { Pipeline } from "../../../server/classes/pipeline/pipeline.js";
import { AttachmentProcessor } from "../../../server/classes/pipeline/processors/attachmentProcessor.js";
import { KnowledgeBaseFile } from '../../../server/classes/dbTemplates/KnowledgeBase.js';
import multer from 'multer';
import axios from 'axios';


// SESSIONS PIPELINE
import { SessionRequestProcessor } from "../../../server/classes/pipeline/processors/sessions/sessionRequestProcessor.js";
import { SessionsManager } from "../../../server/classes/pipeline/processors/sessions/sessionsManager.js";
import { PageViewProcessor } from "../../../server/classes/pipeline/processors/sessions/pageViewProcessor.js";
import { PostSessionRequest } from "../../../server/classes/pipeline/processors/sessions/postSessionRequest.js";
import Uploads from '../../../server/classes/dbTemplates/Uploads.js';

// CRAWL
import CrawlPages from '../../../server/classes/dbTemplates/CrawlPages.js';
import Crawl from '../../../server/classes/dbTemplates/Crawl.js';

import { Meteor } from 'meteor/meteor';
import { logger as baseLogger } from '../../../server/utils/serverUtils.js';
const logger = baseLogger.child({ service: 'routes/api.js' });


Logger.setLogLevel(LogLevel.DEBUG);

// ---- HTTP Wiring ----
WebApp.connectHandlers.use(bodyParser.json());
WebApp.connectHandlers.use(bodyParser.urlencoded({ extended: false }));
WebApp.connectHandlers.use(multer({ storage: multer.memoryStorage() }).single('file'));

// Ensure and serve local upload directory (inside app root)
const UPLOAD_DIR = Path.UPLOAD;
try {
    if (!fs.existsSync(UPLOAD_DIR)) {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
    logger.info('Upload directory ensured', { uploadDir: UPLOAD_DIR });
} catch (e) {
    logger.error('Failed to ensure upload directory', { error: e?.message || e });
}
// NOTE: Removed serving of local /.upload files; rely on remote URLs

const includeMetaKeys = [
    "correlation_id", "idempotency_key", "tenant", "attempt", "provider", "type", "identifier", "externalId", "messageId", "agentId", "consumerId", "channelId", "inboxId", "from", "to"
];
const includeSessionMetaKeys = [
    "correlation_id", "idempotency_key", "externalSessionId", "status", "title", "path", "slug"
];

WebApp.connectHandlers.use('/api/b', connectRoute((router) => {
    // Inbound webhook --> persist + update inbox
    router.post('/:slug/channels/messages/inbound', async (req, res) => {
        const { slug } = req.params;
        const ctx = { slug, ...buildRequestContext(req) };
        logger.info('Inbound webhook received', ctx);
        const pipeline = new Pipeline([
            new HttpInboundProcessor(),
            new BusinessProcessor(),
            new ChannelProcessor(),
            new ConsumerProcessor(),
            new PersonProcessor(),
            new InboxProcessor(),
            new InteractionProcessor(),
            new AttachmentProcessor(),
            // #TODOS: BILLING HERE
            new PostInboundRequestProcessor(),
            new HttpOutProcessor(req, res),
        ], {
            onTrace: (proc, event, data) => {
                if (event === 'error') {
                    logger.error('Pipeline error', { processor: proc, event, meta: data?.meta });
                } else if (event === 'start' || event === 'end') {
                    logger.debug('Pipeline trace', { processor: proc, event });
                }
                // richer error context now available:
                if (event === "error") {
                    // data.kind, data.meta, data.framePtsNs, data.stage…
                    pipeline.push(new httpResponseFrame({ status: 500, body: { message: "Internal server error" } }, data.meta || {}, data.framePtsNs));
                }
            },
            trace: {
                verbose: true,
                suppressProcessorIn: true,
                includeMetaKeys: includeMetaKeys,
                previewKeys: ["text", "body", "parsedbody", "inbox", "consumer", "interaction"],
                maxPreview: 360,
            },
        });
        pipeline.start();
        pipeline.push(new httpReqFrame(req, res));
    });
    router.post('/:slug/channels/messages/outbound', async (req, res) => {
        const { slug } = req.params;
        const ctx = { slug, ...buildRequestContext(req) };
        logger.info('Outbound webhook received', ctx);
        const pipeline = new Pipeline([
            new HttpOutboundProcessor(),
            new BusinessProcessor(),
            new ChannelProcessor(),
            new ConsumerProcessor(),
            new InboxProcessor(),
            new InteractionProcessor(),
            new ChannelProviderProcessor(),
            new PostOutboundRequestProcessor(),
            // #TODOS: BILLING HERE
            new HttpOutProcessor(req, res),
        ], {
            onTrace: (proc, event, data) => {
                if (event === 'error') {
                    logger.error('Pipeline error', { processor: proc, event, meta: data?.meta });
                }
                if (event === "error") {
                    // Use meta and framePtsNs provided by pipeline error trace
                    pipeline.push(new httpResponseFrame({ status: 500, body: { message: "Internal server error" } }, data.meta || {}, data.framePtsNs));
                }
            },
            trace: {
                verbose: true,
                suppressProcessorIn: true,
                includeMetaKeys: includeMetaKeys,
                previewKeys: ["text", "body", "parsedbody", "inbox", "consumer", "interaction"],
                maxPreview: 360,
            },
        });
        pipeline.start();
        pipeline.push(new httpReqFrame(req, res));

    });
    router.post('/:slug/receipt', async (req, res) => {
        const { slug } = req.params;
        logger.info('Receipt webhook received', { slug, ...buildRequestContext(req) });
        try {
            const { messageId, interactionId, status } = InteractionManager.normalizeReceipt(req.body || {});
            if (interactionId) {
                await InteractionManager.updateInteraction({ interactionId, status });
            } else if (messageId) {
                await InteractionManager.updateInteraction({ messageId, status });
            }
            InteractionManager.ok(res, { slug, message: "Receipt received" });
        } catch (error) {
            if (SchemaErrorHandler.isValidationError(error)) {
                const errorResponse = SchemaErrorHandler.createErrorResponse(error, {
                    operation: 'receipt_webhook',
                    businessSlug: slug,
                    requestData: req.body
                });
                SchemaErrorHandler.logValidationError(error, 'receipt webhook processing', req.body);
                InteractionManager.bad(res, 400, errorResponse);
            } else {
                InteractionManager.bad(res, 400, error.message || 'receipt_failed');
            }
        }

    });
    router.post('/:slug/channels/messages/recording-update', async (req, res) => {
        try {
            const { slug } = req.params;
            logger.info('Recording update webhook received', { slug, ...buildRequestContext(req) });
            const biz = await InteractionManager.resolveBusinessBySlug(slug);

            const event = req.body || {};
            const type = String(event.type || '').trim();
            const data = event.data || {};
            const meta = data.metadata || {};

            const fileId = data.uuid || data.key || meta.uuid || meta.key;
            if (!fileId) {
                return InteractionManager.bad(res, 400, 'missing_fileId');
            }

            const originalName = meta.originalName || data.originalName || `${fileId}`;
            const mimeType = meta.mimeType || meta.mimetype || null;
            const fileExtension = (meta.extension || path.extname(originalName || '') || '').toLowerCase();
            const fileSize = typeof meta.size === 'number' ? meta.size : null;

            const remoteUrl = `${Server.Config.server.rabbitFile.url}/download/${fileId}`;

            let uploadsUpdated = false;
            let filesUpdated = false;
            let attachmentsUpdated = 0;
            let status = 'pending';

            if (type === 'file.upload_failed') {
                status = 'failed';
                try { await UploadsManager.markUploadFailed(fileId, event?.error || meta?.error || null); uploadsUpdated = true; } catch (_) { }
                try { await FilesManager.updateFileMetadata(fileId, { status: 'failed' }); filesUpdated = true; } catch (_) { }
                // Update related attachments to reflect failed status
                try {
                    const atts = await AttachmentManager.getAttachmentsByRecordingId(String(fileId));
                    if (Array.isArray(atts) && atts.length > 0) {
                        for (const att of atts) {
                            try {
                                const baseAttrs = Array.isArray(att.attributes) ? att.attributes : [];
                                const filtered = baseAttrs.filter(a => a && a.key !== 'status');
                                const newAttributes = [...filtered, { key: 'status', value: 'failed' }];
                                await AttachmentManager.updateAttachment(att._id, { attributes: newAttributes });
                                attachmentsUpdated++;
                            } catch (_) { }
                        }
                    }
                } catch (_) { }
                // Vent file status update
                try { const fr = await FilesManager.getFileByFileId(fileId); if (fr) { Server.RedisVentServer.triggers.update('fileapp', 'file', biz?._id, fileId, fr); } } catch (_) { }
            } else if (type === 'file.upload_completed') {
                status = 'completed';
                try {
                    await UploadsManager.updateUploadMetadata(fileId, {
                        fileSize,
                        mimeType,
                        fileExtension,
                        remoteUrl
                    }, { finalize: true });
                    uploadsUpdated = true;
                } catch (_) { }
                // Update originalName on Uploads if available
                try {
                    if (originalName) {
                        const upload = await UploadsManager.getUploadByFileId(fileId);
                        if (upload && upload.originalName !== originalName) {
                            await upload.update({ originalName });
                        }
                    }
                } catch (_) { }

                try {
                    let fileRec = await FilesManager.getFileByFileId(fileId);
                    if (!fileRec) {
                        try {
                            await FilesManager.createFile({
                                fileId,
                                originalName: originalName || `${fileId}`,
                                businessId: biz?._id,
                                status,
                                mimeType
                            });
                        } catch (_) { }
                    }
                    await FilesManager.updateFileMetadata(fileId, {
                        fileSize,
                        originalName: originalName || `${fileId}`,
                        mimeType,
                        status
                    });
                    // Update originalName on Files if present
                    try {
                        if (originalName) {
                            const fileRec2 = await FilesManager.getFileByFileId(fileId);
                            if (fileRec2 && fileRec2.originalName !== originalName) {
                                await fileRec2.update({ originalName });
                            }
                        }
                    } catch (_) { }
                    filesUpdated = true;
                } catch (_) { }
                // Vent file status update
                try { const fr = await FilesManager.getFileByFileId(fileId); if (fr) { Server.RedisVentServer.triggers.update('fileapp', 'file', biz?._id, fileId, fr); } } catch (_) { }

                // Queue for Knowledge Base ingestion
                try {
                    await FilesManager.updateFileMetadata(fileId, { kbStatus: 'completed' });
                    try { const fr2 = await FilesManager.getFileByFileId(fileId); if (fr2) { Server.RedisVentServer.triggers.update('fileapp', 'file', biz?._id, fileId, fr2); } } catch (_) { }
                    // send to KB ingest using remoteUrl
                    const bizId = biz?._id?._str || biz?._id?.toString() || String(biz?._id || '');
                    try {
                        const upload = await Uploads.findByFileId(fileId);
                        const url = await upload.getPresignedUrl();
                        await KnowledgeBaseFile.sendToIngest({
                            businessId: bizId,
                            fileId,
                            url,
                            hook: `${Server.Config.host}/api/b/${slug}/channels/messages/kb-update`,
                            meta: { originalName, mimeType, fileExtension, fileSize }
                        });
                    } catch (kbErr) {
                        try { await FilesManager.updateFileMetadata(fileId, { kbStatus: 'failed' }); } catch (_) { }
                        try { const fr3 = await FilesManager.getFileByFileId(fileId); if (fr3) { Server.RedisVentServer.triggers.update('fileapp', 'file', biz?._id, fileId, fr3); } } catch (_) { }
                    }
                } catch (_) { }

                try {
                    const atts = await AttachmentManager.getAttachmentsByRecordingId(String(fileId));
                    if (Array.isArray(atts) && atts.length > 0) {
                        for (const att of atts) {
                            try {
                                const baseAttrs = Array.isArray(att.attributes) ? att.attributes : [];
                                const filtered = baseAttrs.filter(a => a && a.key !== 'status');
                                const newAttributes = [...filtered, { key: 'status', value: 'completed' }];
                                await AttachmentManager.updateAttachment(att._id, {
                                    remoteUrl,
                                    fileSize: fileSize ?? att.fileSize ?? null,
                                    mimeType: mimeType ?? att.mimeType ?? null,
                                    fileExtension: fileExtension || att.fileExtension || null,
                                    originalName: originalName || att.originalName || fileId,
                                    attributes: newAttributes
                                });
                                attachmentsUpdated++;
                                const consumerId = att.consumerId?._str || att.consumerId?.toString() || String(att.consumerId);
                                Server.RedisVentServer.triggers.update('attachmentapp', 'attachment', consumerId, fileId, { ...att, remoteUrl, fileSize: fileSize ?? att.fileSize ?? null, mimeType: mimeType ?? att.mimeType ?? null, fileExtension: fileExtension || att.fileExtension || null, originalName: originalName || att.originalName || fileId, attributes: newAttributes });
                            } catch (_) { }
                        }
                    }
                } catch (_) { }
            } else {
                status = 'pending';
                try {
                    const upload = await UploadsManager.getUploadByFileId(fileId);
                    if (upload) {
                        upload.markAsPending();
                        await upload.save();
                        uploadsUpdated = true;
                    }
                } catch (_) { }

                try {
                    let fileRec = await FilesManager.getFileByFileId(fileId);
                    if (!fileRec) {
                        await FilesManager.createFile({
                            fileId,
                            originalName: originalName || `${fileId}`,
                            businessId: biz?._id,
                            status
                        });
                        filesUpdated = true;
                    }
                } catch (_) { }
                // Ensure Files status is set to pending
                try { await FilesManager.updateFileMetadata(fileId, { status: 'pending' }); filesUpdated = true; } catch (_) { }
                // Vent file status update
                try { const fr = await FilesManager.getFileByFileId(fileId); if (fr) { Server.RedisVentServer.triggers.update('fileapp', 'file', biz?._id, fileId, fr); } } catch (_) { }
            }

            return InteractionManager.ok(res, {
                businessId: biz?._id,
                fileId,
                status,
                uploadsUpdated,
                filesUpdated,
                attachmentsUpdated
            });
        } catch (err) {
            if (SchemaErrorHandler.isValidationError(err)) {
                const errorResponse = SchemaErrorHandler.createErrorResponse(err, {
                    operation: 'recording_update',
                    requestData: req.body
                });
                SchemaErrorHandler.logValidationError(err, 'recording-update processing', req.body);
                res.setHeader('Content-Type', 'application/json');
                res.writeHead(400);
                return res.end(JSON.stringify(errorResponse));
            } else {
                return InteractionManager.bad(res, 400, err?.message || 'recording_update_failed');
            }
        }
    });
    router.post('/:slug/channels/messages/kb-update', async (req, res) => {
        const { slug } = req.params;
        logger.info('KB update webhook received', { slug, ...buildRequestContext(req) });
        try {
            const biz = await InteractionManager.resolveBusinessBySlug(slug);
            const body = req.body || {};
            const data = body.data || body;
            const fileId = data.fileId || data.id;
            const st = (data.status || data.state).toString().toLowerCase();
            if (!fileId) return InteractionManager.bad(res, 400, 'missing_fileId');
            let kbStatus = null;
            if (st.includes('complete') || st === 'done' || st === 'success' || st === 'completed') kbStatus = 'completed';
            else if (st.includes('fail') || st === 'error') kbStatus = 'failed';
            if (!kbStatus) kbStatus = 'completed'; // default to completed if ambiguous
            try { await FilesManager.updateFileMetadata(fileId, { kbStatus }); } catch (_) { }
            try { const fr = await FilesManager.getFileByFileId(fileId); if (fr) { Server.RedisVentServer.triggers.update('fileapp', 'file', biz?._id, fileId, fr); } } catch (_) { }
            return InteractionManager.ok(res, { success: true, fileId, kbStatus });
        } catch (error) {
            return InteractionManager.bad(res, 500, error?.message || 'kb_update_failed');
        }
    });
    router.post('/:slug/sessions', async (req, res) => {
        const { slug } = req.params;
        logger.info('Session webhook received', { slug, ...buildRequestContext(req) });
        try {
            const pipeline = new Pipeline([
                new SessionRequestProcessor(),
                new SessionsManager(),
                new PageViewProcessor(),
                new PostSessionRequest(),
                new HttpOutProcessor(req, res),
            ], {
                onTrace: (proc, event, data) => {
                    // Logger.debug(`[${proc}] [${event}]`, data);
                },
                trace: {
                    verbose: true,
                    suppressProcessorIn: true,
                    includeMetaKeys: includeSessionMetaKeys,
                    previewKeys: ["text", "body", "parsedbody", "inbox", "consumer", "interaction"],
                    maxPreview: 360,
                },
            });
            pipeline.start();
            pipeline.push(new httpReqFrame(req, res));
        } catch (error) {
            InteractionManager.bad(res, 400, error.message || 'session_failed');
        }
    });
    router.post('/:slug/page-views', async (req, res) => {
        const { slug } = req.params;
        logger.info('Page-view webhook received', { slug, ...buildRequestContext(req) });
        try {
            const pipeline = new Pipeline([
                new SessionRequestProcessor(),
                new SessionsManager(),
                new PageViewProcessor(),
                new PostSessionRequest(),
                new HttpOutProcessor(req, res),
            ], {
                onTrace: (proc, event, data) => {
                    // Logger.debug(`[${proc}] [${event}]`, data);
                },
                trace: {
                    verbose: true,
                    suppressProcessorIn: true,
                    includeMetaKeys: includeSessionMetaKeys,
                    previewKeys: ["text", "body", "parsedbody", "inbox", "consumer", "interaction"],
                    maxPreview: 360,
                },
            });
            pipeline.start();
            pipeline.push(new httpReqFrame(req, res));
        } catch (error) {
            InteractionManager.bad(res, 400, error.message || 'session_failed');
        }
    });

    // ---- Attachment Management Routes ----
    // File upload endpoint
    router.post('/:slug/upload', async (req, res, next) => {
        const { slug } = req.params;
        if (req.method !== 'POST') return next();
        try {
            if (!req.file) {
                res.setHeader('Content-Type', 'application/json');
                res.writeHead(400);
                return res.end(JSON.stringify({ error: 'no_file', message: 'No file provided' }));
            }
            const biz = await InteractionManager.resolveBusinessBySlug(slug);
            const businessId = biz._id;
            const { originalname, mimetype, size, buffer } = req.file;
            // Forward to rabbit-file using in-memory buffer (no local disk storage)
            const FormData = require('form-data');
            const form = new FormData();
            form.append('file', buffer, {
                filename: originalname,
                contentType: mimetype,
            });
            form.append('hook', `${Server.Config.host}/api/b/${slug}/channels/messages/recording-update`);
            const result = await axios.post(`${Server.Config.server.rabbitFile.url}/upload`, form, {
                headers: form.getHeaders(),
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
            });

            // Extract identifiers from remote response
            const fileId = result?.data?.uuid || result?.data?.key;
            const statusUrlRel = result?.data?.statusUrl || '';
            const statusUrl = `${Server.Config.server.rabbitFile.url}${statusUrlRel}`;

            // Create Upload record and store metadata with remote copy
            try {
                await UploadsManager.createUpload({
                    fileId,
                    originalName: originalname,
                    source: 'api_upload',
                    statusUrl,
                    businessId: businessId,
                    attributes: []
                });
            } catch (createErr) {
                // If already exists, continue to metadata update
                if (!String(createErr?.message || '').includes('already exists')) {
                    // Non-duplicate error: still proceed to update if possible
                }
            }

            // Compute metadata (remote only)
            const fileExtension = (path.extname(originalname || '') || '').toLowerCase();
            const remoteUrl = `${Server.Config.server.rabbitFile.url}/download/${fileId}`;

            try {
                await UploadsManager.updateUploadMetadata(fileId, {
                    fileSize: size ?? null,
                    mimeType: mimetype,
                    fileExtension,
                    remoteUrl,
                });
            } catch (updateErr) {
                // If update fails, mark upload failed but keep local file
                try { await UploadsManager.markUploadFailed(fileId, updateErr?.message || String(updateErr)); } catch (_) { }
            }

            // Create Files record (page-specific simplified copy without attributes/source)
            try {
                const data = await FilesManager.createFile({
                    fileId,
                    originalName: originalname,
                    businessId: businessId,
                    status: 'pending',
                    mimeType: mimetype
                });
                const bizId = data.businessId?._str || data.businessId?.toString();
                Server.RedisVentServer.triggers.insert('fileapp', 'file', bizId, fileId,
                    // data
                    data
                );
                await FilesManager.updateFileMetadata(fileId, {
                    fileSize: size ?? null,
                    originalName: originalname,
                    mimeType: mimetype,
                    status: 'pending'
                });

            } catch (filesErr) {
                Logger.warn('Failed to create/update Files record', filesErr?.message || filesErr);
            }

            res.setHeader('Content-Type', 'application/json');
            res.writeHead(200);
            return res.end(JSON.stringify({ success: true, message: 'File uploaded successfully', data: result.data }));
        } catch (error) {
            try {
                // nothing to cleanup when using memory storage
            } catch (_) { }
            res.setHeader('Content-Type', 'application/json');
            res.writeHead(500);
            return res.end(JSON.stringify({ error: 'upload_failed', message: error?.message || String(error) }));
        }
    });

    // File download endpoint - streams files from rabbit-file to frontend
    router.get('/download/:fileId', async (req, res, next) => {
        try {
            const { fileId } = req.params;
            if (!fileId) {
                res.setHeader('Content-Type', 'application/json');
                res.writeHead(400);
                return res.end(JSON.stringify({ error: 'missing_fileId', message: 'File ID is required' }));
            }

            // Check Uploads status first
            let uploadStatus = null;
            let uploadStatusUrl = null;
            try {
                const upload = await UploadsManager.getUploadByFileId(fileId);
                if (upload) {
                    uploadStatus = upload.status;
                    uploadStatusUrl = upload.statusUrl;
                }
            } catch (_) { }

            // If pending, query rabbit-file status endpoint to resolve availability
            if (uploadStatus === 'pending' && uploadStatusUrl) {
                try {
                    const statusResp = await axios.get(uploadStatusUrl);
                    const rf = statusResp?.data || {};
                    const rfState = rf.state || rf.status || null;

                    if (rfState === 'stored') {
                        // File is available, sync metadata to Uploads/Files/Attachments where they exist
                        const detectedExt = rf.ext ? `.${String(rf.ext).toLowerCase()}` : (path.extname(rf.name || '') || '').toLowerCase();
                        const detectedMime = rf.mime || null;
                        const detectedSize = typeof rf.size === 'number' ? rf.size : null;
                        const remoteUrl = `${Server.Config.server.rabbitFile.url}/download/${fileId}`;

                        try { await UploadsManager.updateUploadMetadata(fileId, { fileSize: detectedSize, mimeType: detectedMime, fileExtension: detectedExt, remoteUrl }, { finalize: true }); } catch (_) { }
                        try { const fileDoc = await FilesManager.getFileByFileId(fileId); if (fileDoc) { await FilesManager.updateFileMetadata(fileId, { fileSize: detectedSize }); } } catch (_) { }
                        try {
                            const atts = await AttachmentManager.getAttachmentsByRecordingId(String(fileId));
                            if (Array.isArray(atts) && atts.length > 0) {
                                for (const att of atts) {
                                    try { await AttachmentManager.updateAttachment(att._id, { remoteUrl, fileSize: detectedSize ?? att.fileSize ?? null, mimeType: detectedMime ?? att.mimeType ?? null, fileExtension: detectedExt || att.fileExtension || null }); } catch (_) { }
                                }
                            }
                        } catch (_) { }
                        // proceed to streaming below
                    } else if (rfState === 'deleted' || rfState === 'failed') {
                        try { await UploadsManager.markUploadFailed(fileId, rfState); } catch (_) { }
                        res.setHeader('Content-Type', 'application/json');
                        res.writeHead(410);
                        return res.end(JSON.stringify({ status: 'failed', error: 'file_unavailable', message: 'File upload failed or was deleted', fileId }));
                    } else {
                        res.setHeader('Content-Type', 'application/json');
                        res.writeHead(202);
                        return res.end(JSON.stringify({ status: 'pending', message: 'File is still being processed', fileId }));
                    }
                } catch (_) {
                    // If statusUrl check fails, fall through to existing behavior
                }
            } else if (uploadStatus === 'failed') {
                res.setHeader('Content-Type', 'application/json');
                res.writeHead(410);
                return res.end(JSON.stringify({ status: 'failed', error: 'file_unavailable', message: 'File upload failed and is not available', fileId }));
            }

            // Get download info from rabbit-file (final check and streaming)
            const downloadInfoUrl = `${Server.Config.server.rabbitFile.url}/download/${fileId}`;
            const downloadInfo = await axios.get(downloadInfoUrl);

            if (!downloadInfo.data?.success || !downloadInfo.data?.downloadUrl) {
                res.setHeader('Content-Type', 'application/json');
                res.writeHead(404);
                return res.end(JSON.stringify({ error: 'file_not_found', message: 'File not found or download URL unavailable' }));
            }

            const { downloadUrl, metadata } = downloadInfo.data;
            const { originalName, mimeType } = metadata || {};

            // Set appropriate headers for streaming
            res.setHeader('Content-Type', mimeType || 'application/octet-stream');
            if (originalName) {
                res.setHeader('Content-Disposition', `inline; filename="${originalName}"`);
            }

            // Stream the file from the download URL to the client
            const fileResponse = await fetch(downloadUrl);
            if (!fileResponse.ok) {
                res.setHeader('Content-Type', 'application/json');
                res.writeHead(500);
                return res.end(JSON.stringify({ error: 'download_failed', message: 'Failed to fetch file from storage' }));
            }

            // Pipe the file stream to the response
            fileResponse.body.pipe(res);

        } catch (error) {
            logger.error('File download error', { error: error?.message || String(error), ...buildRequestContext(req) });
            res.setHeader('Content-Type', 'application/json');
            res.writeHead(500);
            return res.end(JSON.stringify({ error: 'download_error', message: error?.message || 'Download failed' }));
        }
    });

    // Download/serve attachment by explicit id
    router.get('/:slug/attachments/:id', async (req, res) => {
        try {
            const { id } = req.params;
            if (!id) return InteractionManager.bad(res, 400, 'missing_attachment_identifier');
            const attachment = await AttachmentManager.getAttachmentById(id);
            if (!attachment) return InteractionManager.bad(res, 404, 'attachment_not_found');

            // Prefer serving local file if available
            if (attachment.localPath) {
                try {
                    const stats = await fs.promises.stat(attachment.localPath);
                    if (!stats.isFile()) throw new Error('not_a_file');
                    const filename = (attachment.originalName || `attachment_${attachment._id}`).replace(/[^a-zA-Z0-9._-]/g, '_');
                    res.setHeader('Content-Type', attachment.mimeType || 'application/octet-stream');
                    res.setHeader('Content-Length', String(stats.size));
                    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
                    const stream = fs.createReadStream(attachment.localPath);
                    stream.on('error', () => InteractionManager.bad(res, 500, 'stream_error'));
                    return stream.pipe(res);
                } catch (_) { /* fallback below */ }
            }

            // Fallback to localUrl (served by /.upload) or remoteUrl
            const redirectUrl = attachment.localUrl || attachment.remoteUrl;
            if (redirectUrl) {
                res.writeHead(302, { Location: redirectUrl });
                return res.end();
            }

            return InteractionManager.bad(res, 404, 'attachment_source_not_found');
        } catch (error) {
            return InteractionManager.bad(res, 500, error?.message || 'attachment_download_failed');
        }
    });
    // Delete attachment by id
    router.delete('/:slug/attachments/:id', async (req, res) => {
        try {
            const { id } = req.params;
            if (!id) return InteractionManager.bad(res, 400, 'missing_attachment_id');
            // Fetch first to capture routing keys for vent
            const existing = await AttachmentManager.getAttachmentById(id);
            const consumerid = existing?.consumerId?._str || existing?.consumerId?.toString();
            await AttachmentManager.deleteAttachment(id);
            // Vent: notify attachment removal for this consumer
            try {
                if (consumerid) Server.RedisVentServer.triggers.remove('attachmentapp', 'attachment', consumerid, id);
            } catch (ventErr) {
                Logger.warn('Attachment remove vent failed', ventErr?.message || ventErr);
            }
            res.setHeader('Content-Type', 'application/json');
            res.writeHead(200);
            res.end(JSON.stringify({ success: true }));
        } catch (error) {
            return InteractionManager.bad(res, 400, error?.message || 'attachment_delete_failed');
        }
    });
}));

WebApp.connectHandlers.use('/webhook', connectRoute((router) => {
    router.post('/seo-results', (req, res) => {
        logger.info('SEO results webhook received', { ...buildRequestContext(req) });
        res.end('OK');
    });
    router.post('/:slug/crawl-results', async (req, res) => {
        try {
            const payload = req.body.payload;
            const crawlId = payload.id;
            const crawl = await Crawl.findById(crawlId);
            if (!crawl) {
                return res.status(404).send('Crawl not found');
            }
            switch (payload.event) {
                case "PAGE":
                    crawl.status = "PROCESSING";
                    const crawlPages = new CrawlPages({
                        crawlId,
                        url: payload.url,
                        status: payload.status,
                        fileId: payload.fileId,
                        metadata: payload.metadata,
                        userId: crawl.userId,
                        title: payload.metadata.title,
                        active: true,
                    });
                    await crawlPages.save();
                    crawlPages.notify();
                    break;
                case "START":
                    crawl.status = "STARTED";
                    break;
                case "DONE":
                    crawl.status = "COMPLETED";
                    break;
                case "ERROR":
                case "FAILED":
                    crawl.status = "FAILED";
                    break;
                default:
                    crawl.status = payload.event;
                    break;
            }
            await crawl.save();
            crawl.notify();
            res.end('OK');
        } catch (error) {
            res.status(500).send('Internal server error');
        }
    });
    router.post('/test', async (req, res) => {
        logger.debug('Test endpoint hit', { ...buildRequestContext(req) });
        res.end('OK');
    });
}));