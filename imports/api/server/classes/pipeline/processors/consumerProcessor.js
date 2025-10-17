import { BaseProcessor } from "./baseProcessor.js";
import Consumers from "../../dbTemplates/Consumers.js";
import { ConsumerFrame } from "../frames/consumerFrame.js";
import { ChannelFrame } from "../frames/channelFrame.js";

export class ConsumerProcessor extends BaseProcessor {
    constructor() {
        super({ name: "ConsumerProcessor" });
    }
    /**
     * 
     * @param {ChannelFrame} frame 
     * @param {import("../pipeline.js").PipelineContext} ctx 
     * @returns 
     */
    async _process(frame, ctx) {
        if (frame instanceof ChannelFrame) {
            // businessId, externalId, name, contacts = [], tags = []
            const existingConsumer = await Consumers.findByBusinessIdAndExternalId(frame.channel.businessId._str, frame.meta.externalId);
            if (!existingConsumer) {
                const consumerData = new Consumers({
                    businessId: frame.channel.businessId._str,
                    externalId: frame.meta.externalId,
                    name: frame.meta.name || { given: "Prospect", family: "" },
                    contacts: frame.meta.contacts || [],
                    tags: frame.meta.tags || [],
                    createdAt: frame.meta.createdAt || Date.now(),
                });
                const _id = await consumerData.save();
                const newConsumer = await Consumers.findById(_id);
                ctx.next(new ConsumerFrame(newConsumer, { ...frame.meta, channelId: frame.channel._id._str, channel: { id: frame.channel._id._str, identifier: frame.channel.identifier, type: frame.channel.type } }));
            } else {
                ctx.next(new ConsumerFrame(existingConsumer, { ...frame.meta, channelId: frame.channel._id._str, channel: { id: frame.channel._id._str, identifier: frame.channel.identifier, type: frame.channel.type } }));
            }
            return;
        }
        ctx.pass();
    }
}   