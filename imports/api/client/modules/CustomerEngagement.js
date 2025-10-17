import customerEngagement from '../../common/static_codegen/tmq/CustomerEngagement_pb';

/**
 * Client-side CustomerEngagement class that interfaces with CustomerEngagementService
 * Uses hex values internally as defined in references.const
 * Handles protobuf serialization/deserialization
 */
class CustomerEngagementClient {
    constructor(callFunction) {
        if (typeof callFunction !== 'function') {
            throw new Error('callFunction must be a function');
        }
        this.callFunction = callFunction;
    }

    // ===== WEBHOOK PROCESSING METHODS =====

    /**
     * Process webhook data
     * @param {Object} webhookData - Webhook data
     * @param {string} webhookData.accountId - Account ID (required)
     * @param {string} webhookData.type - Event type (required)
     * @param {string} webhookData.source - Event source (required)
     * @param {string} webhookData.customerId - Customer ID (optional, alternative to social)
     * @param {Object} webhookData.social - Social media information (optional, alternative to customerId)
     * @param {Object} webhookData.social.platform - Social platform
     * @param {string} webhookData.social.handle - User handle or identifier
     * @param {string} webhookData.social.identifier - Additional identifier
     * @param {Object} webhookData.data - Event-specific data and metadata
     * @param {Array} webhookData.tags - Event tags for categorization
     * @param {number} webhookData.priority - Event priority (0.0 to 1.0, defaults to 0.5)
     * @param {Object} webhookData.metadata - Additional webhook metadata
     * @param {string} webhookData.intent - Customer intent or purpose
     * @param {boolean} webhookData.generateResponse - Whether to generate AI response
     * @returns {Promise<Object>} Processing result
     */
    async processWebhook(webhookData) {
        // Create protobuf request
        const request = new customerEngagement.WebhookEventRequest();
        const social = webhookData.social ? new customerEngagement.SocialMediaInfo() : undefined;

        // Set the main request fields
        request.setAccountId(webhookData.accountId);
        request.setCustomerId(webhookData.customerId || '');
        request.setType(webhookData.type);
        request.setSource(webhookData.source);
        request.setData(webhookData.data ? new Uint8Array(Object.values(JSON.stringify(webhookData.data))) : undefined);
        request.setTagsList(webhookData.tags || []);
        request.setPriority(webhookData.priority || 0.5);
        request.setIntent(webhookData.intent || '');
        request.setGenerateResponse(webhookData.generateResponse || false);
        request.setMetadata(webhookData.metadata ? new Uint8Array(Object.values(JSON.stringify(webhookData.metadata))) : undefined);

        // Set social media info if provided
        if (social) {
            social.setPlatform(webhookData.social.platform);
            social.setHandle(webhookData.social.handle);
            social.setIdentifier(webhookData.social.identifier);
            request.setSocial(social);
        }

        // Send request
        const response = await this.callFunction(0xd04e7a73, request);

        // Deserialize response
        if (response && response.result) {
            const webhookResponse = customerEngagement.WebhookEventResponse.deserializeBinary(response.result);

            const processing = webhookResponse.getProcessing();
            const customer = webhookResponse.getCustomer();

            const processingData = new TextDecoder().decode(processing);
            const customerData = new TextDecoder().decode(customer);

            const processingObj = JSON.parse(processingData);
            const customerObj = customerData ? JSON.parse(customerData) : null;

            return {
                success: webhookResponse.getSuccess(),
                id: webhookResponse.getId(),
                webhookId: webhookResponse.getWebhookid(),
                accountId: webhookResponse.getAccountid(),
                customerId: webhookResponse.getCustomerid(),
                intent: webhookResponse.getIntent(),
                status: webhookResponse.getStatus(),
                processedAt: webhookResponse.getProcessedat(),
                createdAt: webhookResponse.getCreatedat(),
                message: webhookResponse.getMessage(),
                processing: processingObj,
                customer: customerObj
            };
        }

        return response;
    }

    // ===== CUSTOMER MANAGEMENT METHODS =====

    /**
     * Get customer information
     * @param {Object} customerData - Customer data
     * @param {string} customerData.customerId - Customer ID
     * @param {string} customerData.userId - User ID
     * @returns {Promise<Object>} Customer information
     */
    async getCustomer(customerData) {
        // For customer methods, we might not have protobuf classes
        // Pass the data directly
        const response = await this.callFunction(0x6967a01c, customerData);
        return response;
    }

    /**
     * Add a customer
     * @param {Object} customerData - Customer data
     * @param {string} customerData.accountId - Account ID
     * @param {string} customerData.customerId - Customer ID
     * @returns {Promise<Object>} Customer information
     */
    async addCustomer({ accountId, customerId }) {
        const request = new customerEngagement.AddCustomerRequest();
        request.setAccountid(accountId);
        request.setCustomerid(customerId);

        const response = await this.callFunction(0x9e42790f, request);

        return response;
    }

    // ===== CUSTOMER ENGAGEMENT METHODS =====

    /**
     * Generate response using webhooks
     * @param {string} accountId - Account ID
     * @param {string} customerId - Customer ID
     * @returns {Promise<Object>} Generated response with analysis data
     */
    async generateResponse({ accountId, customerId }) {
        // For webhook methods, we might not have protobuf classes
        // Pass the data directly
        const request = new customerEngagement.GenerateResponseRequest();
        request.setAccountid(accountId);
        request.setCustomerid(customerId);

        const response = await this.callFunction(0x9e42790f, request);

        if (response && response.result) {
            const generateResponseResponse = customerEngagement.GenerateResponseResponse.deserializeBinary(response.result);
            const responseData = generateResponseResponse.getResponse();
            const analysisData = generateResponseResponse.getAnalysis();
            const stringData = new TextDecoder().decode(responseData);
            const objData = JSON.parse(stringData);
            const stringData2 = new TextDecoder().decode(analysisData);
            const objData2 = JSON.parse(stringData2);
            return {
                success: generateResponseResponse.getSuccess(),
                message: generateResponseResponse.getMessage(),
                response: objData,
                analysis: objData2
            };
        }

        return response;
    }
}

export default CustomerEngagementClient;
