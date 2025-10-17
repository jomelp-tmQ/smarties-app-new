import { BaseProcessor } from "./baseProcessor.js";
import { httpReqFrame } from "../frames/httpReqFrame.js";
import { InboundRequestFrame } from "../frames/inboundRequestFrame.js";

class HttpInboundProcessor extends BaseProcessor {
    constructor() {
        super({ name: "HttpInboundProcessor" });
    }
    /**
     * 
     * @param {import("../frames/httpReqFrame.js").httpReqFrame} frame 
     * @param {import("../pipeline.js").PipelineContext} ctx 
     */
    async _process(frame, ctx) {
        if (frame instanceof httpReqFrame) {
            const parsedbody = this._parseBody({ ...frame.req.body, slug: frame.req.params.slug });
            ctx.next(new InboundRequestFrame(parsedbody, frame.req.body));
            return;
        }
        ctx.pass();
    }
    _parseBody(body) {
        const attributes = [];
        if (body.meta) {
            for (const key in body.meta) {
                attributes.push({ key, value: body.meta[key] });
            }
        }

        const provider = body.provider || body.meta?.provider || 'sms';
        const type = body.type || body.meta?.type || 'messaging';
        const identifier = body.to || body.destination || body.channel || body.identifier || 'default';
        const externalId = body.from || body.externalId || body.sender;
        const text = body.text || body.message || '';
        const attachments = Array.isArray(body.attachments) ? body.attachments : [];
        const slug = body.slug;
        const messageId = body.messageId || body.meta?.messageId || null;
        return { provider, type, identifier, externalId, text, attachments, slug, direction: 'inbound', attributes, messageId };
    }
}

export { HttpInboundProcessor };