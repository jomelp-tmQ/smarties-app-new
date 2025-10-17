import { TTSProvider } from "./template";
import { TTSManager } from "@tmq.paul/client-tts";
import { EventEmitter } from "events";

export class WebSpeechTTSProvider extends TTSProvider {
    #instance = null;
    #language = "en";
    #voice = null;
    #isReady = false;
    #onReadyCallbacks = () => { };
    #eventEmitter = new EventEmitter();
    #isSpeaking = false;

    constructor() {
        super();
    }

    /**
     * @returns {TTSManager}
     */
    get Instance() { return this.#instance; }
    get IsReady() { return this.#isReady; }
    get IsSpeaking() { return this.#isSpeaking; }

    // Event handling methods
    on(event, callback) {
        this.#eventEmitter.on(event, callback);
    }

    off(event, callback) {
        this.#eventEmitter.off(event, callback);
    }

    onSpeechStart(callback) {
        this.on('speechStart', callback);
    }

    onSpeechEnd(callback) {
        this.on('speechEnd', callback);
    }

    onSpeechPause(callback) {
        this.on('speechPause', callback);
    }

    onSpeechResume(callback) {
        this.on('speechResume', callback);
    }

    async initialize() {
        this.#instance = new TTSManager({ provider: "webspeech" });
        return this.Instance.initialize().then(() => {
            this.#isReady = true;
            this.#onReadyCallbacks();
            this.#setupSpeechEvents();
        });
    }

    #setupSpeechEvents = () => {
        // Check if we're in a browser environment with speechSynthesis
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            const originalSpeak = window.speechSynthesis.speak.bind(window.speechSynthesis);

            window.speechSynthesis.speak = (utterance) => {
                // Set up event listeners for this utterance
                utterance.onstart = () => {
                    this.#isSpeaking = true;
                    this.#eventEmitter.emit('speechStart', utterance);
                };

                utterance.onend = () => {
                    this.#isSpeaking = false;
                    this.#eventEmitter.emit('speechEnd', utterance);
                };

                utterance.onpause = () => {
                    this.#eventEmitter.emit('speechPause', utterance);
                };

                utterance.onresume = () => {
                    this.#eventEmitter.emit('speechResume', utterance);
                };

                utterance.onerror = (event) => {
                    this.#isSpeaking = false;
                    this.#eventEmitter.emit('speechError', event);
                };

                // Call the original speak method
                return originalSpeak(utterance);
            };
        }
    }

    onReady(callback) {
        if (typeof callback === "function")
            this.#onReadyCallbacks = callback;
    }

    speak(text) {
        if (this.Instance) {
            this.Instance.speak(text);
        }
    }

    setLanguage(language) {
        this.#language = language;
        return this.Instance.setLanguage(language);
    }
    setVoice(voice) {
        this.#voice = voice;
        return this.Instance.setVoiceByName(voice);
    }
    destroy() {
        if (this.Instance) {
            this.Instance.destroy();
        }
    }
    getLanguages() {
        return {
            ENGLISH: "en",
            SPANISH: "es",
            FRENCH: "fr",
            GERMAN: "de",
            ITALIAN: "it",
            PORTUGUESE: "pt",
            RUSSIAN: "ru",
        };
    }
    getVoices() {
        if (this.Instance) {
            const voices = this.Instance.getVoicesForLanguage(this.#language);
            if (voices.length) return voices;
        }
        if (speechSynthesis)
            return speechSynthesis.getVoices().filter(v => v.lang.startsWith(this.#language));
        return [];
    }
}