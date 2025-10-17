import { BaseProcessor } from "./baseProcessor.js";
import { ConsumerFrame } from "../frames/consumerFrame.js";
import Inbox from "../../dbTemplates/Inbox.js";
import { InboxFrame } from "../frames/inboxFrame.js";
export class InboxProcessor extends BaseProcessor {
    constructor() {
        super({ name: "InboxProcessor" });
    }
    /**
     * 
     * @param {ConsumerFrame} frame 
     * @param {import("../pipeline.js").PipelineContext} ctx 
     * @returns 
     */
    async _process(frame, ctx) {
        if (frame instanceof ConsumerFrame) {
            const inbox = await Inbox.findByBusinessIdAndConsumerIdAndChannelId(
                frame.consumer.businessId._str,
                frame.consumer._id._str,
                frame.meta.channel?.id || frame.meta.channelId
            );
            if (!inbox) {
                const newData = {
                    businessId: frame.consumer.businessId._str,
                    consumerId: frame.consumer._id._str,
                    channel: frame.meta.channel,
                    consumer: {
                        displayName: frame.consumer.name.given + ' ' + frame.consumer.name.family,
                        primaryEmail: frame.consumer.contacts.find(c => c.type === 'email')?.value || '',
                        primaryPhone: frame.consumer.contacts.find(c => c.type === 'phone')?.value || '',
                        avatarUrl: frame.consumer.avatarUrl || '',
                        tagsPreview: frame.consumer.tags || [],
                        isVIP: frame.consumer.isVIP || false,
                    }
                };
                if (frame.consumer.optedOut) {
                    newData.consumer.optedOut = frame.consumer.optedOut;
                }
                if (frame.consumer.optedAt) {
                    newData.consumer.optedAt = frame.consumer.optedAt;
                }
                if (frame.consumer.optedBy) {
                    newData.consumer.optedBy = frame.consumer.optedBy;
                }
                // derive keywords from consumer fields for search (trim & dedupe)
                try {
                    const keywordValues = [
                        frame.consumer.name?.given,
                        frame.consumer.name?.family,
                        newData.consumer.displayName,
                        newData.consumer.primaryEmail,
                        newData.consumer.primaryPhone,
                        ...(Array.isArray(newData.consumer.tagsPreview) ? newData.consumer.tagsPreview : [])
                    ];
                    const normalized = keywordValues
                        .filter(v => typeof v === 'string')
                        .map(s => s.toLowerCase().trim())
                        .filter(s => s.length > 0);
                    newData.keywords = Array.from(new Set(normalized));
                } catch (_e) { }
                const inboxData = new Inbox(newData);
                const _id = await inboxData.save();
                const newInbox = await Inbox.findById(_id);
                ctx.next(new InboxFrame(newInbox, frame.meta));
            } else {
                ctx.next(new InboxFrame(inbox, frame.meta));
            }
            return;
        }
        ctx.pass();
    }
}