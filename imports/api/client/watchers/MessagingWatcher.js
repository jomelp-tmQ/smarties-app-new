import core from "@tmq-dev-ph/tmq-dev-core-client";
import { Meteor } from "meteor/meteor";
import { Watcher2 } from "../Watcher2";
import Client from "../Client";
import { toast } from 'sonner';
import { TOAST_STYLE } from "../../common/const";
// import { Accounts } from 'meteor/tmq:accounts';
const { Adapter, Logger } = core;
import inboxService from "../../common/static_codegen/tmq/inbox_pb";
import interactionService from "../../common/static_codegen/tmq/interaction_pb";
import takeoverService from "../../common/static_codegen/tmq/takeover_pb";
import attachmentService from "../../common/static_codegen/tmq/attachment_pb";
import apiService from "../../common/static_codegen/tmq/api_pb";
import LiveKitVoiceClient from "@tmq.paul/pipecat-livekit-sdk";
import {
    collectionManager,
    syncManager,
    subscriptionManager
} from 'redisvent-module';
import axios from "axios";
import PredefinedAnswerClient from 'predefined-answer-client';
import { WebSpeechSTTProvider } from "./stt/webspeech";
import { WebSpeechTTSProvider } from "./tts/webspeech";
import SessionWatcher from "./SessionWatcher";
import { decodeAny, decodeAttributeList } from "../../common/utils";

Adapter.Meteor = Meteor;
// Adapter.Accounts = Accounts;

export const POPUP = {
    SCRIPT_INJECTION: "scriptInjectionPopup",
    MESSAGES_FILTER: "messagesFilterPopup",
    DATA_ENRICHMENT: "dataEnrichmentPopup",
};

export const TOGGLE = {
    SMARTIES_ASSISTANT: "smartiesAssistant"
};

export const TAB = {
    MESSAGES: "messagesTab",
    CUSTOMER_INFORMATION: "customerInformationTab"
};

