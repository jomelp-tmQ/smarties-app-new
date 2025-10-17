import { Adapter, Core, Logger } from "@tmq-dev-ph/tmq-dev-core-server";
import { status } from "@grpc/grpc-js";
import CustomerEngagement from "../classes/journey/CustomerEngagement";
import { Customer } from "../classes/dbTemplates/Customer";
import { tmq as customerEngagement } from "../../common/static_codegen/tmq/CustomerEngagement";

export default {
    // getCustomer: async function ({ request }, callback) {
    //     try {
    //         const { ServerInstance } = Adapter;
    //         if (!ServerInstance) {
    //             return callback({
    //                 code: 500,
    //                 message: "Server instance not initialized!",
    //                 status: status.INTERNAL
    //             });
    //         }

    //         const { customerId } = request;

    //         // find the customer in the database
    //         const customer = await Customer.findByCustomerId(customerId);

    //         if (!customer) {
    //             return callback({
    //                 code: 404,
    //                 message: "Customer not found",
    //                 status: status.NOT_FOUND
    //             });
    //         }

    //         // get the latest customer information from the database
    //         const customerEngagement = new CustomerEngagement(ServerInstance.config);
    //         const result = await customerEngagement.getCustomer(customerId);
    //         const customerInfo = customer.toObjectLowerCase();

    //         if (!customerInfo) {
    //             return callback({
    //                 code: 404,
    //                 message: "Customer not found",
    //                 status: status.NOT_FOUND
    //             });
    //         }

    //         // merge the customer information with the latest customer information
    //         const mergedCustomer = new Customer({ ...customer, ...result });

    //         // save the merged customer information to the database
    //         await mergedCustomer.save();


    //         callback(null, {
    //             success: true,
    //             data: result,
    //             message: "Customer retrieved successfully"
    //         });
    //     } catch (error) {
    //         Logger.error("Error getting customer:", error);
    //         callback({
    //             code: 500,
    //             message: error.message || "Error getting customer",
    //             status: status.INTERNAL
    //         });
    //     }
    // },

    /**
     * Process webhook event
     * @param {Object} call
     * @param {customerEngagement.WebhookEventRequest} call.request - Webhook event request
     * @param {function} callback 
     */
    processWebhook: async function ({ request }, callback) {
        const response = new customerEngagement.WebhookEventResponse();
        try {
            const { ServerInstance } = Adapter;
            if (!ServerInstance) {
                return callback({
                    code: 500,
                    message: "Server instance not initialized!",
                    status: status.INTERNAL
                });
            }

            // Validate required fields
            if (!request.account_id || !request.type || !request.source) {
                return callback({
                    code: 400,
                    message: "Account ID, type, and source are required",
                    status: status.INVALID_ARGUMENT
                });
            }

            // Validate that either customer_id or social is provided
            if (!request.customer_id && !request.social) {
                return callback({
                    code: 400,
                    message: "Either customer_id or social information must be provided",
                    status: status.INVALID_ARGUMENT
                });
            }

            const config = {
                baseURL: "http://localhost:3004",
                timeout: 30000,
                ...ServerInstance.Config.customerEngagement
            };

            // Initialize CustomerEngagement class
            const customerEng = new CustomerEngagement(config);
            
            // Convert proto request to expected format
            const webhookEvent = {
                account_id: request.account_id,
                customer_id: request.customer_id || null,
                type: request.type,
                source: request.source,
                social: request.social ? {
                    platform: request.social.platform,
                    handle: request.social.handle,
                    identifier: request.social.identifier
                } : null,
                data: request.data ? request.data : null,
                tags: request.tags || [],
                priority: request.priority || 0.5,
                intent: request.intent || null,
                generate_response: request.generate_response || false,
                metadata: request.metadata ? request.metadata : {}
            };
            
            const result = await customerEng.processWebhook(webhookEvent);
            
            if (result.status === "success") {
                response.success = true;
                response.message = result.message || "Webhook processed successfully";
                response.id = result.webhook.id;
                response.webhookId = result.webhook.webhookId;
                response.accountId = result.webhook.accountId;
                response.customerId = result.webhook.customerId;
                response.type = result.webhook.type;
                response.source = result.webhook.source;
                response.social = result.webhook.social;
                response.data = result.webhook.data;
                response.tags = result.webhook.tags;
                response.priority = result.webhook.priority;
                response.intent = result.webhook.intent;
                response.generateResponse = result.webhook.generateResponse;
                response.status = result.webhook.status;
                response.processedAt = result.webhook.processedAt;
                response.createdAt = result.webhook.createdAt;
                response.processing = result.processing ? new TextEncoder().encode(JSON.stringify(result.processing)) : undefined;
                response.customer = result.customer ? new TextEncoder().encode(JSON.stringify(result.customer)) : undefined;
                callback(null, response);
            } else {
                response.success = false;
                response.message = "Failed to process webhook";
                callback(null, response);
            }
        } catch (error) {   
            console.log(error);
            response.success = false;
            response.message = "Failed to process webhook";
            callback(null, response);
        }
    },  

    /**
     * Generate response using webhooks
     * @param {Object} call
     * @param {customerEngagement.GenerateResponseRequest} call.request
     * @param {function} callback 
     */
    generateResponse: async function ({ request }, callback) {
        try {
            const { ServerInstance } = Adapter;
            if (!ServerInstance) {
                return callback({
                    code: 500,
                    message: "Server instance not initialized!",
                    status: status.INTERNAL
                });
            }

            // Validate required fields
            if (!request.accountId || !request.customerId) {
                return callback({
                    code: 400,
                    message: "Account ID and Customer ID are required",
                    status: status.INVALID_ARGUMENT
                });
            }
            const config = {
                baseURL: "http://localhost:3004",
                timeout: 30000,
                ...ServerInstance.Config.customerEngagement
            }

            // Initialize CustomerEngagement class
            const customerEng = new CustomerEngagement(config);
            
            const result = await customerEng.generateResponse(request.accountId, request.customerId);
            
            if (result.status === "success") {
                callback(null, {
                    success: true,
                    message: "Response generated successfully",
                    response: new TextEncoder().encode(JSON.stringify(result.response)),
                    analysis: new TextEncoder().encode(JSON.stringify(result.analysis))
                });
            } else {
                callback(null, {
                    success: false,
                    message: "Failed to generate response"
                });
            }
        } catch (error) {
            console.log(error);
            callback({
                code: 500,
                message: error.message || "Error generating response",
                status: status.INTERNAL
            });
        }
    },
};
