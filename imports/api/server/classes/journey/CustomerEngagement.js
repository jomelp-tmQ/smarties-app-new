
import { CustomerEngagementClient } from '@customer-engagement/client';
import { Core } from "@tmq-dev-ph/tmq-dev-core-server";
import { logger as baseLogger } from "../../utils/serverUtils.js";
const logger = baseLogger.child({ service: 'classes/journey/CustomerEngagement.js' });

class CustomerEngagement {
    constructor(config) {
        this.config = config;
        this.client = new CustomerEngagementClient(config);
        this.db = Core.getDB("customerEngagement", true);
    }

    /**
     * Set the API key for the client
     * @param {string} apiKey - JWT token or API key
     */
    setApiKey(apiKey) {
        this.client.setApiKey(apiKey);
    }

    /**
     * Get the axios instance from the client
     * @returns {Object} Axios instance
     */
    getAxiosInstance() {
        return this.client.getAxiosInstance();
    }

    /**
     * Get webhook health status
     * @returns {Object} Webhook health information
     */
    async getWebhookHealth() {
        try {
            const response = await this.client.webhooks.getWebhookHealth();

            if (response.data) {
                return {
                    status: "success",
                    health: response.data
                };
            } else {
                throw new Error('Failed to get webhook health via client');
            }
        } catch (error) {
            logger.error('getWebhookHealth error', { error: error?.message || error });
            throw new Error(`Failed to get webhook health: ${error.message}`);
        }
    }

    /**
     * Process a webhook event
     * @param {Object} webhookEvent - Webhook event data
     * @param {string} webhookEvent.account_id - Account ID (required)
     * @param {string} webhookEvent.type - Event type (required)
     * @param {string} webhookEvent.source - Event source (required)
     * @param {string} webhookEvent.customer_id - Customer ID (optional, alternative to social)
     * @param {Object} webhookEvent.social - Social media information (optional, alternative to customer_id)
     * @param {Object} webhookEvent.social.platform - Social platform (instagram, whatsapp, email, web, internal_bot, other)
     * @param {string} webhookEvent.social.handle - User handle or identifier
     * @param {string} webhookEvent.social.identifier - Additional identifier
     * @param {Object} webhookEvent.data - Event-specific data and metadata
     * @param {string} webhookEvent.data.content - Event content
     * @param {string} webhookEvent.data.author - Event author
     * @param {string} webhookEvent.data.postId - Post ID for social media events
     * @param {string} webhookEvent.data.commentId - Comment ID for comment events
     * @param {string} webhookEvent.data.likeId - Like ID for like events
     * @param {Object} webhookEvent.data.metadata - Additional event metadata
     * @param {Array} webhookEvent.tags - Event tags for categorization
     * @param {number} webhookEvent.priority - Event priority (0.0 to 1.0, defaults to 0.5)
     * @param {Object} webhookEvent.metadata - Additional webhook metadata
     * @param {string} webhookEvent.intent - Customer intent or purpose
     * @param {boolean} webhookEvent.generate_response - Whether to generate AI response
     * @returns {Object} Processing result
     */
    async processWebhook(webhookEvent) {
        if (!webhookEvent.account_id || !webhookEvent.type || !webhookEvent.source) {
            throw new Error('Account ID, type, and source are required');
        }

        // Validate that either customer_id or social is provided
        if (!webhookEvent.customer_id && !webhookEvent.social) {
            throw new Error('Either customer_id or social information must be provided');
        }

        try {
            const response = await this.client.webhooks.processWebhook(webhookEvent);

            if (response.success && response.event) {
                const data = new TextDecoder().decode(webhookEvent.data);
                const metadata = new TextDecoder().decode(webhookEvent.metadata)
                // Store webhook event in local database
                const now = new Date().valueOf();
                const webhookRecord = {
                    webhookId: response.event._id || response.event.id,
                    accountId: webhookEvent.account_id,
                    customerId: webhookEvent.customer_id || null,
                    type: webhookEvent.type,
                    source: webhookEvent.source,
                    social: webhookEvent.social || null,
                    data: data || null,
                    tags: webhookEvent.tags || [],
                    priority: webhookEvent.priority || 0.5,
                    intent: webhookEvent.intent || null,
                    generateResponse: webhookEvent.generate_response || false,
                    status: 'processed',
                    processedAt: now,
                    createdAt: now,
                    metadata: metadata || {}
                };

                await this.db.insertOne(webhookRecord);

                return {
                    status: "success",
                    webhook: {
                        id: webhookRecord._id,
                        webhookId: response.event._id || response.event.id,
                        accountId: webhookEvent.account_id,
                        customerId: webhookEvent.customer_id || null,
                        type: webhookEvent.type,
                        source: webhookEvent.source,
                        social: webhookEvent.social || null,
                        data: null,
                        tags: webhookEvent.tags || [],
                        priority: webhookEvent.priority || 0.5,
                        intent: webhookEvent.intent || null,
                        generateResponse: webhookEvent.generate_response || false,
                        status: 'processed',
                        processedAt: webhookRecord.processedAt,
                        success: response.success
                    },
                    processing: response.processing || null,
                    customer: response.customer || null,
                    message: response.message || 'Webhook processed successfully'
                };
            } else {
                throw new Error('Failed to process webhook via client');
            }
        } catch (error) {
            logger.error('processWebhook error', { error: error?.message || error });
            throw new Error(`Failed to process webhook: ${error.message}`);
        }
    }

