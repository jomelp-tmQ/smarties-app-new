// Lightweight CallBot wrapper focused only on LiveKit, inspired by references/frontend/CallBot.js
// Replace STATIC placeholders below with real values.
import LiveKitVoiceClient from '@tmq.paul/pipecat-livekit-sdk';



export class CallBot {
    constructor() {
        this._client = null;
        this._listeners = new Map();
        this._audioElements = new Map();
        this._currentOutputDeviceId = null;
        this._audioUnblockRegistered = false;
        this._serverUrl = null;
    }

    configure({ serverUrl } = {}) {
        if (serverUrl && typeof serverUrl === 'string') {
            this._serverUrl = serverUrl;
        }
    }

    async init() {
        if (this._client) return;
        this._client = new LiveKitVoiceClient({ serverUrl: this._serverUrl });
        this._wireEvents();
    }

    on(event, handler) {
        if (!this._listeners.has(event)) this._listeners.set(event, new Set());
        this._listeners.get(event).add(handler);
        return () => this.off(event, handler);
    }

    off(event, handler) {
        const set = this._listeners.get(event);
        if (set) set.delete(handler);
    }

    _emit(event, payload) {
        const set = this._listeners.get(event);
        if (!set) return;
        set.forEach((fn) => {
            try { fn(payload); } catch (_e) { /* noop */ }
        });
    }

    _wireEvents() {
        const c = this._client;
        if (!c || !c.on) return;
        c.on('connected', (data) => this._emit('connected', data));
        c.on('disconnected', () => this._emit('disconnected'));
        c.on('status', (s) => this._emit('status', s));
        c.on('participantsUpdated', (list) => this._emit('participantsUpdated', list));
        c.on('assistantTranscription', (d) => this._emit('assistantTranscription', d));
        c.on('userTranscription', (d) => this._emit('userTranscription', d));
        c.on('botSpeakingState', (s) => this._emit('botSpeakingState', s));
        c.on('error', (e) => this._emit('error', e));

        // Attach remote audio
        c.on('audioTrackSubscribed', (track) => {
            try {
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
                if (this._audioElements.has(trackId)) return;

                let container = globalThis.document && document.getElementById('livekit-audio-container');
                if (!container && globalThis.document) {
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

                const audio = globalThis.document ? document.createElement('audio') : null;
                if (!audio) return;
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

                if (this._currentOutputDeviceId && typeof audio.setSinkId === 'function') {
                    audio.setSinkId(this._currentOutputDeviceId).catch(() => { });
                }

                container && container.appendChild(audio);

                const playPromise = audio.play();
                if (playPromise && typeof playPromise.catch === 'function') {
                    playPromise.catch((_err) => {
                        if (!this._audioUnblockRegistered && globalThis.document) {
                            this._audioUnblockRegistered = true;
                            const resumeAll = () => {
                                this._audioElements.forEach((a) => {
                                    try { a.muted = false; } catch (_e) { }
                                    const p = a.play();
                                    if (p && typeof p.catch === 'function') { p.catch(() => { }); }
                                });
                                document.removeEventListener('click', resumeAll);
                                document.removeEventListener('touchstart', resumeAll);
                                this._audioUnblockRegistered = false;
                            };
                            document.addEventListener('click', resumeAll, { once: true, passive: true });
                            document.addEventListener('touchstart', resumeAll, { once: true, passive: true });
                        }
                    });
                }

                this._audioElements.set(trackId, audio);
            } catch (e) {
                this._emit('error', e);
            }
        });

        c.on('audioTrackUnsubscribed', (track) => {
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
                const audio = this._audioElements.get(trackId);
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
                    this._audioElements.delete(trackId);
                }
            } catch (e) {
                this._emit('error', e);
            }
        });
    }

    async startCall(options = {}) {
        await this.init();
        // options.hook can be passed when you have one; using empty for now to match current UI
        return this._client.createAndJoin(options);
    }

    async stopCall() {
        if (!this._client) return;
        return this._client.endCall();
    }
}

export default new CallBot();