export const INTERACTION = {
    LOADING_MESSAGE: "loadingMessage",
    LOADING_INBOX: "loadingInbox",
    LOADING_SUGGESTIONS: "loadingSuggestions",
    INBOX: "inbox",
    CURRENT: "currentInteraction",
    MESSAGE_TEXT: 'text',
    MESSAGES: "messages",
    PREDEFINED_ANSWERS: "predefinedAnswers",
    SUGGESTIONS: "suggestions",
    LATEST_INTERACTION: "latestInteraction",
};
class MessagingWatcher extends Watcher2 {
    #sessionId = null;
    #businessId = "";
    #businessSlug = "tmq.kurt.g";
    #interactionData = null;
    #pamClient = null;
    #liveKitClient = null;
    #stt = null;
    #tts = null;
    #currentRoom = null;
    #audioElements = new Map();
    #currentOutputDeviceId = null;
    #audioUnblockRegistered = false;
    #interactionsLastBasisByConsumer = new Map();
    #attachmentsLastBasisByConsumer = new Map();
    #attachmentsData = null;
    #spaces = { INTERACTION: 'interactionapp', ATTACHMENT: 'attachmentapp' };
    #collections = { INTERACTION: 'interaction', ATTACHMENT: 'attachment' };
    constructor(parent) {
        super(parent);
        this.setValue(TAB.MESSAGES, 'all');
        this.setValue(TAB.CUSTOMER_INFORMATION, 'profile');
        this.setValue(POPUP.MESSAGES_FILTER, false);
        this.setValue(INTERACTION.MESSAGE_TEXT, '');
        this.#interactionData = collectionManager.getCollection(this.#spaces.INTERACTION, this.#collections.INTERACTION, {
            syncEnabled: false  // We'll handle sync manually
        });

        this.#attachmentsData = collectionManager.getCollection(this.#spaces.ATTACHMENT, this.#collections.ATTACHMENT, {
            syncEnabled: false  // We'll handle sync manually
        });

        Accounts.getCurrentUser().then((user) => {
            this.#businessId = user.businessId;
            this.#businessSlug = user.slug;
            this.SessionWatcher.listen(this.#businessId);
        }).catch((error) => {
        });
    }

    get BusinessId() {
        return this.#businessId;
    }

    get DBInteraction() {
        return this.#interactionData;
    }

    get DBAttachments() {
        return this.#attachmentsData;
    }

    async initialize() {
        const redisVentReady = await this.Parent.RedisVentReadyPromise;
        if (!redisVentReady) {
            toast.error("RedisVent not ready", TOAST_STYLE);
            return;
        }

        // Ensure RedisVent is connected
        if (!this.#pamClient) await this.initializePredefinedAnswer();
        if (!this.#liveKitClient) await this.initializeLiveKit();
        if (!this.#stt || !this.#tts) await this.initializeSTTAndTTS();
        // Subscribe to space
        Object.values(this.#spaces).forEach(space => {
            if (!syncManager.subscribedSpaces.has(space)) syncManager.subscribeToSpace(space);
        });
    }

    async initializePredefinedAnswer() {
        if (this.#pamClient) return;
        const data = await this.ensureConfig();
        try {
            this.#pamClient = new PredefinedAnswerClient({
                serverUrl: data.predefinedAnswer.serverUrl,
                apiKey: data.predefinedAnswer.apiKey,
                refreshEndpoint: data.predefinedAnswer.refreshEndpoint
            });
        } catch (error) {
            toast.error("Failed to initialize predefined answer", TOAST_STYLE.ERROR);
        }

    }

    async initializeLiveKit() {
        if (this.#liveKitClient) return;
        let serverUrl = null;
        const serverUrlFromDb = this.Settings.livekitServerUrl;
        if (serverUrlFromDb) {
            serverUrl = serverUrlFromDb;
        } else {
            const data = await this.ensureConfig();
            const fallbackUrl = (this.Settings && (this.Settings.livekitServerUrl || (this.Settings.livekit && this.Settings.livekit.serverUrl)))
                || (Meteor.settings && Meteor.settings.public && (Meteor.settings.public.livekitServerUrl || (Meteor.settings.public.livekit && Meteor.settings.public.livekit.serverUrl)))
                || "";
            serverUrl = (data && data.livekit && data.livekit.serverUrl) || fallbackUrl;
        }
        if (serverUrl) {
            this.#liveKitClient = new LiveKitVoiceClient({ serverUrl });
            this.liveInitEventListeners();
        } else toast.error('LiveKit server URL is not set', {
            style: TOAST_STYLE.ERROR
        });
    }

    async liveInitEventListeners() {
        this.#liveKitClient.on('connected', (data) => {
            this.setValue("IS_TAKEN_OVER_CALL", true);
            // this.setValue(CALL_SMARTIE.STATUS, CALL_STATUS.ONGOING);
            // this.setValue(CALL_SMARTIE.SPEAKING, false);
        });
        this.#liveKitClient.on('disconnected', () => {
            console.log('Disconnected from room');
            this.#stt.stopListening();
        });
        this.#liveKitClient.on('status', (status) => {
            console.log('Status:', status);
        });
        this.#liveKitClient.on('error', (error) => {
            console.log('Error:', error);
        });
        this.#liveKitClient.on('participantConnected', (participant) => {
            console.log('Participant connected:', participant);
        });
        this.#liveKitClient.on('participantDisconnected', (participant) => {
            console.log('Participant disconnected:', participant);
        });
        this.#liveKitClient.on('participantsUpdated', (participants) => {
            console.log('Participants updated:', participants);
        });
        this.#liveKitClient.on('audioTrackSubscribed', (track) => {
            console.log('Audio track subscribed:', track);

            try {
                // Resolve underlying remote audio track and a stable ID
                let remoteTrack = null;
                if (typeof track?.attach === 'function' || track?.mediaStreamTrack) {
                    remoteTrack = track;
                } else if (track?.track && (typeof track.track.attach === 'function' || track.track.mediaStreamTrack)) {
                    remoteTrack = track.track;
                } else if (track?.audioTrack && (typeof track.audioTrack.attach === 'function' || track.audioTrack.mediaStreamTrack)) {
                    remoteTrack = track.audioTrack;
                }

                const trackId = remoteTrack?.sid
                    || remoteTrack?.mediaStreamTrack?.id
                    || track?.sid
                    || track?.trackSid
                    || track?.publication?.trackSid
                    || remoteTrack?.id
                    || track?.id;

                if (!trackId) return;
                if (this.#audioElements.has(trackId)) return;

                let container = document.getElementById('livekit-audio-container');
                if (!container) {
                    container = document.createElement('div');
                    container.id = 'livekit-audio-container';
                    container.style.position = 'fixed';
                    container.style.bottom = '0';
                    container.style.right = '0';
                    container.style.width = '1px';
                    container.style.height = '1px';
                    container.style.overflow = 'hidden';
                    container.style.zIndex = '-1';
                    document.body.appendChild(container);
                }

                const audio = document.createElement('audio');
                audio.autoplay = true;
                audio.playsInline = true;
                audio.muted = false;
                audio.volume = 1.0;
                audio.preload = 'auto';
                audio.dataset.trackId = String(trackId);
                audio.style.display = 'none';

                let attached = false;
                if (remoteTrack && typeof remoteTrack.attach === 'function') {
                    try {
                        remoteTrack.attach(audio);
                        attached = true;
                    } catch (_e) {
                        attached = false;
                    }
                }

                if (!attached) {
                    const mstrack = remoteTrack?.mediaStreamTrack
                        || track?.mediaStreamTrack
                        || track?.track?.mediaStreamTrack
                        || track?.audioTrack?.mediaStreamTrack;
                    if (mstrack) {
                        const stream = new MediaStream([mstrack]);
                        audio.srcObject = stream;
                    }
                }

                // Set output device if specified
                if (this.#currentOutputDeviceId && typeof audio.setSinkId === 'function') {
                    audio.setSinkId(this.#currentOutputDeviceId).catch(() => { });
                }

                container.appendChild(audio);

                // Attempt to play immediately; if blocked, register one-time user-gesture resume
                const playPromise = audio.play();
                if (playPromise && typeof playPromise.catch === 'function') {
                    playPromise.catch((_err) => {
                        if (!this.#audioUnblockRegistered) {
                            this.#audioUnblockRegistered = true;
                            const resumeAll = () => {
                                this.#audioElements.forEach((a) => {
                                    try { a.muted = false; } catch (_e) { }
                                    const p = a.play();
                                    if (p && typeof p.catch === 'function') { p.catch(() => { }); }
                                });
                                document.removeEventListener('click', resumeAll);
                                document.removeEventListener('touchstart', resumeAll);
                                this.#audioUnblockRegistered = false;
                            };
                            document.addEventListener('click', resumeAll, { once: true, passive: true });
                            document.addEventListener('touchstart', resumeAll, { once: true, passive: true });
                        }
                        console.warn('Autoplay may be blocked. Click or tap the page to enable audio.');
                    });
                }

                this.#audioElements.set(trackId, audio);
            } catch (e) {
                console.error('Failed to attach audio track:', e);
            }
        });
        this.#liveKitClient.on('audioTrackUnsubscribed', (track) => {
            console.log('Audio track unsubscribed:', track);
            try {
                const trackId = track?.sid
                    || track?.mediaStreamTrack?.id
                    || track?.id
                    || track?.trackSid
                    || track?.publication?.trackSid
                    || track?.track?.sid
                    || track?.audioTrack?.sid
                    || track?.track?.mediaStreamTrack?.id
                    || track?.audioTrack?.mediaStreamTrack?.id;
                const audio = this.#audioElements.get(trackId);
                if (audio) {
                    try {
                        if (typeof track?.detach === 'function') track.detach(audio);
                    } catch (_e) { }
                    audio.pause();
                    if (audio.srcObject) {
                        const tracks = audio.srcObject.getTracks?.() || [];
                        tracks.forEach(t => t.stop?.());
                        audio.srcObject = null;
                    }
                    if (audio.parentElement) audio.parentElement.removeChild(audio);
                    this.#audioElements.delete(trackId);
                }
            } catch (e) {
                console.error('Failed to detach audio track:', e);
            }
        });
        this.#liveKitClient.on('microphoneEnabled', () => {
            console.log('Microphone enabled');
        });
        this.#liveKitClient.on('microphoneDisabled', () => {
            console.log('Microphone disabled');
        });
        // Transcription Events
        this.#liveKitClient.on('userTranscription', (data) => {
        });
        this.#liveKitClient.on('assistantTranscription', (data) => {
            console.log('Assistant transcription:', data);
        });

        // Speaking State Events
        this.#liveKitClient.on('userSpearkingState', (state) => {
            console.log('User speaking state:', state);
        });

        this.#liveKitClient.on('botSpeakingState', (state) => {
            if (state.state === 'start') {
            } else if (state.state === 'stop') {
            }
        });

        // User Recording Event
        this.#liveKitClient.on('userRecording', (recording) => {
            console.log('User recording:', recording);
        });
    }

    /** Attachments fetching by inboxIds (merged) with pagination */
    async fetchAttachmentsByInboxIds(inboxIds = [], { append = false, limit = 10 } = {}) {
        try {
            if (!Array.isArray(inboxIds) || inboxIds.length === 0) return;
            // Derive a consumer key for pagination caching. If currentInteraction set, use its consumerId
            const current = this.getValue(INTERACTION.CURRENT);
            let consumerKey = current?.consumerId;
            if (consumerKey && typeof consumerKey !== 'string') consumerKey = consumerKey._str;
            if (!consumerKey) consumerKey = inboxIds.sort().join(',');

            const req = new proto.tmq.GetAttachmentsByInboxIdsRequest();
            inboxIds.forEach((id) => {
                const idsMsg = new proto.tmq.InboxIds();
                idsMsg.setInboxIds(id);
                req.addInboxIds(idsMsg);
            });
            const p = new proto.tmq.Pagination();
            const last = append ? (this.#attachmentsLastBasisByConsumer.get(consumerKey) || 0) : 0;
            p.setLastBasis(last);
            p.setLimit(limit);
            req.setPage(p);

            const { err, result } = await this.Parent.callFunc(0x4a0260ab, req); // AttachmentService.GetAttachmentsByInboxIds
            if (err) {
                toast.error("Failed to fetch attachments", TOAST_STYLE.ERROR);
                return { ok: false };
            }
            const res = proto.tmq.GetAttachmentsResponse.deserializeBinary(result);
            const resObj = res.toObject();
            if (!resObj.success) {
                toast.error(resObj.errorMessage || "Failed to fetch attachments", TOAST_STYLE.ERROR);
                return { ok: false };
            }
            // Map to simple objects and pin stable _id to backend id
            const mapped = (resObj.attachmentsList || []).map(a => ({
                _id: a.id,
                id: a.id,
                businessId: a.businessId,
                inboxId: a.inboxId,
                recordingId: a.recordingId,
                interactionId: a.interactionId,
                consumerId: a.consumerId,
                channelId: a.channelId,
                originalName: a.originalName,
                fileSize: a.fileSize,
                mimeType: a.mimeType,
                fileExtension: a.fileExtension,
                remoteUrl: a.remoteUrl,
                source: a.source,
                createdAt: a.createdAt,
                recordingId: a.recordingId,
                attributes: decodeAttributeList(a.attributesList),
            }));

            // Caller can merge/store as needed. Return cursor state too.
            const lastBasis = Number(resObj.lastBasis || 0);
            if (lastBasis) this.#attachmentsLastBasisByConsumer.set(consumerKey, lastBasis);
            else this.#attachmentsLastBasisByConsumer.set(consumerKey, 0);
            // Replace vs Append
            if (!append) {
                const existing = await this.#attachmentsData.find({}).fetch();
                for (const doc of existing) await this.#attachmentsData.remove(doc._id);
            }

            for (const attachment of mapped) {
                const key = attachment._id || attachment.id;
                const exists = await this.#attachmentsData.findOne({ recordingId: attachment.recordingId });
                if (exists) await this.#attachmentsData.update(key, attachment);
                else await this.#attachmentsData.insert(attachment);
            }

            // Refresh snapshot from collection to preserve _id and full merged set
            this.activateWatch();
            return { ok: true, data: mapped, lastBasis };
        } catch (error) {
            toast.error("Failed to fetch attachments", TOAST_STYLE.ERROR);
            return { ok: false };
        }
    }

    async deleteAttachment(currentSelected) {
        try {
            if (!currentSelected) {
                toast.error('No attachment selected', TOAST_STYLE.ERROR);
                return;
            }
            const attachmentId = typeof currentSelected === 'string'
                ? currentSelected
                : (currentSelected._id || currentSelected.id || currentSelected.attachmentId || currentSelected.attachment_id);
            if (!attachmentId) {
                toast.error('Missing attachment id', TOAST_STYLE.ERROR);
                return;
            }

            // Build request for AttachmentService.DeleteAttachment (soft-delete)
            const req = new attachmentService.DeleteAttachmentRequest();
            if (typeof req.setAttachmentId === 'function') req.setAttachmentId(String(attachmentId));
            else if (typeof req.setAttachment_id === 'function') req.setAttachment_id(String(attachmentId));

            const { result } = await this.Parent.callFunc(0x9ee33160, req);
            const resp = attachmentService.DeleteAttachmentResponse.deserializeBinary(result).toObject();
            const ok = Boolean(resp.success ?? resp.ok ?? false);
            if (!ok) {
                const msg = resp.errorMessage || resp.error_message || 'Failed to delete attachment';
                toast.error(msg, TOAST_STYLE.ERROR);
                return;
            }

            // Optimistically remove from local collection; RedisVent remove will also arrive shortly
            let removed = await this.#attachmentsData.remove(String(attachmentId));
            if (!removed) {
                const byRecording = await this.#attachmentsData.findOne({ recordingId: currentSelected?.recordingId });
                if (byRecording) removed = await this.#attachmentsData.remove(byRecording._id);
            }
            this.activateWatch();
            toast.success('Attachment deleted', TOAST_STYLE.SUCCESS);
        } catch (error) {
            console.error('Delete attachment failed:', error);
            toast.error('Delete failed', TOAST_STYLE.ERROR);
        }
    }

    // Messages
    searchMessages(value) {
        console.log("Searching messages...", value);
    }
    togglefilterMessagesPopup() {
        this.setValue(POPUP.MESSAGES_FILTER, !this.getValue(POPUP.MESSAGES_FILTER));
    }

    messagesTabChange(tab = 'all') {
        this.setValue(TAB.MESSAGES, tab);
    }

    /**
     * Fetch messages/interactions from the server for a specific inbox.
     * @param {Object} inboxData - The inbox data containing _id (inboxId)
     */
    async fetchMessages(inboxData, { append = false, limit = 10 } = {}) {
        this.setValue(INTERACTION.LOADING_MESSAGE, true);
        if (!append && inboxData) {
            this.setValue(INTERACTION.CURRENT, inboxData);
        }
        SessionWatcher.fetchCurrentSession(inboxData.businessId, inboxData.consumerId);
        this.setValue("inboxActive", true);
        // subscribe to all inboxIds for merged view; fallback to representativeInboxId
        const inboxIds = inboxData.inboxIds || [];
        // update read count
        const reqUnreadCount = new proto.tmq.ReadCountRequest();
        inboxIds.forEach(id => {
            const inboxIdMsg = new proto.tmq.InboxIds();
            inboxIdMsg.setInboxIds(id);
            reqUnreadCount.addInboxIds(inboxIdMsg);
        });
        if (!append && Array.isArray(inboxIds) && inboxIds.length > 0) this.fetchAttachmentsByInboxIds(inboxIds);
        reqUnreadCount.setBusinessId(this.#businessId);
        await this.Parent.callFunc(0x1ca48d2d, reqUnreadCount);
        let consumerId = inboxData.consumerId;
        if (typeof consumerId !== 'string') consumerId = consumerId._str;
        const latestInteractionId = inboxData.latestInteractionId;
        this.interactionListen(consumerId);
        // Start listening for attachments related to this consumer as well
        this.attachmentListen(consumerId);
        try {
            // Prefer fetching by consumer for merged view
            const req = new proto.tmq.GetInteractionsByConsumerRequest();
            req.setBusinessId(this.#businessId);
            req.setConsumerId(consumerId);
            // req.setChannelIds(inboxData.channelIds);
            inboxData.channelIds.forEach(element => {
                req.addChannelIds(element);
            });
            // Pagination
            const p = new proto.tmq.Pagination();
            const lastBasis = append ? (this.#interactionsLastBasisByConsumer.get(consumerId) || 0) : 0;
            p.setLastBasis(lastBasis);
            p.setLimit(limit);
            req.setPage(p);

            // Call InteractionService.GetInteractionsByConsumer - 0xcbaf7911
            const { err, result } = await this.Parent.callFunc(0xcbaf7911, req);

            if (err) {
                console.error("Error fetching interactions:", err);
                toast.error("Failed to fetch messages", TOAST_STYLE);
                return;
            }

            // Deserialize the response
            const response = proto.tmq.GetInteractionsResponse.deserializeBinary(result);
            const responseObj = response.toObject();

            if (responseObj.success) {
                // Transform server data to UI message format
                let transformedMessages = responseObj.interactionsList.map(interaction => {
                    const attributes = decodeAttributeList(interaction.attributesList);
                    return {
                        id: interaction.id,
                        businessId: interaction.businessId,
                        inboxId: interaction.inboxId,
                        channelId: interaction.channelId,
                        consumerId: interaction.consumerId,
                        userId: interaction.userId,
                        medium: interaction.medium,
                        direction: interaction.direction,
                        message: interaction.payload?.text || '',
                        attachments: interaction.payload?.attachmentsList || [],
                        status: interaction.status,
                        timestamp: interaction.timestamp,
                        attributes,
                        // UI specific fields for compatibility with existing components
                        sender: interaction.direction === 'inbound' ? 'User' : 'Agent'
                    };
                });
                // Ensure strict timestamp ordering (oldest -> newest)
                transformedMessages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

                if (!append) {
                    // Fresh load: compute latestInteraction and update states
                    const latestInteraction = transformedMessages.find(interaction => interaction.id && latestInteractionId && interaction.id.includes(latestInteractionId))
                        || transformedMessages[transformedMessages.length - 1];
                    this.setValue(INTERACTION.LATEST_INTERACTION, latestInteraction);
                    const isAgent = this.getValue(TOGGLE.SMARTIES_ASSISTANT) ?? false;
                    if (latestInteraction && latestInteraction.direction === 'inbound' && !isAgent && latestInteraction.message) this.fetchSuggestions(latestInteraction.message);
                    // check if isCallEnded is true
                    const isCallEnded = latestInteraction && latestInteraction.attributes.find(attribute => attribute.key === 'isCallEnded')?.value;
                    if (isCallEnded) {
                        this.setValue(TOGGLE.SMARTIES_ASSISTANT, true);
                        this.setValue("IS_CURRENTLY_IN_CALL", false);
                    }
                    // check if  medium is call
                    if (latestInteraction && latestInteraction.medium === 'call') {
                        this.setValue("IS_CURRENTLY_IN_CALL", true);
                        this.#currentRoom = latestInteraction.attributes.find(attribute => attribute.key === 'roomId')?.value;
                    }
                    else {
                        this.setValue("IS_CURRENTLY_IN_CALL", false);
                        this.#currentRoom = null;
                    }

                    // get the sessionId in latestInteraction.attributes
                    const sessionId = latestInteraction && latestInteraction.attributes && latestInteraction.attributes.find(attribute => attribute.key === 'sessionId')?.value;
                    if (sessionId) {
                        this.#sessionId = sessionId;
                        await this.checkSmartiesAssistantStatus(sessionId);
                    }
                }

                // Merge with existing if appending
                let finalMessages = transformedMessages;
                if (append) {
                    const existingMsgs = await this.#interactionData.find({}).fetch();
                    const byId = new Map();
                    for (const m of existingMsgs) byId.set(m.id || m._id || m.timestamp + ':' + m.direction, m);
                    for (const m of transformedMessages) byId.set(m.id || m._id || m.timestamp + ':' + m.direction, m);
                    finalMessages = Array.from(byId.values());
                    finalMessages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
                }

                // Rewrite collection with finalMessages for consistent ordering
                const existing = await this.#interactionData.find({}).fetch();
                for (const doc of existing) {
                    await this.#interactionData.remove(doc._id);
                }
                for (const interaction of finalMessages) {
                    await this.#interactionData.insert(interaction);
                }
                // Save pagination cursor & hasMore for this consumer
                const respLastBasis = Number(responseObj.lastBasis || 0);
                if (respLastBasis) this.#interactionsLastBasisByConsumer.set(consumerId, respLastBasis);
                else this.#interactionsLastBasisByConsumer.set(consumerId, 0);
                this.activateWatch();
            } else {
                console.error("Server error:", responseObj.errorMessage);
                toast.error(responseObj.errorMessage || "Failed to fetch messages", TOAST_STYLE);
            }

        } catch (error) {
            console.error("Exception fetching interactions:", error);
            toast.error("Failed to fetch messages", TOAST_STYLE);
        } finally {
            this.setValue(INTERACTION.LOADING_MESSAGE, false);
        }
    }

    /**
     * Send a message.
     * This is a mock implementation that simulates sending a message.
     *  
     * @param {string} message - The message text to send.
     */
    async sendMessage(message = null, type = 'chat', meta = {}) {
        try {
            if (!message) message = this.getValue(INTERACTION.MESSAGE_TEXT);
            const req = new apiService.SendMessageRequest();
            if (typeof req.setBusinessId === 'function') req.setBusinessId(this.#businessId);
            else if (typeof req.setBusiness_id === 'function') req.setBusiness_id(this.#businessId);
            // provider is resolved server-side; do not set
            if (typeof req.setType === 'function') req.setType(type || 'chat');
            // from and to are resolved server-side; provide inboxId as hint
            const latestInteraction = this.getValue(INTERACTION.LATEST_INTERACTION);
            const current = this.getValue(INTERACTION.CURRENT);
            const normalizeId = (val) => {
                if (!val) return null;
                if (typeof val === 'string') {
                    const m = val.match(/ObjectID\(["']?([0-9a-fA-F]{24})["']?\)/i) || val.match(/ObjectId\(["']?([0-9a-fA-F]{24})["']?\)/i);
                    if (m && m[1]) return m[1];
                    return val.length === 24 ? val : null;
                }
                if (typeof val === 'object') {
                    if (val && typeof val._str === 'string') return val._str;
                    if (val && typeof val.$oid === 'string') return val.$oid;
                    if (typeof val.toHexString === 'function') return val.toHexString();
                    if (typeof val.toString === 'function') {
                        const s = val.toString();
                        const m = s.match(/ObjectID\(["']?([0-9a-fA-F]{24})["']?\)/i) || s.match(/ObjectId\(["']?([0-9a-fA-F]{24})["']?\)/i);
                        if (m && m[1]) return m[1];
                    }
                }
                return null;
            };
            let inboxIdCandidate = latestInteraction?.inboxId
                || current?.representativeInboxId
                || (Array.isArray(current?.inboxIds) ? current.inboxIds[0] : current?._id)
                || null;
            const inboxId = normalizeId(inboxIdCandidate);
            if (inboxId) {
                if (typeof req.setInboxId === 'function') req.setInboxId(inboxId);
                else if (typeof req.setInbox_id === 'function') req.setInbox_id(inboxId);
            } else {
                console.warn('sendMessage: unable to resolve valid inboxId');
            }
            if (typeof req.setText === 'function') req.setText(message || '');
            const metaObj = {
                agentId: 'agent_001',
                agentName: 'Support Agent',
                priority: 'normal',
                responseTime: String(Date.now()),
                sessionId: this.#sessionId,
                ...meta
            };
            if (typeof req.getMetaMap === 'function') {
                const m = req.getMetaMap();
                if (m && typeof m.set === 'function') {
                    Object.entries(metaObj).forEach(([k, v]) => m.set(k, String(v)));
                }
            } else if (typeof req.setMeta === 'function') {
                req.setMeta(metaObj);
            }

            const { err, result } = await this.Parent.callFunc(0x9cba2290, req);
            if (err) {
                toast.error("Failed to send message", TOAST_STYLE.ERROR);
                return;
            }
            const resp = apiService.SendMessageResponse.deserializeBinary(result);
            const respObj = resp.toObject();
            if (respObj.success) {
                this.setValue(INTERACTION.MESSAGE_TEXT, '');
                toast.success("Message sent successfully", TOAST_STYLE.SUCCESS);
            } else {
                toast.error(respObj.errorMessage || "Failed to send message", TOAST_STYLE.ERROR);
            }
        } catch (_) {
            toast.error("Failed to send message", TOAST_STYLE.ERROR);
        }
    }

    // Script Injection
    setScriptInjectionPopup(flag = false) {
        this.setValue(POPUP.SCRIPT_INJECTION, flag);
    }

    searchScriptInjection(value) {
        console.log("Searching script injection...", value);
    }

    filterScriptInjection(value) {
        console.log("Filtering script injection...", value);
    }
    scriptInjectionSelect(id) {
        console.log("Script injection selected", id);
    }


    // Customer Information
    customerInformationTabChange(tab = 'profile') {
        this.setValue(TAB.CUSTOMER_INFORMATION, tab);
    }
    setDataEnrichmentSideColumn(flag = false) {
        this.setValue(POPUP.DATA_ENRICHMENT, flag);
    }

    async toggleSmartiesAssistant() {
        try {
            const value = this.getValue(TOGGLE.SMARTIES_ASSISTANT) ?? true;
            const req = new proto.tmq.ToggleStatusRequest();
            req.setSessionid(this.#sessionId);
            req.setState(value ? 'human' : 'bot');
            const { err, result } = await this.Parent.callFunc(0x9e2202ca, req);
            if (err) toast.error("Failed to toggle Smarties Assistant", TOAST_STYLE.ERROR);
            const response = proto.tmq.StatusResponse.deserializeBinary(result);
            const responseObj = response.toObject();
            if (responseObj.success) this.setValue(TOGGLE.SMARTIES_ASSISTANT, !(responseObj.state === 'human'));
            else toast.error("Failed to toggle Smarties Assistant", TOAST_STYLE.ERROR);
        } catch (error) {
            console.error("Error toggling Smarties Assistant:", error);
            toast.error("Failed to toggle Smarties Assistant", TOAST_STYLE.ERROR);
        }
    }

    async checkSmartiesAssistantStatus(sessionId = null) {
        if (!sessionId) sessionId = this.#sessionId;
        if (!sessionId) {
            toast.warning("Session ID not found", TOAST_STYLE.WARNING);
            return;
        }
        try {
            const req = new proto.tmq.CheckStatusRequest();
            if (typeof sessionId === 'string') req.setSessionid(sessionId);
            else req.setSessionid(sessionId.toString());
            // req.setSessionid(sessionId);
            const { err, result } = await this.Parent.callFunc(0x6f678e77, req);
            if (err) toast.error("Failed to check Smarties Assistant Status", TOAST_STYLE.ERROR);
            const response = proto.tmq.StatusResponse.deserializeBinary(result);
            const responseObj = response.toObject();
            if (responseObj.success) this.setValue(TOGGLE.SMARTIES_ASSISTANT, !(responseObj.state === 'human'));
            else toast.error("Failed to check Smarties Assistant Status", TOAST_STYLE.ERROR);
        } catch (error) {
            console.error("Error checking Smarties Assistant Status:", error);
            toast.error("Failed to check Smarties Assistant Status", TOAST_STYLE.ERROR);
        } finally {
            this.setValue(INTERACTION.LOADING_SUGGESTIONS, false);
        }
    }

    async fetchSuggestions(query) {
        try {
            this.setValue(INTERACTION.LOADING_SUGGESTIONS, true);
            const data = await this.ensureConfig();
            const auth = btoa(`${data.auth.username}:${data.auth.password}`);
            const res = await axios.post(data.suggestion.url,
                {
                    query,
                    min: data.suggestion.min,
                    max: data.suggestion.max
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                        'Authorization': `Basic ${auth}`
                    }
                });
            if (res.status === 200 && res.data.output) this.setValue(INTERACTION.SUGGESTIONS, res.data.output.suggestions);
            else toast.error("Failed to fetch suggestions", TOAST_STYLE.ERROR);
            this.setValue(INTERACTION.LOADING_SUGGESTIONS, false);
        } catch (error) {
            toast.error("Failed to fetch suggestions" + error, TOAST_STYLE.ERROR);
            this.setValue(INTERACTION.LOADING_SUGGESTIONS, false);
        }

    }

    /** Predefined Answer */
    async addPredefinedAnswer({ title = "", body = "", locale = "en-US", tags = [] }) {
        try {
            if (!this.#pamClient) await this.initializePredefinedAnswer();
            const res = await this.#pamClient.addPredefinedAnswer({
                businessId: this.#businessId,
                title,
                body,
                locale,
                tags,
            });
            if (res) {
                toast.success("Predefined answer added successfully", TOAST_STYLE.SUCCESS);
                this.getPredefinedAnswersByBusinessId();
            }
            else toast.error("Failed to add predefined answer", TOAST_STYLE.ERROR);
        } catch (error) {
            toast.error("Failed to add predefined answer", TOAST_STYLE.ERROR);
        }

    }

    async getPredefinedAnswersByBusinessId() {
        try {
            if (!this.#pamClient) await this.initializePredefinedAnswer();
            const res = await this.#pamClient.getPredefinedAnswersByBusinessId(this.#businessId);
            if (res.ok) {
                this.setValue(INTERACTION.PREDEFINED_ANSWERS, res.data);
                return res.data;
            }
            else toast.error("Failed to fetch predefined answers", TOAST_STYLE.ERROR);
        } catch (error) {
            toast.error("Failed to fetch predefined answers", TOAST_STYLE.ERROR);
        }
    }

    async updatePredefinedAnswer(id, payload) {
        try {
            if (!this.#pamClient) await this.initializePredefinedAnswer();
            const res = await this.#pamClient.updatePredefinedAnswer(id, payload);
            if (res) {
                toast.success("Predefined answer updated successfully", TOAST_STYLE.SUCCESS);
                this.getPredefinedAnswersByBusinessId();
            }
            else toast.error("Failed to update predefined answer", TOAST_STYLE.ERROR);
        } catch (error) {
            toast.error("Failed to update predefined answer", TOAST_STYLE.ERROR);
        }
    }

    async deletePredefinedAnswer(id) {
        try {
            if (!this.#pamClient) await this.initializePredefinedAnswer();
            const res = await this.#pamClient.deletePredefinedAnswer(id);
            if (res) {
                toast.success("Predefined answer deleted successfully", TOAST_STYLE.SUCCESS);
                this.getPredefinedAnswersByBusinessId();
            }
            else toast.error("Failed to delete predefined answer", TOAST_STYLE.ERROR);
        } catch (error) {
            toast.error("Failed to delete predefined answer", TOAST_STYLE.ERROR);
        }
    }

    /** LiveKit */
    async joinRoom() {
        try {
            if (!this.#liveKitClient) await this.initializeLiveKit();
            if (!this.#currentRoom) {
                toast.warning("Room not set", TOAST_STYLE.WARNING);
                return;
            }

            if (!this.#stt || !this.#tts) await this.initializeSTTAndTTS();
            this.#stt.startListening();

            const room = await this.#liveKitClient.join({
                roomName: this.#currentRoom,
            });
            if (room.roomName) {
                await this.#liveKitClient.sendBotControl('MUTE');
                console.log('Connected to room:', room.roomName);
            }
            else {
                toast.error("Failed to join room", TOAST_STYLE.ERROR);
                this.setValue("isJoinedRoom", false);
            }
        } catch (error) {
            toast.error("Failed to join room", TOAST_STYLE.ERROR);
            this.setValue("isJoinedRoom", false);
        }

    }

    async leaveRoom() {
        if (!this.#liveKitClient) await this.initializeLiveKit();
        await this.#liveKitClient.sendBotControl('UNMUTE');
        await this.#liveKitClient.disconnect();
        this.setValue("IS_TAKEN_OVER_CALL", false);
        this.setValue("IS_CURRENTLY_IN_CALL", false);
    }

    async endCall() {
        if (!this.#liveKitClient) await this.initializeLiveKit();
        await this.#liveKitClient.endCall();
        this.sendMessage("Call ended", "chat", { roomId: this.#currentRoom, isCallEnded: true });
        this.setValue("IS_TAKEN_OVER_CALL", false);
        this.setValue("IS_CURRENTLY_IN_CALL", false);
        // await this.#liveKitClient.sendBotControl('END');
    }

    async callRoom() {
        if (!this.#liveKitClient) await this.initializeLiveKit();
        if (!this.#currentRoom) {
            toast.warning("Room not set", TOAST_STYLE.WARNING);
            return;
        }
    }

    // STT
    async initializeSTTAndTTS(config = {}) {
        if (this.#stt && this.#tts) return;
        this.#stt = new WebSpeechSTTProvider({ continuous: true });
        this.#tts = new WebSpeechTTSProvider();
        this.#stt.initialize();
        this.#tts.initialize();
        this.initSTTAndTTSEventListeners();
    }

    async initSTTAndTTSEventListeners() {
        this.#stt.onInterimResult((result) => {
            console.log(`🎯 Interim: "${result.transcript}"`);
        });

        // Listen for final results
        this.#stt.onFinalResult(async (result) => {
            if (result.transcript !== "" && result.transcript !== null) this.sendMessage(result.transcript, "call");
        });

        // Listen for errors
        this.#stt.onError((error) => {
            console.error("❌ STT Error:", error);
        });

        // Listen for start/stop events
        this.#stt.onStart(() => {
            console.log("🎤 Started listening...");
        });

        this.#stt.onEnd(() => {
            console.log("🔇 Stopped listening.");
        });

        this.#tts.onSpeechStart((utterance) => {
            console.log('��️ Speech started!', utterance.text);
        });

        this.#tts.onSpeechEnd((utterance) => {
            console.log('🔇 Speech ended!', utterance.text);
        });

        // Method 2: Using generic event system
        this.#tts.on('speechStart', (utterance) => {
            console.log('Speech started!');
        });
    }

    speak(text) {
        if (!this.#tts) this.initializeSTTAndTTS();
        this.#tts.speak(text);
    }

    async interactionListen(consumerId) {
        const redisVentReady = await this.Parent.RedisVentReadyPromise;
        if (!redisVentReady) {
            toast.error("RedisVent not ready", TOAST_STYLE);
            return;
        }
        // Stop existing interaction subscription if any
        if (this.interactionSubscription) {
            this.interactionSubscription.stop();
            this.interactionListening = false;
        }

        // Subscribe to real-time changes
        this.interactionSubscription = subscriptionManager.listen(
            this.#spaces.INTERACTION,
            this.#collections.INTERACTION,
            consumerId,
            async (change) => {
                // Handle real-time updates
                switch (change.type) {
                    case 'initial':
                        // Initial data - already in minimongo from fetch
                        console.log('Initial data received');
                        break;

                    case 'insert':
                        // Check if already exists
                        const exists = await this.#interactionData.findOne({ _id: change.id });
                        if (!exists) {
                            const data = {
                                _id: change.data._id._str,
                                businessId: change.data.businessId._str,
                                inboxId: change.data.inboxId._str,
                                channelId: change.data.channelId._str,
                                consumerId: change.data.consumerId._str,
                                userId: change.data.userId,
                                medium: change.data.medium,
                                direction: change.data.direction,
                                message: change.data.payload?.text || '',
                                attachments: change.data.payload?.attachmentsList || [],
                                status: change.data.status,
                                timestamp: change.data.createdAt,
                                attributes: decodeAttributeList(change.data.attributes),
                                sender: change.data.direction === 'inbound' ? 'User' : 'Agent'
                            };
                            const sessionId = change.data.attributes.find(attribute => attribute.key === 'sessionId')?.value;
                            const roomId = change.data.attributes.find(attribute => attribute.key === 'roomId')?.value;
                            if (roomId) this.#currentRoom = roomId;
                            if (sessionId !== this.#sessionId) {
                                this.#sessionId = sessionId;
                                await this.checkSmartiesAssistantStatus(sessionId);
                            }
                            const isCallEnded = data.attributes.find(attribute => attribute.key === 'isCallEnded')?.value;
                            const isAgent = this.getValue(TOGGLE.SMARTIES_ASSISTANT) ?? false;
                            if (data.direction === 'inbound' && data.message && !isAgent) this.fetchSuggestions(data.message);
                            if (isCallEnded == 'true' || isCallEnded == true) {
                                this.setValue(TOGGLE.SMARTIES_ASSISTANT, true);
                                this.setValue("IS_CURRENTLY_IN_CALL", false);
                            } else if (data.medium === 'call') this.setValue("IS_CURRENTLY_IN_CALL", true);
                            await this.#interactionData.insert(data);
                        }
                        break;

                    case 'update':
                        const updated = {
                            businessId: change.data.businessId?._str ?? change.data.businessId,
                            inboxId: change.data.inboxId?._str ?? change.data.inboxId,
                            channelId: change.data.channelId?._str ?? change.data.channelId,
                            consumerId: change.data.consumerId?._str ?? change.data.consumerId,
                            userId: change.data.userId,
                            medium: change.data.medium,
                            direction: change.data.direction,
                            message: change.data.payload?.text || '',
                            attachments: change.data.payload?.attachmentsList || [],
                            status: change.data.status,
                            timestamp: change.data.createdAt,
                            attributes: decodeAttributeList(change.data.attributes),
                            sender: change.data.direction === 'inbound' ? 'User' : 'Agent'
                        };
                        await this.#interactionData.update(change.id, updated);
                        const sessionAttr = (change.data.attributes || []).find(attribute => attribute.key === 'sessionId');
                        const decodedSessionId = sessionAttr && sessionAttr.value && typeof sessionAttr.value === 'object' ? decodeAny(sessionAttr.value) : sessionAttr?.value;
                        if (decodedSessionId) {
                            this.#sessionId = decodedSessionId;
                        }
                        break;

                    case 'remove':
                        await this.#interactionData.remove(change.id);
                        console.log('Interaction removed:', change.id);
                        break;

                    default:
                        console.log('Unknown event:', change.type);
                }
                this.activateWatch();
            }
        );

        this.interactionListening = true;
    }

    async attachmentListen(consumerId) {
        const redisVentReady = await this.Parent.RedisVentReadyPromise;
        if (!redisVentReady) {
            toast.error("RedisVent not ready", TOAST_STYLE);
            return;
        }
        // Stop existing attachment subscription if any
        if (this.attachmentSubscription) {
            this.attachmentSubscription.stop();
            this.attachmentListening = false;
        }

        // Subscribe to real-time attachment changes by consumerId
        this.attachmentSubscription = subscriptionManager.listen(
            this.#spaces.ATTACHMENT,
            this.#collections.ATTACHMENT,
            consumerId,
            async (change) => {
                try {
                    const id = change.data.recordingId || change.data.fileId;
                    switch (change.type) {
                        case 'initial':
                            // No-op; snapshot handled by explicit fetch
                            break;
                        case 'insert': {
                            const exists = await this.#attachmentsData.findOne({ recordingId: id });
                            if (!exists) {
                                const data = {
                                    _id: change.data._id?._str ?? change.data._id ?? change.id,
                                    businessId: change.data.businessId?._str ?? change.data.businessId,
                                    inboxId: change.data.inboxId?._str ?? change.data.inboxId,
                                    interactionId: change.data.interactionId?._str ?? change.data.interactionId,
                                    consumerId: change.data.consumerId?._str ?? change.data.consumerId,
                                    channelId: change.data.channelId?._str ?? change.data.channelId,
                                    originalName: change.data.originalName,
                                    fileSize: change.data.fileSize,
                                    mimeType: change.data.mimeType,
                                    fileExtension: change.data.fileExtension,
                                    recordingId: id,
                                    remoteUrl: change.data.remoteUrl,
                                    source: change.data.source,
                                    createdAt: change.data.createdAt,
                                    attributes: decodeAttributeList(change.data.attributes),
                                };
                                await this.#attachmentsData.insert(data);
                                this.activateWatch();
                            }
                            break;
                        }
                        case 'update': {
                            const updated = {
                                businessId: change.data.businessId?._str ?? change.data.businessId,
                                inboxId: change.data.inboxId?._str ?? change.data.inboxId,
                                interactionId: change.data.interactionId?._str ?? change.data.interactionId,
                                consumerId: change.data.consumerId?._str ?? change.data.consumerId,
                                channelId: change.data.channelId?._str ?? change.data.channelId,
                                originalName: change.data.originalName,
                                fileSize: change.data.fileSize,
                                mimeType: change.data.mimeType,
                                fileExtension: change.data.fileExtension,
                                recordingId: id,
                                remoteUrl: change.data.remoteUrl,
                                source: change.data.source,
                                createdAt: change.data.createdAt,
                                attributes: decodeAttributeList(change.data.attributes),
                            };
                            const exists = await this.#attachmentsData.findOne({ recordingId: id });
                            if (exists) await this.#attachmentsData.update(exists._id, updated);
                            else await this.#attachmentsData.insert(updated);
                            this.activateWatch();

                            // 🔔 Tell the UI that a specific recording is now ready
                            // Use setTimeout to ensure UI has updated before dispatching event
                            setTimeout(() => {
                                if (typeof window !== 'undefined') {
                                    window.dispatchEvent(new CustomEvent('messageAudio:fileReady', {
                                        detail: { recordingId: id }
                                    }));
                                }
                            }, 500);
                            break;
                        }
                        case 'remove': {
                            let removed = await this.#attachmentsData.remove(change.id);
                            if (!removed) {
                                const byRecording = await this.#attachmentsData.findOne({ recordingId: change.id });
                                if (byRecording) removed = await this.#attachmentsData.remove(byRecording._id);
                            }
                            this.activateWatch();
                            break;
                        }
                        default:
                            break;
                    }
                } catch (e) {
                    // On any error, fallback to refetch current inbox attachments
                    console.error("Exception fetching attachments:", e);
                }
            }
        );

        this.attachmentListening = true;
    }

    stopInteractionListening() {
        if (this.interactionSubscription) {
            this.interactionSubscription.stop();
            this.interactionListening = false;
        }
    }

    stopAttachmentListening() {
        if (this.attachmentSubscription) {
            this.attachmentSubscription.stop();
            this.attachmentListening = false;
        }
    }
}

export default new MessagingWatcher(Client);