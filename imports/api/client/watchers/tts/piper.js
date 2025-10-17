import { TTSProvider } from "./template";
import { TTSManager } from "@tmq.paul/client-tts";

export class PiperTTSProvider extends TTSProvider {
    #instance = null;
    #language = "en";
    #voice = null;
    #commonLanguages = ["en_US", "es_ES", "fr_FR", "de_DE", "it_IT", "pt_PT", "ru_RU", "hi_IN"];
    #isReady = false;
    #onReadyCallbacks = () => { };
    constructor() {
        super();
    }
    /**
     * @returns {TTSManager}
     */
    get Instance() { return this.#instance; }
    get IsReady() { return this.#isReady; }
    async initialize() {
        this.#instance = new TTSManager({ provider: "piper" });
        return this.Instance.initialize().then((res) => {
            this.Instance.synthesizer.preloadCommonLanguages(this.#commonLanguages);
            this.Instance.synthesizer.preloader._preloadOneVoicePerLanguage().then(() => {
                this.#isReady = true;
                this.#onReadyCallbacks();
            });
            return res;
        });
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
        return this.Instance.setVoiceByKey(voice);
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
            return this.Instance.getVoicesForLanguage(this.#language);
        }
        return [];
    }
    getStats() {
        return this.Instance.synthesizer.getPreloadStats();
    }
}