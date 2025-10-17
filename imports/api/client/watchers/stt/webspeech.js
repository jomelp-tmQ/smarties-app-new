import { STTProvider } from "./template.js";
import { EventEmitter } from "events";

export class WebSpeechSTTProvider extends STTProvider {
    #recognition = null;
    #language = "en-US";
    #isListening = false;
    #eventEmitter = new EventEmitter();
    #interimResults = true;
    #maxAlternatives = 1;
    #continuous = false;

    constructor(options = {}) {
        super();
        this.#interimResults = options.interimResults ?? true;
        this.#maxAlternatives = options.maxAlternatives ?? 1;
        this.#continuous = options.continuous ?? false;
        this.#language = options.language ?? "en-US";
    }

    /**
     * Initialize the Web Speech Recognition API
     * @returns {Promise<void>}
     */
    async initialize() {
        return new Promise((resolve, reject) => {
            // Check if the browser supports Web Speech API
            if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
                reject(new Error('Web Speech API is not supported in this browser'));
                return;
            }

            // Create speech recognition instance
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.#recognition = new SpeechRecognition();

            // Configure recognition settings
            this.#recognition.lang = this.#language;
            this.#recognition.interimResults = this.#interimResults;
            this.#recognition.maxAlternatives = this.#maxAlternatives;
            this.#recognition.continuous = true;

            // Set up event handlers
            this.#setupEventHandlers();

            resolve();
        });
    }

    /**
     * Start listening for speech
     * @returns {Promise<void>}
     */
    async startListening() {
        if (!this.#recognition) {
            throw new Error('Speech recognition not initialized. Call initialize() first.');
        }

        if (this.#isListening) {
            console.warn('Already listening');
            return;
        }

        try {
            this.#recognition.start();
            this.#isListening = true;
            this.#eventEmitter.emit('start');
        } catch (error) {
            this.#eventEmitter.emit('error', error);
            throw error;
        }
    }

    /**
     * Stop listening for speech
     */
    stopListening() {
        if (!this.#recognition || !this.#isListening) {
            return;
        }

        this.#recognition.stop();
        this.#isListening = false;
        this.#eventEmitter.emit('stop');
    }

    /**
     * Abort current recognition
     */
    abort() {
        if (!this.#recognition || !this.#isListening) {
            return;
        }

        this.#recognition.abort();
        this.#isListening = false;
        this.#eventEmitter.emit('abort');
    }

    /**
     * Set the recognition language
     * @param {string} language - Language code (e.g., 'en-US', 'es-ES')
     */
    setLanguage(language) {
        this.#language = language;
        if (this.#recognition) {
            this.#recognition.lang = language;
        }
    }

    /**
     * Get the current language
     * @returns {string}
     */
    getLanguage() {
        return this.#language;
    }

    /**
     * Set interim results preference
     * @param {boolean} enabled - Whether to enable interim results
     */
    setInterimResults(enabled) {
        this.#interimResults = enabled;
        if (this.#recognition) {
            this.#recognition.interimResults = enabled;
        }
    }

    /**
     * Set continuous listening mode
     * @param {boolean} enabled - Whether to enable continuous listening
     */
    setContinuous(enabled) {
        this.#continuous = enabled;
        if (this.#recognition) {
            this.#recognition.continuous = enabled;
        }
    }

    /**
     * Set maximum number of alternatives
     * @param {number} max - Maximum number of alternatives
     */
    setMaxAlternatives(max) {
        this.#maxAlternatives = max;
        if (this.#recognition) {
            this.#recognition.maxAlternatives = max;
        }
    }

    /**
     * Get supported languages
     * @returns {Object}
     */
    getLanguages() {
        return {
            ENGLISH_US: "en-US",
            ENGLISH_UK: "en-GB",
            SPANISH_ES: "es-ES",
            SPANISH_MX: "es-MX",
            FRENCH_FR: "fr-FR",
            GERMAN_DE: "de-DE",
            ITALIAN_IT: "it-IT",
            PORTUGUESE_BR: "pt-BR",
            PORTUGUESE_PT: "pt-PT",
            RUSSIAN_RU: "ru-RU",
            CHINESE_CN: "zh-CN",
            JAPANESE_JP: "ja-JP",
            KOREAN_KR: "ko-KR",
            ARABIC_SA: "ar-SA",
            HINDI_IN: "hi-IN",
            DUTCH_NL: "nl-NL",
            POLISH_PL: "pl-PL",
            SWEDISH_SE: "sv-SE",
            NORWEGIAN_NO: "no-NO",
            DANISH_DK: "da-DK",
            FINNISH_FI: "fi-FI"
        };
    }

    /**
     * Check if currently listening
     * @returns {boolean}
     */
    isListening() {
        return this.#isListening;
    }

    /**
     * Check if Web Speech API is supported
     * @returns {boolean}
     */
    static isSupported() {
        return ('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window);
    }

    /**
     * Event listeners
     */
    onResult(callback) {
        this.#eventEmitter.on('result', callback);
    }

    onInterimResult(callback) {
        this.#eventEmitter.on('interimResult', callback);
    }

    onFinalResult(callback) {
        this.#eventEmitter.on('finalResult', callback);
    }

    onError(callback) {
        this.#eventEmitter.on('error', callback);
    }

    onStart(callback) {
        this.#eventEmitter.on('start', callback);
    }

    onEnd(callback) {
        this.#eventEmitter.on('end', callback);
    }

    onStop(callback) {
        this.#eventEmitter.on('stop', callback);
    }

    onAbort(callback) {
        this.#eventEmitter.on('abort', callback);
    }

    onNoMatch(callback) {
        this.#eventEmitter.on('nomatch', callback);
    }

    onSoundStart(callback) {
        this.#eventEmitter.on('soundstart', callback);
    }

    onSoundEnd(callback) {
        this.#eventEmitter.on('soundend', callback);
    }

    onSpeechStart(callback) {
        this.#eventEmitter.on('speechstart', callback);
    }

    onSpeechEnd(callback) {
        this.#eventEmitter.on('speechend', callback);
    }

    /**
     * Remove event listeners
     */
    removeListener(event, callback) {
        this.#eventEmitter.removeListener(event, callback);
    }

    removeAllListeners(event = null) {
        if (event) {
            this.#eventEmitter.removeAllListeners(event);
        } else {
            this.#eventEmitter.removeAllListeners();
        }
    }

    /**
     * Clean up resources
     */
    destroy() {
        if (this.#isListening) {
            this.abort();
        }

        this.removeAllListeners();

        if (this.#recognition) {
            this.#recognition = null;
        }
    }

    /**
     * Set up event handlers for the speech recognition instance
     * @private
     */
    #setupEventHandlers = () => {
        // Result event - fires when speech is recognized
        this.#recognition.onresult = (event) => {
            const results = [];

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                const transcript = result[0].transcript;
                const confidence = result[0].confidence;

                const resultData = {
                    transcript,
                    confidence,
                    isFinal: result.isFinal,
                    alternatives: Array.from(result).map(alt => ({
                        transcript: alt.transcript,
                        confidence: alt.confidence
                    }))
                };

                results.push(resultData);

                // Emit specific events for interim and final results
                if (result.isFinal) {
                    this.#eventEmitter.emit('finalResult', resultData);
                } else {
                    this.#eventEmitter.emit('interimResult', resultData);
                }
            }

            this.#eventEmitter.emit('result', { results, event });
        };

        // Error event
        this.#recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.#eventEmitter.emit('error', {
                error: event.error,
                message: event.message || `Speech recognition error: ${event.error}`
            });
        };

        // Start event
        this.#recognition.onstart = () => {
            console.log('Speech recognition started');
            this.#isListening = true;
            this.#eventEmitter.emit('start');
        };

        // End event
        this.#recognition.onend = () => {
            console.log('Speech recognition ended');
            this.#isListening = false;
            this.#eventEmitter.emit('end');
        };

        // No match event
        this.#recognition.onnomatch = (event) => {
            console.log('No speech was recognized');
            this.#eventEmitter.emit('nomatch', event);
        };

        // Sound start event
        this.#recognition.onsoundstart = () => {
            this.#eventEmitter.emit('soundstart');
        };

        // Sound end event
        this.#recognition.onsoundend = () => {
            this.#eventEmitter.emit('soundend');
        };

        // Speech start event
        this.#recognition.onspeechstart = () => {
            this.#eventEmitter.emit('speechstart');
        };

        // Speech end event
        this.#recognition.onspeechend = () => {
            this.#eventEmitter.emit('speechend');
        };
    }
}
