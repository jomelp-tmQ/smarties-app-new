import Business from '../dbTemplates/Business.js';
import Consumers from '../dbTemplates/Consumers.js';
import Inbox from '../dbTemplates/Inbox.js';
import Interactions from '../dbTemplates/Interactions.js';
import AttachmentManager from '../attachments/AttachmentManager.js';
import Channels from '../dbTemplates/Channels.js';
import { isObjectId, toObjectId } from '../db/helper.js';

class InteractionManager {
    constructor() { }
    /**
     * 
     * @param {import('http').ServerResponse} res 
     * @param {any} body 
     * @returns {void}
     */
    static ok(res, body) {
        if (!res) return;
        if (res.headersSent) return;
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true, ...body }));
    }
    /**
     * 
     * @param {import('http').ServerResponse} res 
     * @param {number} code 
     * @param {string} message 
     * @param {any} extra 
     * @returns {void}
     */
    static bad(res, code, message, extra = {}) {
        if (!res) return;
        if (res.headersSent) return;
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(code);
        res.end(JSON.stringify({ ok: false, error: message, ...extra }));
    }

    /**
     * 
     * @param {string} slug 
     * @returns {Promise<Business>}
     */
    static async resolveBusinessBySlug(slug) {
        const biz = await Business.findBySlug(slug);
        if (!biz) throw new Error('business_not_found');
        return biz;
    }

    /**
     * 
     * @param {string} businessId 
     * @param {string} type 
     * @param {string} identifier 
     * @param {string} provider 
     * @param {any} metadata 
     * @returns {Promise<Channels>}
     */
    static async resolveChannel({ businessId, type, identifier, provider, metadata = {} }) {
        let channel = await Channels.findByTypeAndIdentifier(businessId, type, identifier);
        if (!channel) throw new Error('channel_not_found');
        return channel;
    }

    /**
     * 
     * @param {string} businessId 
     * @param {string} externalId 
     * @param {any} name 
     * @param {any[]} contacts 
     * @param {any[]} tags 
     * @returns {Promise<Consumers>}
     */
    static async resolveOrCreateConsumer({ businessId, externalId, name, contacts = [], tags = [] }) {
        let consumer = await Consumers.findByBusinessIdAndExternalId(businessId, externalId);
        if (!consumer) {
            const consumerData = new Consumers({
                businessId: businessId,
                externalId,
                name: name || { given: "Prospect", family: "" },
                contacts,
                tags,
                createdAt: Date.now(),
            });
            const _id = await consumerData.save();
            consumer = await Consumers.findById(_id);
        }
        return consumer;
    }

    /**
     * 
     * @param {string} businessId 
     * @param {string} consumerId 
     * @param {string} channelId 
     * @returns {Promise<{inbox: Inbox, isNew: boolean}>}
     */
    static async ensureInbox({ businessId, consumerId, channelId }) {
        // Try to find existing inbox
        let inbox = await Inbox.findByBusinessIdAndConsumerIdAndChannelId(businessId, consumerId, channelId);
        let isNew = false;

        if (!inbox) {
            isNew = true;
            const inboxData = new Inbox({
                businessId: businessId,
                consumerId: consumerId,
                channelId: channelId,
                status: 'open',
                unreadForAssignee: 0,
                createdAt: Date.now(),
            });
            const _id = await inboxData.save();
            inbox = await Inbox.findById(_id);
        }
        return { inbox, isNew };
    }

    /**
     * 
     * @param {string} businessId 
     * @param {string} inboxId 
     * @param {string} channelId 
     * @param {string} consumerId 
     * @param {string} userId 
     * @param {string} medium 
     * @param {string} direction 
     * @param {string} text 
     * @param {any[]} attachments 
     * @param {string} status 
     * @param {any[]} attributes 
     * @returns {Promise<Interactions>}
     */
    static async recordInteraction({
        businessId,
        inboxId,
        channelId,
        consumerId,
        userId = null,
        medium,
        direction, // 'inbound' | 'outbound'
        text,
        attachments = [],
        status = 'received',
        attributes = [],
    }) {
        const payload = { text, attachments };
        const interactionData = new Interactions({
            businessId: businessId,
            inboxId: inboxId,
            channelId: channelId,
            consumerId: consumerId,
            userId: userId,
            medium,
            direction,
            payload,
            status,
            timestamp: Date.now(),
            attributes,
        });

        const _id = await interactionData.save();
        return await Interactions.findById(_id);
    }

    /**
     * 
     * @param {string} inboxId 
     * @param {Interactions} interaction 
     * @param {boolean} incrementUnread 
     * @returns {Promise<void>}
     */
    static async updateInboxLatest({ inboxId, interaction, incrementUnread = true }) {
        const inbox = await Inbox.findById(inboxId);
        if (inbox) {
            if (incrementUnread) {
                await inbox.updateLatestInteraction(
                    interaction._id,
                    interaction?.payload?.text ?? null,
                    interaction.direction
                );
            } else {
                // For outbound messages, just update latest info without incrementing unread
                await inbox.update({
                    latestInteractionId: interaction._id,
                    latestSnippet: interaction?.payload?.text ?? null,
                    latestDirection: interaction.direction,
                    latestAt: interaction.timestamp,
                });
            }
            // Return the freshly updated inbox document so callers can emit current data
            return await Inbox.findById(inboxId);
        }
        return null;
    }

    // ---- Normalizers (provider-agnostic shapes) ----
    /**
     * 
     * @param {any} reqBody 
     * @returns {any}
     */
    static normalizeInbound(reqBody, context = {}) {
        // Use channel context if available; otherwise derive hints from the request
        const hint = InteractionManager.extractChannelHint(reqBody);
        const channel = context.channel;

        const provider = (channel?.provider || reqBody.provider || reqBody.meta?.provider || hint.provider || 'sms').toLowerCase();
        const type = channel?.type || reqBody.type || hint.type || 'messaging';
        const identifier = channel?.identifier || hint.identifier || reqBody.to || reqBody.destination || reqBody.channel || reqBody.identifier || 'default';
        const externalId = reqBody.from || reqBody.externalId || reqBody.sender;
        const text = reqBody.text ?? reqBody.message ?? '';
        const attachments = Array.isArray(reqBody.attachments) ? reqBody.attachments : [];
        return { provider, type, identifier, externalId, text, attachments };
    }

    /**
     * Extract minimal info to resolve channel before full normalization
     * @param {any} reqBody
     * @returns {{provider:string,type:string,identifier:string}}
     */
    static extractChannelHint(reqBody) {
        const provider = (reqBody.provider || reqBody.meta?.provider || '').toLowerCase() || undefined;
        const type = reqBody.type || reqBody.meta?.type || undefined;
        const identifier = reqBody.to || reqBody.destination || reqBody.channel || reqBody.identifier || undefined;
        return {
            provider: provider || 'sms',
            type: type || 'messaging',
            identifier: identifier || 'default',
        };
    }

    /**
     * 
     * @param {any} reqBody 
     * @returns {any}
     */
    static normalizeOutbound(reqBody) {
        const provider = (reqBody.provider || 'sms').toLowerCase();
        const type = reqBody.type || 'messaging';
        const identifier = reqBody.from || reqBody.channelIdentifier || reqBody.identifier || 'default';
        const to = reqBody.to || reqBody.externalId; // consumer external id
        const text = reqBody.text ?? '';
        const attachments = Array.isArray(reqBody.attachments) ? reqBody.attachments : [];
        return { provider, type, identifier, to, text, attachments };
    }

    static normalizeReceipt(reqBody) {
        const provider = (reqBody.provider || 'sms').toLowerCase();
        const type = reqBody.type || 'messaging';
        const identifier = reqBody.from || reqBody.channelIdentifier || reqBody.identifier || 'default';
        const to = reqBody.to || reqBody.externalId; // consumer external id
        const text = reqBody.text ?? '';
        const attachments = Array.isArray(reqBody.attachments) ? reqBody.attachments : [];
        const interactionId = reqBody.interactionId;
        const messageId = reqBody.messageId;
        const status = reqBody.status;
        return { provider, type, identifier, to, text, attachments, interactionId, messageId, status };
    }

    static async updateInteraction({ interactionId, status, messageId }) {
        if (!interactionId) return;
        if (typeof interactionId === 'string') {
            interactionId = toObjectId(interactionId);
        }
        if (typeof status === "boolean") {
            status = status ? 'delivered' : 'failed';
        }
        if (typeof status === 'string') {
            status = status.toLowerCase();
        }
        if (typeof messageId === 'string') {
            const interaction = await Interactions.findByMessageId(messageId);
            if (interaction) {
                interactionId = interaction?._id?._str;
            }
        }

        const interaction = await Interactions.findById(interactionId);
        if (interaction) {
            interaction.status = status || 'delivered';
            await interaction.save();
        }
        return interaction;
    }

    /**
 * Create attachment record for downloaded files
 * @param {string} businessId 
 * @param {string} inboxId 
 * @param {string} interactionId 
 * @param {string} consumerId 
 * @param {string} channelId 
 * @param {string} originalName 
 * @param {string} source 
 * @param {any} metadata 
 * @returns {Promise<Attachments>}
 */
    static async createAttachment({
        businessId,
        inboxId,
        interactionId,
        consumerId,
        channelId,
        originalName,
        source,
        recordingId,
        metadata = {}
    }) {
        return await AttachmentManager.createAttachment({
            businessId,
            inboxId,
            interactionId,
            consumerId,
            channelId,
            originalName,
            source,
            recordingId,
            metadata
        });
    }

    /**
     * Download file and create attachment record
     * @param {string} businessId 
     * @param {string} remoteUrl 
     * @param {string} originalName 
     * @param {string} source 
     * @param {Object} context 
     * @param {Array} attributes 
     * @returns {Promise<Attachments>}
     */
    static async downloadAndCreateAttachment({
        businessId,
        remoteUrl,
        originalName,
        source = 'webhook_download',
        context = {},
        attributes = []
    }) {
        return await AttachmentManager.downloadAndCreateAttachment({
            businessId,
            remoteUrl,
            originalName,
            source,
            context,
            attributes
        });
    }

    /**
     * Update attachment with download info after successful download
     * @param {string} attachmentId 
     * @param {any} downloadInfo 
     * @returns {Promise<Attachments>}
     */
    static async updateAttachmentDownload(attachmentId, downloadInfo) {
        return await AttachmentManager.updateAttachment(attachmentId, downloadInfo);
    }
}

export default InteractionManager;