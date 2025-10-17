import { BaseProcessor } from "./baseProcessor.js";
import Business from "../../dbTemplates/Business.js";
import { BusinessFrame } from "../frames/businessFrame.js";
import { httpResponseFrame } from "../frames/httpResponseFrame.js";
import { InboundRequestFrame } from "../frames/inboundRequestFrame.js";
import { OutboundRequestFrame } from "../frames/outboundRequestFrame.js";

export class BusinessProcessor extends BaseProcessor {
    constructor() {
        super({ name: "BusinessProcessor" });
    }
    /**
     * 
     * @param {InboundRequestFrame} frame 
     * @param {import("../pipeline.js").PipelineContext} ctx 
     * @returns 
     */
    async _process(frame, ctx) {
        if (frame instanceof InboundRequestFrame) {
            const business = await Business.findBySlug(frame.parsedbody.slug);
            if (!business?._id) {
                ctx.next(new httpResponseFrame({ status: 404, body: { message: "Business not found" } }, {}, frame.ptsNs));
                return;
            }
            ctx.next(new BusinessFrame(business, { ...frame.meta, ...frame.parsedbody }, frame.ptsNs));
            return;
        }
        if (frame instanceof OutboundRequestFrame) {
            const business = await Business.findBySlug(frame.parsedbody.slug);
            if (!business?._id) {
                ctx.next(new httpResponseFrame({ status: 404, body: { message: "Business not found" } }, {}, frame.ptsNs));
                return;
            }
            ctx.next(new BusinessFrame(business, { ...frame.meta, ...frame.parsedbody }, frame.ptsNs));
            return;
        }
        ctx.pass();
    }
}