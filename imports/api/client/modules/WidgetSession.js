// Avoid external deps; use crypto.randomUUID when available

// Minimal client-side Session service that calls backend RPCs (no direct API calls).
// Replace STATIC placeholders with your real values as needed.
import Client from "../Client";
import { InfoFinder } from "info-finder-client";
import widgetSessionService from "../../common/static_codegen/tmq/widget_session_pb";

const EVENTS = {
    INTERACTION_STARTED: 'interaction_started',
};

class WidgetSession {
    #sessionKey = 'sa-id-w';
    // No CSRF or OTT on client; all calls go through backend service
    #pageSessionId = null;
    #infoFinder = null;
    #metaInfo = {
        lang: '',
        tz: '',
        dev: '',
        ua: '',
        asn: ''
    };

    constructor() {
        this.#pageSessionId = this.generateSessionId();
        this.#infoFinder = new InfoFinder({ includeHighEntropy: true });
        this._initInfo().catch(() => { });
    }

    // Function IDs must match server WidgetSessionService mapping
    static FUNC_IDS = {
        SEND_CHAT: 0xeb1c0f9c,
        SEND_OUTBOUND: 0x8db0646f,
        SEND_INBOUND: 0x42eb444f,
    };

    // No auth headers, no HTTP fallbacks — we use RPC exclusively.

    async _rpcSendChat({ message, sessionId, assistantId, businessId }) {
        const req = new widgetSessionService.ChatMessageRequest();
        await this._ensureInfo();
        req.setMessage(message);
        if (sessionId) req.setSessionid(sessionId);
        if (assistantId) req.setAssistantid(assistantId);
        if (businessId) req.setBusinessid(businessId);
        if (typeof req.setMetasessionid === 'function') req.setMetasessionid(this.#pageSessionId);
        if (typeof req.setMeta === 'function') req.setMeta(JSON.stringify(this.getMeta()));
        const { result } = await Client.callFunc(WidgetSession.FUNC_IDS.SEND_CHAT, req);
        const resp = widgetSessionService.ChatMessageResponse.deserializeBinary(result);
        return resp.toObject(false);
    }

    async _rpcSendOutbound({ message, sessionId, room, type, businessId }) {
        const req = new widgetSessionService.ChatMessageRequest();
        await this._ensureInfo();
        req.setMessage(message);
        if (sessionId) req.setSessionid(sessionId);
        if (room) req.setRoom(room);
        if (type) req.setType(type);
        if (businessId) req.setBusinessid(businessId);
        if (typeof req.setMetasessionid === 'function') req.setMetasessionid(this.#pageSessionId);
        if (typeof req.setMeta === 'function') req.setMeta(JSON.stringify(this.getMeta()));
        const { result } = await Client.callFunc(WidgetSession.FUNC_IDS.SEND_OUTBOUND, req);
        const resp = widgetSessionService.ChatMessageResponse.deserializeBinary(result);
        return resp.toObject(false);
    }

    async _rpcSendInbound({ message, sessionId, room, type, transcriptId, isCallEnded, recordingId, isUpdate, businessId }) {
        const req = new widgetSessionService.ChatMessageRequest();
        await this._ensureInfo();
        req.setMessage(message);
        if (sessionId) req.setSessionid(sessionId);
        if (room) req.setRoom(room);
        if (type) req.setType(type);
        if (transcriptId) req.setTranscriptid(transcriptId);
        if (typeof isCallEnded === 'boolean') req.setIscallended(isCallEnded);
        if (recordingId) req.setRecordingid(recordingId);
        if (typeof isUpdate === 'boolean') req.setIsupdate(isUpdate);
        if (typeof req.setMetasessionid === 'function') req.setMetasessionid(this.#pageSessionId);
        if (typeof req.setMeta === 'function') req.setMeta(JSON.stringify(this.getMeta()));
        if (businessId) req.setBusinessid(businessId);
        const { result } = await Client.callFunc(WidgetSession.FUNC_IDS.SEND_INBOUND, req);
        const resp = widgetSessionService.ChatMessageResponse.deserializeBinary(result);
        return resp.toObject(false);
    }

    setWithTTL(key, value, ttlMs = 1000 * 60 * 60 * 24 * 30) {
        const item = { value: value || this.generateSessionId(), expiry: Date.now() + ttlMs };
        localStorage.setItem(key, JSON.stringify(item));
    }

    getWithTTL(key = this.#sessionKey) {
        const itemStr = localStorage.getItem(key);
        if (!itemStr) return null;
        try {
            const item = JSON.parse(itemStr);
            if (Date.now() > item.expiry) {
                localStorage.removeItem(key);
                return null;
            }
            return item.value;
        } catch {
            return null;
        }
    }

    generateSessionId() {
        const c = globalThis.crypto;
        if (c && typeof c.randomUUID === 'function') {
            return c.randomUUID();
        }
        return `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    }

    getMeta(sessionId) {
        return {
            lang: this.#metaInfo.lang?.preferred || '',
            tz: this.#metaInfo.tz?.timeZone || '',
            dev: this.#metaInfo.dev?.platform || '',
            ua: this.#metaInfo.ua?.userAgent || '',
            asn: this.#metaInfo.asn?.asn || '',
            sessionId: this.#pageSessionId
        };
    }

    setSessionId(sessionId) {
        this.#pageSessionId = sessionId;
    }

    async _initInfo() {
        try {
            this.#metaInfo.dev = await this.#infoFinder.identifyDevice();
            this.#metaInfo.asn = await this.#infoFinder.getASN();
        } catch { }
        try { this.#metaInfo.lang = this.#infoFinder.identifyLanguage(); } catch { }
        try { this.#metaInfo.tz = this.#infoFinder.identifyTimezone(); } catch { }
        try { this.#metaInfo.ua = this.#infoFinder.identifyUserAgent(); } catch { }
    }

    async _ensureInfo() {
        if (!this.#metaInfo || !this.#metaInfo.lang) {
            await this._initInfo();
        }
    }

    async sendChatMessage({ message, assistantId, businessId }) {
        // RPC only
        let sessionId = this.getWithTTL(this.#sessionKey);
        if (!sessionId) {
            this.setWithTTL(this.#sessionKey, this.generateSessionId());
            sessionId = this.getWithTTL(this.#sessionKey);
        }
        const rpc = await this._rpcSendChat({ message, sessionId, assistantId, businessId });
        if (rpc && rpc.success) return { response: rpc.response };
        throw new Error(rpc?.error || 'Chat request failed');
    }

    async sendOutbound({ businessId, message, room = null, type = 'call', isBot = true }) {
        let sessionId = this.getWithTTL(this.#sessionKey);
        if (!sessionId) {
            this.setWithTTL(this.#sessionKey, this.generateSessionId());
            sessionId = this.getWithTTL(this.#sessionKey);
        }
        const rpc = await this._rpcSendOutbound({ message, sessionId, room, type, businessId });
        if (rpc && rpc.success) return { response: rpc.response };
        throw new Error(rpc?.error || 'Outbound request failed');
    }

    async sendInbound({ businessId, message, room = null, type = 'call', transcriptId = null, isCallEnded = false, recordingId = null, isUpdate = null }) {
        let sessionId = this.getWithTTL(this.#sessionKey);
        if (!sessionId) {
            this.setWithTTL(this.#sessionKey, this.generateSessionId());
            sessionId = this.getWithTTL(this.#sessionKey);
        }
        const rpc = await this._rpcSendInbound({ message, sessionId, room, type, transcriptId, isCallEnded, recordingId, isUpdate, businessId });
        if (rpc && rpc.success) return { response: rpc.response };
        throw new Error(rpc?.error || 'Inbound request failed');
    }
}

const widgetSession = new WidgetSession();
export default widgetSession;


