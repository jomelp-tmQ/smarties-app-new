import { BaseProcessor } from "./baseProcessor.js";
import { InteractionFrame } from "../frames/interactionFrame.js";
import { httpResponseFrame } from "../frames/httpResponseFrame.js";
import Inbox from "../../dbTemplates/Inbox.js";
import Consumers from "../../dbTemplates/Consumers.js";
import InteractionManager from "../../interactions/InteractionManager.js";
import Server from "../../../Server.js";


export class PostOutboundRequestProcessor extends BaseProcessor {
    constructor() {
        super({ name: "PostOutboundRequestProcessor" });
    }
    /**
     * 
     * @param {InteractionFrame} frame 
     * @param {import("../pipeline.js").PipelineContext} ctx 
     * @returns 
     */
    async _process(frame, ctx) {

        if (frame instanceof InteractionFrame) {
            // #TODOS: DO POST EVENTS HERE
            const businessId = frame.meta?.businessId || frame.interaction?.businessId?._str || frame.interaction?.businessId?.toString();
            const channelId = frame.meta?.channelId || frame.interaction?.channelId?._str || frame.interaction?.channelId?.toString();
            const consumerId = frame.meta?.consumerId || frame.interaction?.consumerId?._str || frame.interaction?.consumerId?.toString();
            const inboxId = frame.meta?.inboxId || frame.interaction?.inboxId?._str || frame.interaction?.inboxId?.toString();
            const interactionId = frame.meta?.interactionId || frame.interaction?._id?._str || frame.interaction?._id?.toString();
            const isNewInbox = !!frame.meta?.isNewInbox;

            // Update latest inbox with this interaction (don't increment unread for outbound)
            let updatedInbox = null;
            try {
                updatedInbox = await InteractionManager.updateInboxLatest({ inboxId, interaction: frame.interaction, incrementUnread: false });
                ctx.trace('inbox_latest_updated', { inboxId });
            } catch (err) {
                ctx.trace('inbox_latest_update_error', { message: String(err) });
            }

            // Venting best-effort
            try {
                const businessIdStr = businessId?._str || businessId?.toString?.() || String(businessId);
                const inboxid = inboxId?._str || inboxId?.toString?.() || String(inboxId);
                const interactionid = interactionId?._str || interactionId?.toString?.() || String(interactionId);
                const consumerid = consumerId?._str || consumerId?.toString?.() || String(consumerId);

                if (isNewInbox) {
                    Server.RedisVentServer.triggers.insert('inboxapp', 'inbox', businessIdStr, inboxid, updatedInbox || { _id: inboxid });
                } else {
                    Server.RedisVentServer.triggers.update('inboxapp', 'inbox', businessIdStr, inboxid, updatedInbox || { _id: inboxid });
                }
                Server.RedisVentServer.triggers.insert('interactionapp', 'interaction', consumerid, interactionid, frame.interaction);
                ctx.trace('vented', { inboxId: inboxid, interactionId: interactionid });
            } catch (err) {
                ctx.trace('vent_error', { message: String(err) });
            }

            // Respond with identifiers
            ctx.next(new httpResponseFrame({
                status: 200,
                body: {
                    message: "Outbound interaction created",
                    businessId,
                    channelId,
                    consumerId,
                    inboxId,
                    interactionId,
                }
            }, {}, frame.ptsNs));
            return;
        }
        ctx.pass();
    }
}