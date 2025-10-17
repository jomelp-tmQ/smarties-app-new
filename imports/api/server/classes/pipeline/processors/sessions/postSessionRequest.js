import { PageViewFrame } from "../../frames/sessions/pageViewFrame.js";
import { httpResponseFrame } from "../../frames/httpResponseFrame.js";
import { SessionFrame } from "../../frames/sessions/sessionFrame.js";
import { BaseProcessor } from "../baseProcessor.js";
import RedisVentService from "../../../../classes/events/RedisVentService.js";

export class PostSessionRequest extends BaseProcessor {
    constructor() {
        super({ name: "PostSessionRequest" });
    }
    async _process(frame, ctx) {
        if (frame instanceof PageViewFrame) {
            const pageView = frame.pageView;
            const data = pageView.toObject();
            data.id = pageView._id._str;
            delete data._id;
            console.log('pageView', data, frame.pageView);
            // Server.RedisVentServer.triggers.upsert('session-tracker', 'page_views', pageView.businessId, data.id, data);
            RedisVentService.Sessions.triggerCustom("page_views", "PAGE_VIEWS", pageView.businessId, data);
            ctx.next(new httpResponseFrame({ status: 200, body: { message: "Page view updated" } }, {}, frame.ptsNs));
            return;
        }
        ctx.pass();
    }
}