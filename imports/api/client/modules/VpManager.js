import VpManagerClient from '@tmq-justin/vp-manager-client'; //#[x] @justin rename vapi to vp-manager-client
import Client from "../Client";

/**
 * VpManager - A class to manage Vp voice assistant interactions
 * Handles initialization, assistant management, and API interactions
 */
class VpManager { //#[x]: @szyrelle Rename VapiManager to VpManager
    /**
     * Creates a new instance of VpManager
     * @param {Object} config - Configuration object
     * @param {string} config.serverUrl - The URL of the Vp server
     * @param {string} config.apiKey - API key for authentication
     * @param {Object} config.authConfig - Authentication configuration
     * @param {string} config.authConfig.apiKey - JWT secret key
     * @param {string} config.authConfig.refreshEndpoint - Endpoint for token refresh
     */
    constructor(config = {}) {
        // #[x]: @szyrelle Rename all vapi names to vp
        this.VpManager = new VpManagerClient({
            serverUrl: config.serverUrl,
            apiKey: config.apiKey,
            authConfig: {
                apiKey: config.apiKey,
                refreshEndpoint: config.refreshEndpoint,
                withCredentials: false,
            },
        });
    }

    /**
     * Creates a new assistant
     * @param {Object} assistant - Assistant configuration
     * @param {string} assistant.name - Name of the assistant (max 40 characters)
     * @param {string} [assistant.description] - Description of the assistant
     * @param {Object} [assistant.voice] - Voice configuration
     * @param {string} [assistant.voice.provider] - Voice provider ('vapi', '11labs', 'deepgram')
     * @param {string} [assistant.voice.voiceId] - Voice ID (e.g., 'Elliot', 'Rachel')
     * @param {Object} [assistant.model] - Model configuration
     * @param {string} [assistant.model.provider] - Model provider ('openai', 'google', 'vapi')
     * @param {string} [assistant.model.model] - Model ID (e.g., 'gpt-3.5-turbo', 'gpt-4')
     * @returns {Promise<Object>} Created assistant object
     */
    async createAssistant(assistant) {
        return this.VpManager.createAssistant(assistant);
    }

    /**
     * Gets an assistant by ID
     * @param {string} assistantId - The ID of the assistant to retrieve
     * @returns {Promise<Object>} Assistant object
     */
    async getAssistant(assistantId) {
        return this.VpManager.getAssistant(assistantId);
    }

    /**
     * Updates an existing assistant
     * @param {string} assistantId - The ID of the assistant to update
     * @param {Object} options - Update options
     * @param {string} [options.name] - New name for the assistant
     * @param {string} [options.description] - New description
     * @param {Object} [options.voice] - New voice configuration
     * @param {Object} [options.model] - New model configuration
     * @returns {Promise<Object>} Updated assistant object
     */
    async updateAssistant(assistantId, options = {}) {
        return this.VpManager.updateAssistant(assistantId, options);
    }

    /**
     * Deletes an assistant
     * @param {string} assistantId - The ID of the assistant to delete
     * @returns {Promise<Object>} Deletion result
     */
    async deleteAssistant(assistantId) {
        return this.VpManager.deleteAssistant(assistantId);
    }

    /**
     * Creates a new knowledge base
     * @param {Object} data - Knowledge base configuration
     * @param {string} data.trieveDatasetId - Dataset ID for the knowledge base
     * @param {string} [data.provider] - Provider for the knowledge base
     * @param {string} [data.name] - Name of the knowledge base
     * @returns {Promise<Object>} Created knowledge base object
     */
    async createKnowledgeBase(data) {
        return this.VpManager.createKnowledgeBase(data);
    }

    /**
     * Updates an existing knowledge base
     * @param {string} knowledgeBaseId - The ID of the knowledge base to update
     * @param {Object} options - Update options
     * @returns {Promise<Object>} Updated knowledge base object
     */
    async updateKnowledgeBase(knowledgeBaseId, options = {}) {
        return this.VpManager.updateKnowledgeBase(knowledgeBaseId, options);
    }

    /**
     * Adds a custom knowledge base
     * @param {Object} data - Custom knowledge base configuration
     * @param {string} data.url - URL of the custom knowledge base
     * @param {number} [data.timeoutSeconds] - Timeout in seconds
     * @param {string} [data.secret] - Secret key for authentication
     * @param {Object} [data.headers] - Custom headers
     * @returns {Promise<Object>} Created custom knowledge base object
     */
    async addCustomKnowledgeBase(data) {
        return this.VpManager.addCustomKnowledgeBase(data);
    }

    /**
     * Adds a phone number
     * @param {Object} data - Phone number configuration
     * @param {string} data.phoneNumber - The phone number to add
     * @param {string} [data.type] - Type of phone number (e.g. twilio)
     * @param {Object} [data.credentials] - Credentials for the phone number
     * @param {string} [data.credentials.twilioAccountSid] - Twilio account SID
     * @param {string} [data.credentials.twilioAuthToken] - Twilio auth token
     * @param {string} [data.name] - Name for the phone number
     * @returns {Promise<Object>} Added phone number object
     */
    async addPhoneNumber(data) {
        this.VpManager.addPhoneNumber(data);
    }

    /**
     * Updates a phone number
     * @param {string} phoneNumberId - The ID of the phone number to update
     * @param {Object} options - Update options
     * @returns {Promise<Object>} Updated phone number object
     */
    async updatePhoneNumber(phoneNumberId, options = {}) {
        return this.VpManager.updatePhoneNumber(phoneNumberId, options);
    }

    /**
     * Assigns an assistant to a phone number
     * @param {string} phoneNumberId - The ID of the phone number
     * @param {string} assistantId - The ID of the assistant to assign
     * @returns {Promise<Object>} Assignment result
     */
    async assignAssistantToPhoneNumber(phoneNumberId, assistantId) {
        return this.VpManager.assignAssistantToPhoneNumber(phoneNumberId, assistantId);
    }
}

export default VpManager; 