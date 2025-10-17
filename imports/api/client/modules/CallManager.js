import VapiCallClient from "@tmq-justin/vapi-call-client";

/**
 * VapiCallManager - Manages Vapi calls with AI assistants
 * 
 * This class provides a wrapper around the Vapi API to handle authentication,
 * call management, event handling, and device configuration for voice calls
 * with AI assistants.
 * 
 * @class
 */
class CallManager {
    #isSpeaking = false;

    /**
     * Creates a new VapiCallManager instance
     * @param {Object} config - Configuration options
     * @param {string} [config.serverUrl="http://localhost:3050"] - Base server URL for API endpoints
     * @param {string|null} [config.token=null] - Optional initial JWT token
     * @param {Object} [config.authConfig] - Authentication configuration
     * @param {string} [config.authConfig.apiKey="abc123"] - API key for authentication
     */
    constructor(config = {}) {
        this.vapiCallClient = new VapiCallClient({
            serverUrl: config.serverUrl,
            token: config.token,
            authConfig: {
                apiKey: config.apiKey
            },
            ...config
        });
        this.onSpeechStart(() => {
            this.#isSpeaking = true;
        });
        this.onSpeechEnd(() => {
            this.#isSpeaking = false;
        });
    }

    /**
     * Gets the current speaking state
     * @returns {boolean} True if currently speaking, false otherwise
     */
    get isSpeaking() {
        return this.#isSpeaking;
    }

    /**
     * Gets the current mute state of the microphone
     * @returns {boolean} True if microphone is muted, false otherwise
     */
    get isMuted() {
        return this.vapiCallClient.isMuted;
    }

    /**
     * Get the current call status synchronously
     * @returns {string} Current call status
     */
    get CallStatus() {
        return this.vapiCallClient.getCallStatusSync();
    }

    /**
     * Register a handler for call start events
     * @param {Function} handler - Function to call when call starts
     */
    onCallStart(handler) {
        this.vapiCallClient.on("call-start", handler);
    }

    /**
     * Register a handler for call end events
     * @param {Function} handler - Function to call when call ends
     */
    onCallEnd(handler) {
        this.vapiCallClient.on("call-end", handler);
    }

    /**
     * Register a handler for speech start events
     * @param {Function} handler - Function to call when speech starts
     */
    onSpeechStart(handler) {
        this.vapiCallClient.on("speech-start", handler);
    }

    /**
     * Register a handler for speech end events
     * @param {Function} handler - Function to call when speech ends
     */
    onSpeechEnd(handler) {
        this.vapiCallClient.on("speech-end", handler);
    }

    /**
     * Register a handler for volume level events
     * @param {Function} handler - Function to call when volume level changes
     */
    onVolumeLevel(handler) {
        this.vapiCallClient.on("volume-level", handler);
    }

    /**
     * Register a handler for message events
     * @param {Function} handler - Function to call when messages are received
     */
    onMessage(handler) {
        this.vapiCallClient.on("message", handler);
    }

    /**
     * Register a handler for error events
     * @param {Function} handler - Function to call when errors occur
     */
    onError(handler) {
        this.vapiCallClient.on("error", handler);
    }

    /**
     * Register a handler for call status changes
     * @param {Function} handler - Function to call when call status changes
     */
    onCallStatusChange(handler) {
        this.vapiCallClient.onCallStatusChange(handler);
    }

    /**
     * Start a Vapi call with the specified assistant
     * @param {string} assistantId - ID of the assistant to call
     * @param {Object} [assistantOverrides={}] - Configuration overrides for the call
     * @returns {Promise<Object>} Call configuration object
     * @throws {Error} If unable to start call
     */
    async startCall(assistantId, assistantOverrides = {}) {
        try {
            const callConfig = await this.vapiCallClient.startCall(assistantId, assistantOverrides);
            this.#isSpeaking = false;

            return callConfig;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Stop the current call
     * @returns {Promise<void>}
     * @throws {Error} If unable to stop call
     */
    async stopCall() {
        try {
            await this.vapiCallClient.stopCall();
            this.#isSpeaking = false;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Switches to specific local audio or video devices
     * @param {Object} options - Input device configuration
     * @param {string|boolean|null} [options.audioDeviceId] - ID of audio input device, or false/null to disable
     * @param {string|boolean|null} [options.videoDeviceId] - ID of video input device, or false/null to disable
     * @param {boolean|MediaStreamTrack} [options.audioSource] - Audio source track or false to disable
     * @param {boolean|MediaStreamTrack} [options.videoSource] - Video source track or false to disable
     */
    setInputDevicesAsync(options) {
        this.vapiCallClient.setInputDevicesAsync(options);
    }

    /**
     * Switches to a specific audio output device
     * @param {Object} options - Output device configuration
     * @param {string} options.outputDeviceId - ID of the audio output device
     */
    setOutputDeviceAsync(options) {
        this.vapiCallClient.setOutputDeviceAsync(options);
    }

    /**
     * Get the current call status from the server
     * @returns {Promise<Object>} Call status from the server
     */
    async getStatusAsync() {
        const status = await this.vapiCallClient.getCallStatus();
        return status;
    }

    /**
     * Sets the mute state of the microphone
     * @param {boolean} muted - Whether to mute or unmute
     */
    setMuted(muted) {
        this.vapiCallClient.setMuted(muted);
    }

    /**
     * Cleans up the VapiCallManager instance
     */
    cleanup() {
        if (this.CallStatus === "active" || this.CallStatus === "starting") {
            this.stopCall();
        }
    }
}

export default CallManager;