import { BaseProcessor } from "../baseProcessor.js";
import { SessionRequestFrame } from "../../frames/sessions/sessionRequestFrame.js";
import { httpResponseFrame } from "../../frames/httpResponseFrame.js";
import Business from "../../../dbTemplates/Business.js";
import Sessions from "../../../dbTemplates/Sessions.js";
import PageViews from "../../../dbTemplates/PageViews.js";
import Interactions from "../../../dbTemplates/Interactions.js";
import { SessionFrame } from "../../frames/sessions/sessionFrame.js";
import { PageViewFrame } from "../../frames/sessions/pageViewFrame.js";
import moment from "moment";

export class PageViewProcessor extends BaseProcessor {
    constructor() {
        super({ name: "PageViewProcessor" });
    }
    async _process(frame, ctx) {
        try {
            if (frame instanceof SessionFrame) {
                if (!frame.session?._id) {
                    ctx.next(new httpResponseFrame({ status: 400, body: { message: "Session not found" } }, {}, frame.ptsNs));
                    return;
                }
                const session = frame.session;
                const pageView = new PageViews({
                    sessionId: session._id,
                    businessId: session.businessId._str,
                    channelId: session.channelId || null,
                    consumerId: session.consumerId || null,
                    inboxId: session.inboxId || null,
                    type: frame.parsedbody.type ?? 'page',
                    path: frame.parsedbody.path ?? null,
                    title: frame.parsedbody.title ?? null,
                    order: typeof frame.parsedbody.order === 'number' ? frame.parsedbody.order : (session.pageCount ?? 0) + 1,
                    timestamp: frame.parsedbody.timestamp ?? moment().valueOf(),
                    dwellMs: frame.parsedbody.dwellMs ?? null,
                    metadata: frame.parsedbody.metadata ?? null,
                    createdAt: moment().valueOf(),
                });
                await pageView.save();

                // Update session counters and lastSeen
                session.pageCount = (session.pageCount ?? 0) + 1;
                session.lastSeenAt = frame.parsedbody.timestamp ?? moment().valueOf();
                await session.save();
                ctx.next(new PageViewFrame(pageView, frame.parsedbody, { ...frame.meta }, frame.ptsNs));
                return;
            }
        } catch (error) {
            ctx.next(new httpResponseFrame({ status: 500, body: { message: "Internal server error" } }, {}, frame.ptsNs));
            return;
        }

        ctx.pass();
    }
}