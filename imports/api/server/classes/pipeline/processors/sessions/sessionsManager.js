import { SessionRequestFrame } from "../../frames/sessions/sessionRequestFrame.js";
import { httpResponseFrame } from "../../frames/httpResponseFrame.js";
import Interactions from "../../../dbTemplates/Interactions.js";
import Sessions from "../../../dbTemplates/Sessions.js";
import { BaseProcessor } from "../baseProcessor.js";
import Business from "../../../dbTemplates/Business.js";
import { SessionFrame } from "../../frames/sessions/sessionFrame.js";
import RedisVentService from "../../../../classes/events/RedisVentService.js";

export class SessionsManager extends BaseProcessor {
    constructor() {
        super({ name: "SessionsManager" });
    }
    async _process(frame, ctx) {
        if (frame instanceof SessionRequestFrame) {
            if (!frame.parsedbody.externalSessionId) {
                ctx.next(new httpResponseFrame({ status: 400, body: { message: "Missing externalSessionId" } }, {}, frame.ptsNs));
                return;
            }
            const business = await Business.findBySlug(frame.parsedbody.slug);
            const existing = await Sessions.findOne({
                businessId: business._id,
                externalSessionId: frame.parsedbody.externalSessionId,
            });
            if (existing) {
                existing.status = frame.parsedbody.status;
                existing.lastSeenAt = frame.parsedbody.lastSeenAt;
                if (frame.parsedbody.endedAt) existing.endedAt = frame.parsedbody.endedAt;
                if (frame.parsedbody.durationMs) existing.durationMs = frame.parsedbody.durationMs;
                if (frame.parsedbody.pageCount) existing.pageCount = frame.parsedbody.pageCount;
                if (frame.parsedbody.utm) existing.utm = frame.parsedbody.utm;
                if (frame.parsedbody.referrer) existing.referrer = frame.parsedbody.referrer;
                if (frame.parsedbody.device) existing.device = frame.parsedbody.device;
                if (frame.parsedbody.userAgent) existing.userAgent = frame.parsedbody.userAgent;
                if (frame.parsedbody.attributes) existing.attributes = frame.parsedbody.attributes;
                await existing.save();
                ctx.next(new SessionFrame(existing, frame.parsedbody, { ...frame.meta }, frame.ptsNs));
                return;
            } else {
                const matches = await Interactions.findByAttribute('sessionId', frame.parsedbody.externalSessionId);
                const latest = Array.isArray(matches) && matches.length
                    ? matches.reduce((acc, cur) => (cur.timestamp > (acc?.timestamp || 0) ? cur : acc), null)
                    : null;
                const session = new Sessions({ businessId: business._id, });
                if (frame.parsedbody.externalSessionId) session.externalSessionId = frame.parsedbody.externalSessionId;
                if (latest?.channelId) session.channelId = latest.channelId;
                if (latest?.consumerId) session.consumerId = latest.consumerId;
                if (latest?.inboxId) session.inboxId = latest.inboxId;
                if (latest?.businessId) session.businessId = latest.businessId;
                if (frame.parsedbody.status) session.status = frame.parsedbody.status;
                if (frame.parsedbody.startedAt) session.startedAt = frame.parsedbody.startedAt;
                if (frame.parsedbody.lastSeenAt) session.lastSeenAt = frame.parsedbody.lastSeenAt;
                if (frame.parsedbody.endedAt) session.endedAt = frame.parsedbody.endedAt;
                if (frame.parsedbody.durationMs) session.durationMs = frame.parsedbody.durationMs;
                if (frame.parsedbody.pageCount) session.pageCount = frame.parsedbody.pageCount;
                if (frame.parsedbody.utm) session.utm = frame.parsedbody.utm;
                if (frame.parsedbody.referrer) session.referrer = frame.parsedbody.referrer;
                if (frame.parsedbody.device) session.device = frame.parsedbody.device;
                if (frame.parsedbody.userAgent) session.userAgent = frame.parsedbody.userAgent;
                if (frame.parsedbody.attributes) session.attributes = frame.parsedbody.attributes;
                session.createdAt = frame.parsedbody.createdAt || Date.now();
                await session.save();

                const data = session.toObject();
                data.id = session._id._str;
                delete data._id;
                RedisVentService.Sessions.triggerCustom("page_views", "SESSIONS", data.businessId, data);

                ctx.next(new SessionFrame(session, frame.parsedbody, { ...frame.meta }, frame.ptsNs));
            }
            return;
        }
        ctx.pass();
    }
}