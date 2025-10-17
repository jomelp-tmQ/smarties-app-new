import { BaseProcessor } from "./baseProcessor.js";
import { InteractionFrame } from "../frames/interactionFrame.js";
import { logger as baseLogger } from "../../../utils/serverUtils.js";
import UploadsManager from "../../uploads/UploadsManager.js";
import AttachmentManager from "../../attachments/AttachmentManager.js";
import Server from "../../../Server.js";

const logger = baseLogger.child({ service: 'pipeline/attachmentProcessor.js' });

export class AttachmentProcessor extends BaseProcessor {
    constructor() {
        super({ name: "AttachmentProcessor" });
    }

    /**
     * Create pending Uploads and minimal Attachments for any recording IDs present
     * in frame.meta.attachments when an Interaction is created.
     *
     * Only handles Uploads and Attachments schema.
     *
     * @param {InteractionFrame} frame
     * @param {import("../pipeline.js").PipelineContext} ctx
     */
    async _process(frame, ctx) {
        if (!(frame instanceof InteractionFrame)) {
            return ctx.pass();
        }

        try {
            const interaction = frame.interaction;
            const meta = frame.meta || {};
            const attachments = Array.isArray(meta.attachments) ? meta.attachments : [];

            if (attachments.length === 0) {
                return ctx.pass();
            }

            // Normalize to 24-hex string for ObjectId
            const toHexId = (v) => {
                if (!v) return null;
                if (typeof v === 'string') {
                    const m = v.match(/^[a-fA-F0-9]{24}$/) || v.match(/ObjectID\("([a-fA-F0-9]{24})"\)/);
                    return m ? (m[1] || m[0]) : null;
                }
                if (typeof v._str === 'string' && /^[a-fA-F0-9]{24}$/.test(v._str)) return v._str;
                if (typeof v.toHexString === 'function') {
                    const hs = v.toHexString();
                    if (typeof hs === 'string' && /^[a-fA-F0-9]{24}$/.test(hs)) return hs;
                }
                const s = typeof v.toString === 'function' ? v.toString() : String(v);
                const m2 = s && (s.match(/^[a-fA-F0-9]{24}$/) || s.match(/ObjectID\("([a-fA-F0-9]{24})"\)/));
                return m2 ? (m2[1] || m2[0]) : null;
            };

            const businessId = toHexId(interaction.businessId);
            const inboxId = toHexId(interaction.inboxId);
            const interactionId = toHexId(interaction._id);
            const consumerId = toHexId(interaction.consumerId);
            const channelId = toHexId(interaction.channelId);

            const uniqueIds = Array.from(new Set(attachments.filter(Boolean).map((s) => String(s))));

            for (const fileId of uniqueIds) {
                // 1) Ensure Uploads pending exists
                try {
                    const existing = await UploadsManager.getUploadByFileId(fileId);
                    if (!existing) {
                        try {
                            await UploadsManager.createUpload({
                                fileId,
                                originalName: fileId,
                                source: 'messaging',
                                businessId: businessId || undefined,
                                statusUrl: `${Server.Config.server.rabbitFile.url}/upload/${fileId}`,
                                remoteUrl: `${Server.Config.server.rabbitFile.url}/download/${fileId}`,
                                attributes: [
                                    { key: 'recordingId', value: fileId },
                                    { key: 'createdFrom', value: 'inbound_attachment' }
                                ]
                            });
                        } catch (e) {
                            // If duplicate or validation edge, ignore and continue
                        }
                    }
                } catch (e) { /* ignore */ }

                // 2) Ensure minimal Attachment record exists (pending local/remote)
                try {
                    // If an attachment with the same recordingId already exists for this interaction, skip
                    const existingAtts = await AttachmentManager.getAttachmentsByRecordingId(String(fileId));
                    const alreadyLinked = Array.isArray(existingAtts) && existingAtts.some(a => toHexId(a.interactionId) === interactionId);
                    if (!alreadyLinked) {
                        try {
                            const attachment = await AttachmentManager.createAttachment({
                                businessId,
                                inboxId,
                                interactionId,
                                consumerId,
                                channelId,
                                originalName: fileId,
                                recordingId: fileId,
                                source: 'messaging',
                                metadata: {
                                    // No file metrics yet; will be updated by recording-update/download checks
                                    attributes: [
                                        { key: 'recordingId', value: fileId },
                                        { key: 'status', value: 'pending' }
                                    ]
                                }
                            });
                            const attachmentId = attachment._id?._str || attachment._id?.toString() || String(attachment._id);
                            Server.RedisVentServer.triggers.insert('attachmentapp', 'attachment', consumerId, attachmentId, attachment);
                        } catch (e) {
                            // Ignore validation or duplicate issues
                        }
                    }
                } catch (e) { /* ignore */ }
            }

            ctx.pass();
        } catch (err) {
            logger.warn('AttachmentProcessor encountered an error', { error: err?.message || String(err) });
            ctx.pass();
        }
    }
}

export default AttachmentProcessor;


