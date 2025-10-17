import { BaseProcessor } from "./baseProcessor.js";
import Channels from "../../dbTemplates/Channels.js";
import { ChannelFrame } from "../frames/channelFrame.js";
import { httpResponseFrame } from "../frames/httpResponseFrame.js";
import { BusinessFrame } from "../frames/businessFrame.js";

export class ChannelProcessor extends BaseProcessor {
    constructor() {
        super({ name: "ChannelProcessor" });
    }

    /**
     * 
     * @param {import("../frames/businessFrame.js").BusinessFrame} frame 
     * @param {import("../pipeline.js").PipelineContext} ctx 
     * @returns 
     */
    async _process(frame, ctx) {
        if (frame instanceof BusinessFrame) {
            const channel = await Channels.findByTypeAndIdentifier(frame.business._id, frame.meta.type, frame.meta.identifier);
            if (!channel?._id) {
                ctx.next(new httpResponseFrame({ status: 404, body: { message: "Channel not found" } }, {}, frame.ptsNs));
                return;
            }
            ctx.next(new ChannelFrame(channel, frame.meta));
            return;
        }
        ctx.pass();
    }
}