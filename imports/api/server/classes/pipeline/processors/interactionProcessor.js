import { BaseProcessor } from "./baseProcessor.js";
import { InteractionFrame } from "../frames/interactionFrame.js";
import { InboxFrame } from "../frames/inboxFrame.js";
import Interactions from "../../dbTemplates/Interactions.js";
import moment from "moment";
import { httpResponseFrame } from "../frames/httpResponseFrame.js";

export class InteractionProcessor extends BaseProcessor {
    constructor() {
        super({ name: "InteractionProcessor" });
    }
    /**
     * 
     * @param {InboxFrame} frame 
     * @param {import("../pipeline.js").PipelineContext} ctx 
     * @returns 
     */
    async _process(frame, ctx) {
        if (frame instanceof InboxFrame) {
            const existingInteraction = await Interactions.findByMessageId(frame.meta.messageId);
            if (existingInteraction) {
                ctx.next(new httpResponseFrame({ status: 400, body: { message: "Interaction already exists" } }, frame.meta, frame.ptsNs));
                return;
            }
            const payload = { text: frame.meta.text, attachments: frame.meta.attachments };
            const status = frame.meta.direction === 'outbound' ? 'pending' : 'received';
            const interactionData = new Interactions({
                businessId: frame.inbox.businessId._str,
                inboxId: frame.inbox._id._str,
                channelId: (frame.inbox.channel?.id?._str || frame.inbox.channel?.id),
                consumerId: frame.inbox.consumerId._str,
                userId: null,
                medium: frame.meta.type,
                direction: frame.meta.direction,
                payload,
                status,
                timestamp: moment().valueOf(),
                attributes: frame.meta.attributes || [],
                messageId: frame.meta.messageId || null,
            });

            const _id = await interactionData.save();
            const newInteraction = await Interactions.findById(_id);
            if (newInteraction) {
                ctx.next(new InteractionFrame(newInteraction, frame.meta));
            } else {
                ctx.next(new httpResponseFrame({ status: 500, body: { message: "Failed to create interaction" } }, {}, frame.ptsNs));
            }
            return;
        }
    }
}