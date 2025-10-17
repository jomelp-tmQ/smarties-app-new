import { tmq as session } from "../../common/static_codegen/tmq/sessions";
import PageViews from "../classes/dbTemplates/PageViews";
import Sessions from "../classes/dbTemplates/Sessions";
import { toObjectId } from '../classes/db/helper.js';
import { status } from "@grpc/grpc-js";
import { logger as baseLogger } from "../utils/serverUtils";
const logger = baseLogger.child({ service: 'services/SessionService.js' });


const { GetCurrentSessionResponse, Session, GetPageViewsResponse, PageView } = session;

export default {
    GetCurrentSessions:
        /**
         * @param {Object} call
         * @param {session.GetCurrentSessionRequest} call.request
         * @param {function} callback 
         */
        async function ({ request }, callback) {
            const response = new GetCurrentSessionResponse();
            try {
                const sessions = await Sessions.find({
                    businessId: toObjectId(request.business_id),
                    consumerId: toObjectId(request.consumer_id)
                }, { sort: { lastSeenAt: -1 }, limit: 2 });

                if (session) {
                    response.sessions = sessions.map(session => {
                        return new Session({
                            id: session._id._str,
                            external_session_id: session.externalSessionId,
                            business_id: request.business_id,
                            consumer_id: request.consumer_id,
                            channel_id: session.channelId._str,
                            inbox_id: session.inboxId._str,
                            status: session.status,
                            started_at: session.startedAt,
                            last_seen_at: session.lastSeenAt,
                            ended_at: session.endedAt,
                            duration_ms: session.durationMs,
                            page_count: session.pageCount,
                            referrer: session.referrer,
                            device: session.device,
                            user_agent: session.userAgent,
                            created_at: session.createdAt
                        });
                    });
                    response.success = true;
                } else {
                    response.success = false;
                    response.error_message = "Session not found";
                }
                logger.debug('GetCurrentSessions response', { count: response.sessions?.length || 0 });

                callback(null, response);
            } catch (error) {
                logger.error('GetCurrentSessions error', { error: error?.message || error });
                callback({
                    code: 500,
                    message: error.message || "Error getting current session",
                    status: status.INTERNAL
                });

            }
        },
    GetPreviousSession:
        /**
       * @param {Object} call
       * @param {session.GetCurrentSessionRequest} call.request
       * @param {function} callback 
       */
        async function ({ request }, callback) {
            const response = new GetCurrentSessionResponse();
            try {
                const session = await Sessions.find({
                    businessId: toObjectId(request.business_id),
                    consumerId: toObjectId(request.consumer_id)
                }, { sort: { lastSeenAt: -1 } });
                const previousSession = session.length > 1 ? session[1] : null;
                if (previousSession) {
                    response.session = new Session({
                        id: session._id._str,
                        external_session_id: session.externalSessionId,
                        business_id: request.business_id,
                        consumer_id: request.consumer_id,
                        channel_id: session.channelId._str,
                        inbox_id: session.inboxId._str,
                        status: session.status,
                        started_at: session.startedAt,
                        last_seen_at: session.lastSeenAt,
                        ended_at: session.endedAt,
                        duration_ms: session.durationMs,
                        page_count: session.pageCount,
                        referrer: session.referrer,
                        device: session.device,
                        user_agent: session.userAgent,
                        created_at: session.createdAt
                    });
                    response.success = true;
                } else {
                    response.success = false;
                    response.error_message = "Previous session not found";
                }
                callback(null, response);
            } catch (error) {
                logger.error('GetPreviousSession error', { error: error?.message || error });
                callback({
                    code: 500,
                    message: error.message || "Error getting previous session",
                    status: status.INTERNAL
                });
            }
        },
    GetPageViews:
        /**
         * @param {Object} call
         * @param {session.GetPageViewsRequest} call.request
         * @param {function} callback 
         */
        async function ({ request }, callback) {
            const response = new GetPageViewsResponse();
            try {
                const pageViews = await PageViews.find({
                    businessId: toObjectId(request.business_id),
                    sessionId: toObjectId(request.session_id)
                });
                response.page_views = pageViews.map(pageView => {
                    return new PageView({
                        id: pageView._id._str,
                        session_id: pageView.sessionId._str,
                        business_id: request.business_id,
                        channel_id: pageView.channelId._str,
                        consumer_id: pageView.consumerId._str,
                        inbox_id: pageView.inboxId._str,
                        type: pageView.type,
                        path: pageView.path,
                        title: pageView.title,
                        order: pageView.order,
                        timestamp: pageView.timestamp,
                        dwell_ms: pageView.dwellMs,
                        created_at: pageView.createdAt
                    });
                });
                response.success = true;
                callback(null, response);
            } catch (error) {
                logger.error('GetPageViews error', { error: error?.message || error });
                callback({
                    code: 500,
                    message: error.message || "Error getting page views",
                    status: status.INTERNAL
                });
            }
        }
};