    /**
     * Process a comment webhook using convenience method
     * @param {string} accountId - Account ID
     * @param {string} content - Comment content
     * @param {string} platform - Social platform
     * @param {string} handle - User handle or identifier
     * @param {Array} tags - Event tags
     * @param {number} priority - Event priority
     * @returns {Object} Processing result
     */
    async processComment(accountId, content, platform, handle, tags = [], priority = 0.5) {
        if (!accountId || !content || !platform || !handle) {
            throw new Error('Account ID, content, platform, and handle are required');
        }

        try {
            const response = await this.client.webhooks.processComment(
                accountId,
                content,
                platform,
                handle,
                tags,
                priority
            );

            if (response.data) {
                // Store comment event in local database
                const now = new Date().valueOf();
                const commentRecord = {
                    _id: Core.generateId(),
                    webhookId: response.data._id || response.data.id,
                    accountId: accountId,
                    type: 'comment',
                    source: platform,
                    social: {
                        platform: platform,
                        handle: handle
                    },
                    data: {
                        content: content
                    },
                    tags: tags,
                    priority: priority,
                    status: response.data.status || 'processed',
                    processedAt: now,
                    createdAt: now
                };

                await this.db.insertOne(commentRecord);

                return {
                    status: "success",
                    comment: {
                        id: commentRecord._id,
                        webhookId: response.data._id || response.data.id,
                        accountId: accountId,
                        content: content,
                        platform: platform,
                        handle: handle,
                        status: response.data.status || 'processed',
                        success: response.data.success || true
                    }
                };
            } else {
                throw new Error('Failed to process comment via client');
            }
        } catch (error) {
            logger.error('processComment error', { error: error?.message || error });
            throw new Error(`Failed to process comment: ${error.message}`);
        }
    }

