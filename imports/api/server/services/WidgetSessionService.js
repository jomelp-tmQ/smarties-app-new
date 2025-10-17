import { status } from "@grpc/grpc-js";
import { tmq as widget } from "../../common/static_codegen/tmq/widget_session";
import Server from "../Server";
import Business from "../classes/dbTemplates/Business";
import Channels from "../classes/dbTemplates/Channels";

export default {
    // GetWidgetTokens
    getWidgetTokens: async function ({ request }, callback) {
        try {
            const siteId = Server.Config?.widgetServer?.siteId || 'default';
            const apiBase = Server.Config?.widgetServer?.apiBase || 'http://localhost:4001';

            // Fetch CSRF token
            const csrfRes = await fetch(`${apiBase}/api/config/auth/csrf-token`, { credentials: 'include' });
            const csrfJson = await csrfRes.json().catch(() => ({}));
            const csrfToken = csrfJson.csrfToken || null;

            // Fetch widget js to extract OTT (dev flow) - server-side safe
            const jsRes = await fetch(`${apiBase}/widget/js?siteId=${encodeURIComponent(siteId)}&dev=true`);
            const script = await jsRes.text();
            const match = script.match(/oneTimeToken\s*[:=]\s*['\"]([^'\"\s]+)['\"]/);
            const ott = match && match[1] ? match[1] : null;

            const resp = new widget.WidgetTokenResponse();
            resp.success = Boolean(csrfToken && ott);
            if (ott) resp.oneTimeToken = ott;
            if (csrfToken) resp.csrfToken = csrfToken;
            if (!ott || !csrfToken) resp.error = 'Failed to acquire tokens';
            callback(null, resp);
        } catch (err) {
            callback({ code: 500, message: err.message, status: status.INTERNAL });
        }
    },

    // SendChatMessage
    sendChatMessage: async function ({ request }, callback) {
        try {
            const message = request.getMessage ? request.getMessage() : request.message;
            const sessionId = request.getSessionid ? request.getSessionid() : request.sessionId;
            const rawMeta = request.getMeta ? request.getMeta() : request.meta;
            const assistantIdFromReq = request.assistantId;
            const businessIdFromReq = request.businessId;

            if (!businessIdFromReq) {
                return callback({ code: 500, message: "businessId is required", status: status.INTERNAL });
            }

            const business = await Business.findById(businessIdFromReq);
            if (!business) {
                return callback({ code: 500, message: "business not found", status: status.INTERNAL });
            }
            // find siteId by businessId
            const channels = await Channels.findByBusinessId(businessIdFromReq);
            if (!channels) {
                return callback({ code: 500, message: "channels not found", status: status.INTERNAL });
            }

            const siteId = channels.find(channel => channel.type === 'chat')?.identifier;
            const slug = business.slug;

            let meta = {};
            if (rawMeta) {
                try { meta = typeof rawMeta === 'string' ? JSON.parse(rawMeta) : rawMeta; } catch { meta = {}; }
            }

            const msg = typeof message === 'string' ? message : (message ?? '');
            const messageId = crypto.randomUUID();
            const llm = Server.Config?.widgetConfig?.llm || {};
            const llmUrl = llm?.serverUrl || "https://n8n.ph01.us/webhook/completions";
            if (!assistantIdFromReq) {
                return callback({ code: 500, message: "assistantId is required", status: status.INTERNAL });
            }

            const payload = {
                assistantId: assistantIdFromReq,
                sessionId: sessionId,
                query: msg,
                provider: "smarties",
                type: 'chat',
                messageId: messageId,
                identifier: siteId,
                from: sessionId,
                to: siteId,
                meta: meta,
                slug,
            };
            // if (slugFromConfig) payload.slug = slugFromConfig;
            const basicAuth = Buffer.from(`${llm.apiKey}:${llm.apiSecret}`).toString('base64');
            const response = await fetch(llmUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json, text/plain, */*',
                    'Authorization': `Basic ${basicAuth}`
                },
                body: JSON.stringify(payload)
            });

            const dataJson = await response.json();
            const resp = new widget.ChatMessageResponse();
            resp.success = response.ok;
            resp.response = dataJson.response;
            callback(null, resp);
        } catch (err) {
            callback({ code: 500, message: err.message, status: status.INTERNAL });
        }
    },

    // SendOutboundMessage
    sendOutboundMessage: async function ({ request }, callback) {
        await this._proxyCall('/outbound-chat', { request }, callback);
    },

    // SendInboundMessage
    sendInboundMessage: async function ({ request }, callback) {
        await this._proxyCall('/inbound-chat', { request }, callback);
    },

    // Helpers
    _headers(tokens, siteId) {
        const headers = { 'Content-Type': 'application/json', 'X-Site-ID': siteId };
        if (tokens.csrfToken) headers['X-CSRF-Token'] = tokens.csrfToken;
        if (tokens.oneTimeToken) {
            headers['Authorization'] = `Bearer ${tokens.oneTimeToken}`;
            headers['X-One-Time-Token'] = tokens.oneTimeToken;
        }
        return headers;
    },

    async _getTokens(apiBase, siteId) {
        const csrfRes = await fetch(`${apiBase}/api/config/auth/csrf-token`, { credentials: 'include' });
        const csrfJson = await csrfRes.json().catch(() => ({}));
        const csrfToken = csrfJson.csrfToken || null;
        const jsRes = await fetch(`${apiBase}/widget/js?siteId=${encodeURIComponent(siteId)}&dev=true`);
        const script = await jsRes.text();
        const match = script.match(/oneTimeToken\s*[:=]\s*['\"]([^'\"\s]+)['\"]/);
        const oneTimeToken = match && match[1] ? match[1] : null;
        return { csrfToken, oneTimeToken };
    },

    async _proxyCall(path, { request }, callback) {
        try {
            const apiBase = Server.Config?.widgetServer?.apiBase || 'http://localhost:4001';
            // const siteId = Server.Config?.widgetServer?.siteId || 'default';
            const businessId = request.getBusinessid ? request.getBusinessid() : request.businessId;
            const message = request.getMessage ? request.getMessage() : request.message;
            const sessionId = request.getSessionid ? request.getSessionid() : request.sessionId;
            const room = request.getRoom ? request.getRoom() : request.room;
            const type = request.getType ? (request.getType() || 'call') : (request.type || 'call');
            const transcriptId = request.getTranscriptid ? request.getTranscriptid() : request.transcriptId;
            const isCallEnded = request.getIscallended ? request.getIscallended() : request.isCallEnded;
            const recordingId = request.getRecordingid ? request.getRecordingid() : request.recordingId;
            const isUpdate = request.getIsupdate ? request.getIsupdate() : request.isUpdate;
            const metaSessionId = request.getMetasessionid ? request.getMetasessionid() : request.metaSessionId;
            const rawMeta = request.getMeta ? request.getMeta() : request.meta;


            const business = await Business.findById(businessId);
            if (!business) {
                return callback({ code: 500, message: "business not found", status: status.INTERNAL });
            }
            // find siteId by businessId
            const channels = await Channels.findByBusinessId(businessId);
            if (!channels) {
                return callback({ code: 500, message: "channels not found", status: status.INTERNAL });
            }

            const siteId = channels.find(channel => channel.type === 'call')?.identifier;
            const slug = business.slug;

            // Build meta from client-provided JSON + enrich with call context
            let meta = {};
            if (rawMeta) {
                try { meta = typeof rawMeta === 'string' ? JSON.parse(rawMeta) : rawMeta; } catch { meta = {}; }
            }
            if (metaSessionId) meta.sessionId = metaSessionId;
            if (room) meta.roomId = room;
            if (transcriptId) meta.transcriptId = transcriptId;
            if (typeof isCallEnded === 'boolean') meta.isCallEnded = isCallEnded;
            if (typeof isUpdate === 'boolean') meta.isUpdate = isUpdate;

            // Build exact payloads and call Smarties server directly
            const isInbound = String(path).toLowerCase().includes('inbound');
            const callCfg = Server.Config?.widgetConfig?.call || {};
            const smartyUrl = callCfg.smartyUrl || "http://localhost:3000";
            const apiKey = callCfg.apiKey || 'tmq';
            const apiSecret = callCfg.apiSecret || 'P@ssword1';
            const assistantId = callCfg.assistantId || 'AS_6814fd08cfb88255d7288d64';
            const basicAuth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
            const messageId = crypto.randomUUID();

            let payload;
            if (!isInbound) {
                // Outbound payload (exact shape)
                payload = {
                    assistantId: assistantId,
                    sessionId: sessionId,
                    text: message,
                    provider: "smarties",
                    type: 'call',
                    identifier: sessionId || 'smarty-chat-main',
                    messageId: messageId,
                    from: siteId,
                    to: sessionId,
                    slug: slug,
                    meta: meta
                };
            } else {
                // Inbound payload (exact shape)
                payload = {
                    assistantId: assistantId,
                    sessionId: sessionId,
                    text: message,
                    provider: "smarties",
                    type: type || 'call',
                    messageId: messageId,
                    identifier: siteId || 'smarty-chat-main',
                    from: sessionId,
                    to: siteId,
                    slug: slug,
                    meta: meta
                };
                if (recordingId) payload.attachments = [recordingId];
            }

            const endpoint = isInbound ? 'inbound' : 'outbound';
            const res = await fetch(`${smartyUrl}/api/b/${slug}/channels/messages/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${basicAuth}`
                },
                body: JSON.stringify(payload)
            });
            const data = await res.json().catch(async () => ({ response: await res.text() }));
            const resp = new widget.ChatMessageResponse();
            resp.success = res.ok;
            if (res.ok) resp.response = data.response || '';
            else resp.error = data?.message || 'Request failed';
            callback(null, resp);
        } catch (err) {
            callback({ code: 500, message: err.message, status: status.INTERNAL });
        }
    }
};


