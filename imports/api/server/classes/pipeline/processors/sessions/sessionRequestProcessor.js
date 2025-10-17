import { BaseProcessor } from "../baseProcessor.js";
import { SessionRequestFrame } from "../../frames/sessions/sessionRequestFrame.js";
import { httpReqFrame } from "../../frames/httpReqFrame.js";

export class SessionRequestProcessor extends BaseProcessor {
    constructor() {
        super({ name: "SessionRequestProcessor" });
    }
    async _process(frame, ctx) {
        if (frame instanceof httpReqFrame) {
            const parsedbody = this._parseBody({ ...frame.req.body, slug: frame.req.params.slug });
            ctx.next(new SessionRequestFrame(parsedbody, { ...frame.meta }, frame.ptsNs));
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
        let retval = { ...body };
        if (body.externalSessionId) retval.externalSessionId = body.externalSessionId;
        if (body.status) retval.status = body.status;
        if (body.startedAt) retval.startedAt = body.startedAt;
        if (body.lastSeenAt) retval.lastSeenAt = body.lastSeenAt;
        if (body.endedAt) retval.endedAt = body.endedAt;
        if (body.durationMs) retval.durationMs = body.durationMs;
        if (body.pageCount) retval.pageCount = body.pageCount;
        if (body.utm) retval.utm = body.utm;
        if (body.referrer) retval.referrer = body.referrer;
        if (body.device) retval.device = body.device;
        if (body.userAgent) retval.userAgent = body.userAgent;
        if (body.type) retval.type = body.type;
        if (body.path) retval.path = body.path;
        if (body.title) retval.title = body.title;
        if (body.order) retval.order = body.order;
        if (body.timestamp) retval.timestamp = body.timestamp;
        if (body.dwellMs) retval.dwellMs = body.dwellMs;
        if (body.meta) retval.meta = body.meta;
        retval.attributes = attributes.length ? attributes : retval.attributes || [];
        retval.slug = body.slug;
        return retval;
    }
}