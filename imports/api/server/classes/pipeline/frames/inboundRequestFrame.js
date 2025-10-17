import { Frame } from "../frames/frame";

export class InboundRequestFrame extends Frame {
    constructor({ provider, type, identifier, externalId, text, attachments, slug, direction, attributes, payload, messageId }, meta = {}, ptsNs) {
        super("inbound.request", { ...meta, }, ptsNs);
        this.parsedbody = { provider, type, identifier, externalId, text, attachments, slug, direction, attributes, payload, messageId };
    }
}