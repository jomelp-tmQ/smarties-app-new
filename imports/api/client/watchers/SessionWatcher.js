import { Watcher2 } from "../Watcher2";
import { Mongo } from "meteor/mongo";
import SessionService from "../../common/static_codegen/tmq/sessions_pb";
import RedisventService from "../redisvent/RedisventService";
import Client from "../Client";

const { GetCurrentSessionRequest, GetCurrentSessionResponse, GetPageViewsRequest, GetPageViewsResponse } = SessionService;

export const SESSION = {
    CURRENT_SESSION: 'currentSession',
    PREVIOUS_SESSION: 'previousSession'
};

class Queue {
    #head = 0;
    #tail = 0;
    #queue = {};
    #name = '';
    #active = false;
    constructor(name) {
        this.#name = name;
    }
    get Status() {
        return this.#active;
    }
    start() {
        this.#active = true;
    }
    stop() {
        this.#active = false;
    }
    peek() {
        return this.#queue[this.#head];
    }
    enqueue(item) {
        this.#tail++;
        this.#queue[this.#tail] = item;
    }
    dequeue() {
        this.#head++;
        const item = this.#queue[this.#head];
        delete this.#queue[this.#head];
        return item;
    }

}

class SessionWatcher extends Watcher2 {
    /**
     * @type {Mongo.Collection}
     */
    #pageViews = null;
    /**
     * @type {Mongo.Collection}
     */
    #sessions = null;
    #filters = {
        sessionId: null,
        inboxIds: [],
        currentSessionIdx: 0,
    };
    #pageViewsQueue = new Queue('pageViews');
    constructor(parent) {
        super(parent);
        this.#pageViews = new Mongo.Collection(null);
        this.#sessions = new Mongo.Collection(null);
    }
    get Sessions() {
        const filter = {};
        if (this.#filters.inboxIds.length > 0) {
            filter.inboxId = { $in: this.#filters.inboxIds };
        }
        return this.#sessions.find(filter, { sort: { lastSeenAt: -1 } }).fetch();
    }
    get PageViews() {
        const filter = {};
        if (this.CurrentSession) {
            filter.sessionId = this.CurrentSession.id;
        }
        console.log('filter', filter);
        return this.#pageViews.find(filter, { sort: { timestamp: -1 } }).fetch();
    }

    get Filters() {
        return this.#filters;
    }

    get CurrentSession() {
        return this.Sessions[this.#filters.currentSessionIdx];
    }

    get PreviousSession() {
        return this.Sessions[this.#filters.currentSessionIdx + 1];
    }

    setCurrentSession({ inboxIds, sessionId, currentSessionIdx = 0 }) {
        this.#filters = {
            inboxIds: inboxIds,
            sessionId: sessionId,
            currentSessionIdx: currentSessionIdx,
        };
        console.log('filters', this.#filters, this.#pageViews.find({}).fetch(), this.CurrentSession, this.PreviousSession);
        this.activateWatch();
    }

    async processPageViewsQueue() {
        if (this.#pageViewsQueue.Status) return;
        this.#pageViewsQueue.start();
        try {
            while (true) {
                const item = this.#pageViewsQueue.dequeue();
                if (!item) break;
                console.log('processing page views queue', item);
                await this.getPageViews({ businessId: item.businessId, sessionId: item.sessionId });
            }
            this.#pageViewsQueue.stop();
        } catch (error) {
            console.error("Error processing page views queue:", error);
        }
    }
    fetchCurrentSession(businessId, consumerId) {
        const request = new GetCurrentSessionRequest();
        request.setBusinessId(businessId);
        request.setConsumerId(consumerId);
        // #TODOS: LASTBASIS
        return Client.callFunc(0xaa250af0, request).then(({ result, err }) => {
            if (err) {
                console.error("Error fetching current session:", err);
                return;
            }
            const deserialized = GetCurrentSessionResponse.deserializeBinary(result);
            const sessions = deserialized.getSessionsList();
            const success = deserialized.getSuccess();
            const errorMessage = deserialized.getErrorMessage();
            if (success) {
                const inboxIds = [];
                sessions.forEach(session => {
                    this.#sessions.upsert({ id: session.getId() }, { $set: session.toObject() });
                    // proc.push(this.getPageViews({ businessId, sessionId: session.getId() }));
                    // this.#pageViewsQueue.enqueue({ businessId, sessionId: session.getId() });
                    inboxIds.push(session.getInboxId());
                });
                this.setCurrentSession({ inboxIds: inboxIds });
                this.#sessions.find({}).forEach(session => {
                    this.#pageViewsQueue.enqueue({ businessId, sessionId: session.id });
                });
                this.processPageViewsQueue();
                this.activateWatch();
            } else {
                console.error("Error fetching current session:", errorMessage);
            }
        });
    }
    async getPageViews({ businessId, sessionId }) {
        const request = new GetPageViewsRequest();
        request.setBusinessId(businessId);
        request.setSessionId(sessionId);
        return Client.callFunc(0xdab1aa0b, request).then(({ result, err }) => {
            if (err) {
                console.error("Error fetching page views:", err);
                return;
            }
            const deserialized = GetPageViewsResponse.deserializeBinary(result);
            const pageViews = deserialized.getPageViewsList();
            const success = deserialized.getSuccess();
            if (success && pageViews.length > 0) {
                pageViews.forEach(pageView => {
                    this.#pageViews.upsert({ id: pageView.getId() }, { $set: pageView.toObject() });
                });
                console.log(success, pageViews.length, this.#pageViews.find({}).fetch());
            } else {
                console.error("Error fetching page views:", deserialized.getErrorMessage());
            }
            this.activateWatch();
        });
    }
    listen(businessId) {
        if (this.subscription) return;
        this.subscription = RedisventService.Sessions.listen("page_views", businessId, ({ event, data }) => {
            data = data.data;
            switch (event) {
                case "PAGE_VIEWS":
                    this.#pageViews.upsert({ id: data.id }, { $set: data });
                    break;
                case "SESSIONS":
                    this.#sessions.upsert({ id: data.id }, { $set: data });
                    break;
            }
            this.activateWatch();
        });
    }
}

export default new SessionWatcher(Client);