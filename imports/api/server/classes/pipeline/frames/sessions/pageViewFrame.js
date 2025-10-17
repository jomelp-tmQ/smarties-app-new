import { Frame } from "../frame.js";
import PageViews from "../../../dbTemplates/PageViews.js";
export class PageViewFrame extends Frame {
    constructor(pageView, parsedbody, meta = {}, ptsNs) {
        super("session", { ...meta }, ptsNs);
        /**
         * @type {PageViews}
         */
        this.pageView = pageView;
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