    /**
     * Process a like webhook using convenience method
     * @param {string} accountId - Account ID
     * @param {string} platform - Social platform
     * @param {string} identifier - User identifier (email, phone, etc.)
     * @param {Array} tags - Event tags
     * @param {number} priority - Event priority
     * @returns {Object} Processing result
     */
    async processLike(accountId, platform, identifier, tags = [], priority = 0.5) {
        if (!accountId || !platform || !identifier) {
            throw new Error('Account ID, platform, and identifier are required');
        }

        try {
            const response = await this.client.webhooks.processLike(
                accountId,
                platform,
                identifier,
                tags,
                priority
            );

            if (response.data) {
                // Store like event in local database
                const now = new Date().valueOf();
                const likeRecord = {
                    _id: Core.generateId(),
                    webhookId: response.data._id || response.data.id,
                    accountId: accountId,
                    type: 'like',
                    source: platform,
                    social: {
                        platform: platform,
                        identifier: identifier
                    },
                    tags: tags,
                    priority: priority,
                    status: response.data.status || 'processed',
                    processedAt: now,
                    createdAt: now
                };

                await this.db.insertOne(likeRecord);

                return {
                    status: "success",
                    like: {
                        id: likeRecord._id,
                        webhookId: response.data._id || response.data.id,
                        accountId: accountId,
                        platform: platform,
                        identifier: identifier,
                        status: response.data.status || 'processed',
                        success: response.data.success || true
                    }
                };
            } else {
                throw new Error('Failed to process like via client');
            }
        } catch (error) {
            logger.error('processLike error', { error: error?.message || error });
            throw new Error(`Failed to process like: ${error.message}`);
        }
    }

    /**
     * Process webhook with validation
     * @param {Object} webhookEvent - Webhook event data
     * @returns {Object} Processing result
     */
    async processWebhookWithValidation(webhookEvent) {
        if (!webhookEvent.account_id || !webhookEvent.type || !webhookEvent.source) {
            throw new Error('Account ID, type, and source are required for webhook validation');
        }

        try {
            const response = await this.client.webhooks.processWebhookWithValidation(webhookEvent);

            if (response.data) {
                return {
                    status: "success",
                    webhook: response.data
                };
            } else {
                throw new Error('Failed to process webhook with validation via client');
            }
        } catch (error) {
            logger.error('processWebhookWithValidation error', { error: error?.message || error });
            throw new Error(`Failed to process webhook with validation: ${error.message}`);
        }
    }

    // ===== WEBHOOK RESPONSE GENERATION METHODS =====

    /**
     * Generate response using webhooks
     * @param {string} accountId - Account ID
     * @param {string} customerId - Customer ID
     * @returns {Object} Generated response with analysis data
     */
    async generateResponse(accountId, customerId) {
        if (!accountId || !customerId) {
            throw new Error('Account ID and Customer ID are required');
        }

        try {
            const generatedResponse = await this.client.webhooks.generateResponse(accountId, customerId);
            logger.debug('generateResponse result', { ok: generatedResponse?.success });
            if (generatedResponse.success) {
                // success path

                // Validate response structure
                if (generatedResponse.response) {
                    // details omitted in logs to reduce noise
                }

                // Validate analysis data
                if (generatedResponse.analysis) {
                    // analysis summary
                }

                return {
                    status: "success",
                    success: generatedResponse.success,
                    response: generatedResponse.response,
                    analysis: generatedResponse.analysis
                };
            } else {
                throw new Error(generatedResponse.error || 'Failed to generate response');
            }
        } catch (error) {
            logger.error('generateResponse error', { error: error?.message || error });
            throw new Error(`Failed to generate response: ${error.message}`);
        }
    }

    // ===== CUSTOMER ENGAGEMENT METHODS =====

    async createCustomCustomerEvent(customerId, eventData) {
        if (!customerId || !eventData) {
            throw new Error('Customer ID and event data are required');
        }

        try {
            const response = await this.client.customerEvents.createManualCustomerContextEvent(
                customerId,
                eventData.type,
                eventData.source,
                eventData.data,
                eventData.tags,
                eventData.intent,
                eventData.priority
            );

            console.log(response);

            return {
                status: "success",
            };
        } catch (error) {
            logger.error('createCustomCustomerEvent error', { error: error?.message || error });
            throw new Error(`Failed to create custom customer event: ${error.message}`);
        }
    }
}

export default CustomerEngagement;