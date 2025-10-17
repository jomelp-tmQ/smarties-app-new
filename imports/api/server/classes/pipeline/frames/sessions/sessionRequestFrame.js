import { Frame } from "../frame.js";

export class SessionRequestFrame extends Frame {
    constructor(parsedbody, meta = {}, ptsNs) {
        super("session.request", { ...meta }, ptsNs);
        /**
         * @type {{
         *  businessId: string,
         *  externalSessionId: string,
         *  status: string,
         *  startedAt: number,
         *  lastSeenAt: number,
         *  endedAt: number,
         *  slug: string,
         * }}
         */
        this.parsedbody = { ...parsedbody };
        if (parsedbody.externalSessionId) this.parsedbody.externalSessionId = parsedbody.externalSessionId;
        if (parsedbody.status) this.parsedbody.status = parsedbody.status;
        if (parsedbody.startedAt) this.parsedbody.startedAt = parsedbody.startedAt;
        if (parsedbody.lastSeenAt) this.parsedbody.lastSeenAt = parsedbody.lastSeenAt;
        if (parsedbody.endedAt) this.parsedbody.endedAt = parsedbody.endedAt;
        if (parsedbody.durationMs) this.parsedbody.durationMs = parsedbody.durationMs;
        if (parsedbody.pageCount) this.parsedbody.pageCount = parsedbody.pageCount;
        if (parsedbody.utm) this.parsedbody.utm = parsedbody.utm;
        if (parsedbody.referrer) this.parsedbody.referrer = parsedbody.referrer;
        if (parsedbody.device) this.parsedbody.device = parsedbody.device;
        if (parsedbody.userAgent) this.parsedbody.userAgent = parsedbody.userAgent;
        if (parsedbody.type) this.parsedbody.type = parsedbody.type;
        if (parsedbody.path) this.parsedbody.path = parsedbody.path;
        if (parsedbody.title) this.parsedbody.title = parsedbody.title;
        if (parsedbody.order) this.parsedbody.order = parsedbody.order;
        if (parsedbody.timestamp) this.parsedbody.timestamp = parsedbody.timestamp;
        if (parsedbody.dwellMs) this.parsedbody.dwellMs = parsedbody.dwellMs;
        if (parsedbody.meta) this.parsedbody.meta = parsedbody.meta;
    }
}