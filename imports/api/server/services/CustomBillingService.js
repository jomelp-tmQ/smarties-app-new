import { Adapter, Core } from "@tmq-dev-ph/tmq-dev-core-server";
import { status } from "@grpc/grpc-js";
import { tmq as billing } from "../../common/static_codegen/tmq/customBilling";
import Server from "../Server";
import { InvoicesData } from "../classes/dbTemplates/Invoices";
import { logger as baseLogger } from "../utils/serverUtils";
const logger = baseLogger.child({ service: 'services/CustomBillingService.js' });
const { AuthResponse } = billing;

export default {
    /**
     * Automates the subscription process for a user.
     * @param {Object} param0 - The request object containing userId and other details.
     * @param {Function} callback - The callback to return the response.
     */
    fetchAuth: async function ({ request }, callback) {
        const response = new AuthResponse();
        try {
            const { ServerInstance } = Adapter;
            if (!ServerInstance) {
                callback({
                    code: 500,
                    message: "Server instance not initialized!",
                    status: status.INTERNAL
                });
            } else {
                const { url, apiKey } = Server.Config.billingInfo;
                response.url = url;
                response.apiKey = apiKey;
            }
            callback(null, response);
        } catch (error) {
            logger.error('fetchAuth error', { error: error?.message || error });
            callback({
                code: 500,
                message: "An error occurred while processing the subscription",
                status: status.INTERNAL
            });
        }
    },
    fetchInvoices: async function ({ request }, callback) {
        const response = new billing.FetchInvoicesResponse();
        try {
            const { ServerInstance } = Adapter;
            if (!ServerInstance) {
                callback({
                    code: 500,
                    message: "Server instance not initialized!",
                    status: status.INTERNAL
                });
                return; // prevent further execution
            }

            let indexBasis = "createdAt";
            let orderBasis = "$lt";

            const pipeline = [];
            const match = {};

            if (request.userId) {
                match.userId = request.userId;
            }

            const lastBasis = Number(request.lastBasis);
            if (lastBasis !== 0) {
                match[indexBasis] = { [orderBasis]: lastBasis };
            }

            pipeline.push({ $match: match });
            pipeline.push({ $sort: { [indexBasis]: -1 } });
            pipeline.push({ $limit: 15 });

            const invoices = await Core.getDB("invoices", true).aggregate(pipeline).toArray();
            const returnData = {};
            if (invoices && invoices.length) {
                returnData.data = invoices.map((item) => ({ ...item, _id: item._id.toString() }));

                returnData.lastBasis = invoices[invoices.length - 1][indexBasis];
            }

            if (returnData.data) {
                returnData.data.forEach(element => {
                    const inv = new InvoicesData(element, true);
                    response.invoices.push(inv.toProto());
                });
            }
            response.lastBasis = returnData.lastBasis || 0;
            callback(null, response);
        } catch (error) {
            logger.error('fetchInvoices error', { error: error?.message || error });
            callback({
                code: 500,
                message: "An error occurred while fetching the invoice",
                status: status.INTERNAL
            });
        }
    },
    fetchSubscription: async function ({ request }, callback) {
        const response = new billing.fetchSubscriptionResponse();
        try {
            const { ServerInstance } = Adapter;
            if (!ServerInstance) {
                callback({
                    code: 500,
                    message: "Server instance not initialized!",
                    status: status.INTERNAL
                });
                return; // prevent further execution
            }
            const userId = request.userId;
            if (!userId) {
                callback({
                    code: 400,
                    message: "User ID is required",
                    status: status.INVALID_ARGUMENT
                });
                return; // prevent further execution
            }

            const subscription = await Core.getDB("subscriptions", true).findOne({ userId });
            if (subscription) {
                response.id = subscription._id.toString();
                response.userId = subscription.userId || "";
                response.referenceId = subscription.referenceId || "";
                response.customerId = subscription.customerId || "";
                response.status = subscription.status || "";
                response.subscriptionType - subscription.subscriptionType || "";
                response.termBillingCycle = subscription.termBillingCycle || "";
                response.termCurrency = subscription.termCurrency || "";
                response.termPrice = subscription.termPrice || 0;
                response.updatedAt = subscription.updatedAt || 0;
                response.createdAt = subscription.createdAt || 0;
                response.success = true;
                response.message = "Subscription fetched successfully";
            } else {
                response.message = "No subscription found for the given user ID";
                response.success = false;
            }
            callback(null, response);
        } catch (error) {
            logger.error('fetchSubscription error', { error: error?.message || error });
            callback({
                code: 500,
                message: "An error occurred while fetching the subscription",
                status: status.INTERNAL
            });
        }
    },
    fetchPaymentMethod: async function ({ request }, callback) {
        const response = new billing.fetchpaymentMethodResponse();
        try {
            const { ServerInstance } = Adapter;
            if (!ServerInstance) {
                callback({
                    code: 500,
                    message: "Server instance not initialized!",
                    status: status.INTERNAL
                });
                return; // prevent further execution
            }
            const userId = request.userId;
            if (!userId) {
                callback({
                    code: 400,
                    message: "User ID is required",
                    status: status.INVALID_ARGUMENT
                });
                return; // prevent further execution
            }
            const c = await Core.getDB("charges", true).findOne({ userId });
            if (c) {
                response.id = c._id.toString();
                response.userId = c.userId || "";
                response.cardBrand = c.paymentMethodDetails.card.brand
                response.cardLast4 = c.paymentMethodDetails.card.last4 || "";
                response.cardExpMonth = c.paymentMethodDetails.card.exp_month || 0;
                response.cardExpYear = c.paymentMethodDetails.card.exp_year || 0;
                response.type = c.paymentMethodDetails.type || "";
                response.message = "Payment method fetched successfully";
                response.success = true;
            } else {
                response.success = false;
                response.message = "No customer ID fo   und for the given user ID";
            }
            callback(null, response);
        } catch (error) {
            logger.error('fetchPaymentMethod error', { error: error?.message || error });
            callback({
                code: 500,
                message: "An error occurred while fetching the payment method",
                status: status.INTERNAL
            });
        }
    }
};