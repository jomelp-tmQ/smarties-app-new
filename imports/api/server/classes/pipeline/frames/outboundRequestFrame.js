import { Frame } from "../frames/frame";

export class OutboundRequestFrame extends Frame {
    constructor({ provider, type, identifier, externalId, text, attachments, slug, direction, attributes, payload, messageId, agentId }, meta = {}, ptsNs) {
        super("outbound.request", { ...meta, }, ptsNs);
        this.parsedbody = { provider, type, identifier, externalId, text, attachments, slug, direction, attributes, payload, messageId, agentId };
    }
}