import { Frame } from "../frame.js";
import Sessions from "../../../dbTemplates/Sessions.js";
export class SessionFrame extends Frame {
    constructor(session, parsedbody, meta = {}, ptsNs) {
        super("session", { ...meta }, ptsNs);
        /**
         * @type {Sessions}
         */
        this.session = session;
        /**
         * @type {{
         *  businessId: string,
         *  externalSessionId: string,
         *  status: string,
         *  startedAt: number,
         *  lastSeenAt: number,
         *  endedAt: number,
         *  slug: string,
         *  type: string,
         *  path: string,
         *  title: string,
         *  order: number,
         *  timestamp: number,
         *  dwellMs: number,
         *  metadata: any,
         *  attributes: any[],
         *  createdAt: number,
         * }}
        */
        this.parsedbody = parsedbody;
    }
}