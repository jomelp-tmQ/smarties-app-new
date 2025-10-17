import { Adapter, Core } from "@tmq-dev-ph/tmq-dev-core-server";
import { status } from "@grpc/grpc-js";
import { tmq as sales } from "../../common/static_codegen/tmq/SalesEnablement";
const { CustomerResponse, ConnectStripeResponse, UpdateCustomerRequest, CustomerRequest, ListCustomersRequest, ListCustomersResponse, DiscountCodeData, DiscountCodeResponse, UpdateDiscountCodeRequest, GetDiscountCodeRequest, GetDiscountCodeResponse, ListDiscountCodesRequest, ListDiscountCodesResponse, InvoiceResponse, UpdateInvoiceRequest, GetInvoiceRequest, GetInvoiceResponse, ListInvoicesRequest, ListInvoicesResponse, LoyaltyPointsResponse, UpdateLoyaltyPointsRequest, CustomerLoyaltyStatusRequest, CustomerLoyaltyStatusResponse, ProductResponse, UpdateSalesProductRequest, DeleteSalesProductRequest, AddSalesProductRequest } = sales;

import Server from "../Server";
import SalesEnablement from "../classes/journey/SalesEnablement";
import { logger as baseLogger } from "../utils/serverUtils";
const logger = baseLogger.child({ service: 'services/SalesEnablement.js' });

export default {
    connectStripe: async function ({ request }, callback) {
        const response = new ConnectStripeResponse();
        try {
            const { ServerInstance } = Adapter;

        } catch (error) {
            logger.error("Error connecting Stripe", { error: error?.message || error });
            callback({
                code: 500,
                message: error.message || "Error connecting Stripe",
                status: status.INTERNAL
            });
        }
    },
    /**
    * @param {Object} call
    * @param {sales.CreateCustomerRequest} call.request
    * @param {function} callback 
    */
    createCustomer: async function ({ request }, callback) {
        const response = new CustomerResponse();
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
            if (!request.email || !request.firstName || !request.lastName) {
                return callback({
                    code: 400,
                    message: "Email, firstName, and lastName are required",
                    status: status.INVALID_ARGUMENT
                });
            }

            const config = {
                baseURL: "http://localhost:3005",
                ...ServerInstance.Config.salesEnablement
            }

            const salesEnablement = new SalesEnablement(config);


            const customerData = {
                email: request.email,
                firstName: request.firstName,
                lastName: request.lastName,
                phone: request.phone || null,
                company: request.company || null,
                status: request.status || 'active',
                source: request.source || 'memory_center',
                assignedTo: request.assignedTo || null,
                tags: request.tags || [],
                notes: request.notes || null,
                billingAddress: request.billingAddress || null,
                userId: request.userId || null,
                accountId: request.accountId || 'default',
                metadata: request.metadata || {}
            };

            const result = await salesEnablement.addCustomer(customerData);

            if (result.status === "success") {
                response.success = true;
                response.message = "Customer created successfully";
                response.customerId = result.customer.id;
                response.stripeCustomerId = result.customer.stripeCustomerId;
                response.email = result.customer.email;
                response.firstName = result.customer.firstName;
                response.lastName = result.customer.lastName;
                response.phone = result.customer.phone;
                response.status = result.customer.status;
            } else {
                response.success = false;
                response.message = "Failed to create customer";
            }

            callback(null, response);
        } catch (error) {
            logger.error("Error creating customer", { error: error?.message || error });
            callback({
                code: 500,
                message: error.message || "Error creating customer",
                status: status.INTERNAL
            });
        }
    },
    fetchCustomer: async function ({ request }, callback) {
        const response = new ListCustomersResponse();
        try {
            const { ServerInstance } = Adapter;
            if (!ServerInstance) {
                return callback({
                    code: 500,
                    message: "Server instance not initialized!",
                    status: status.INTERNAL
                });
            }

            const config = {
                baseURL: "http://localhost:3005",
                ...ServerInstance.Config.salesEnablement
            }

            const salesEnablement = new SalesEnablement(config);

            const filters = {
                status: request.status || null,
                userId: request.userId || null
            };

            const result = await salesEnablement.listCustomers(filters);

            if (result.status === "success") {
                response.success = true;
                response.message = "Customers fetched successfully";
                response.count = result.count;

                // Add customers to response
                result.customers.forEach(customer => {
                    const customerData = {
                        id: customer.id,
                        customerId: customer.customerId,
                        stripeCustomerId: customer.stripeCustomerId,
                        email: customer.email,
                        firstName: customer.firstName,
                        lastName: customer.lastName,
                        phone: customer.phone,
                        status: customer.status,
                        customerType: customer.customerType,
                        createdAt: customer.createdAt
                    };
                    response.customers.push(customerData);
                });
            } else {
                response.success = false;
                response.message = "Failed to fetch customers";
            }

            callback(null, response);
        } catch (error) {
            logger.error("Error fetching customers", { error });
            callback({
                code: 500,
                message: error.message || "Error fetching customers",
                status: status.INTERNAL
            });
        }
    },
    updateCustomer: async function ({ request }, callback) {
        const response = new CustomerResponse();
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
            if (!request.customerId) {
                return callback({
                    code: 400,
                    message: "Customer ID is required",
                    status: status.INVALID_ARGUMENT
                });
            }

            const config = {
                baseURL: "http://localhost:3005",
                ...ServerInstance.Config.salesEnablement
            }

            const salesEnablement = new SalesEnablement(config);

            const updateData = {
                firstName: request.firstName,
                lastName: request.lastName,
                phone: request.phone,
                billingAddress: request.billingAddress,
                status: request.status,
                metadata: request.metadata
            };

            const result = await salesEnablement.updateCustomer(request.customerId, updateData);

            if (result.status === "success") {
                response.success = true;
                response.message = "Customer updated successfully";
                response.customerId = result.customer.id;
                response.stripeCustomerId = result.customer.stripeCustomerId;
                response.email = result.customer.email;
                response.firstName = result.customer.firstName;
                response.lastName = result.customer.lastName;
                response.phone = result.customer.phone;
                response.status = result.customer.status;
            } else {
                response.success = false;
                response.message = "Failed to update customer";
            }

            callback(null, response);
        } catch (error) {
            logger.error("Error updating customer", { error });
            callback({
                code: 500,
                message: error.message || "Error updating customer",
                status: status.INTERNAL
            });
        }
    },
    createDiscountCode: async function ({ request }, callback) {
        const response = new DiscountCodeResponse();
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
            if (!request.name || !request.code || !request.type || !request.value || !request.currency) {
                return callback({
                    code: 400,
                    message: "Name, code, type, value, and currency are required",
                    status: status.INVALID_ARGUMENT
                });
            }

            const config = {
                baseURL: "http://localhost:3005",
                ...ServerInstance.Config.salesEnablement
            }

            const salesEnablement = new SalesEnablement(config);

            const discountData = {
                name: request.name,
                code: request.code,
                type: request.type,
                value: request.value,
                currency: request.currency,
                maxUses: request.maxUses || null,
                expiresAt: request.expiresAt || null,
                minimumAmount: request.minimumAmount || 0,
                userId: request.userId || null,
                metadata: request.metadata || {}
            };

            const result = await salesEnablement.createDiscountCode(discountData);

            if (result.status === "success") {
                const discountCodeData = new DiscountCodeData();
                response.success = true;
                response.message = "Discount code created successfully";
                discountCodeData.discountId = result.discount.id;
                discountCodeData.name = result.discount.name;
                discountCodeData.code = result.discount.code;
                discountCodeData.type = result.discount.type;
                discountCodeData.value = result.discount.value;
                discountCodeData.currency = result.discount.currency;
                discountCodeData.maxUses = result.discount.maxUses;
                discountCodeData.currentUses = result.discount.currentUses;
                discountCodeData.expiresAt = result.discount.expiresAt;
                discountCodeData.minimumAmount = result.discount.minimumAmount;
                discountCodeData.isActive = result.discount.isActive;
                response.discount = discountCodeData;
            } else {
                response.success = false;
                response.message = "Failed to create discount code";
            }

            callback(null, response);
        } catch (error) {
            logger.error("Error creating discount code", { error: error?.message || error });
            callback({
                code: 500,
                message: error.message || "Error creating discount code",
                status: status.INTERNAL
            });
        }
    },
    updateDiscountCode: async function ({ request }, callback) {
        const response = new DiscountCodeResponse();
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
            if (!request.discountId) {
                return callback({
                    code: 400,
                    message: "Discount ID is required",
                    status: status.INVALID_ARGUMENT
                });
            }

            const config = {
                baseURL: "http://localhost:3005",
                ...ServerInstance.Config.salesEnablement
            }

            const salesEnablement = new SalesEnablement(config);

            const updateData = {
                name: request.name,
                type: request.type,
                value: request.value,
                currency: request.currency,
                maxUses: request.maxUses,
                expiresAt: request.expiresAt,
                minimumAmount: request.minimumAmount,
                isActive: request.isActive,
                metadata: request.metadata
            };

            const result = await salesEnablement.updateDiscountCode(request.discountId, updateData);

            if (result.status === "success") {
                response.success = true;
                response.message = "Discount code updated successfully";
                response.discountId = result.discount.id;
                response.name = result.discount.name;
                response.code = result.discount.code;
                response.type = result.discount.type;
                response.value = result.discount.value;
                response.currency = result.discount.currency;
                response.maxUses = result.discount.maxUses;
                response.currentUses = result.discount.currentUses;
                response.expiresAt = result.discount.expiresAt;
                response.minimumAmount = result.discount.minimumAmount;
                response.isActive = result.discount.isActive;
            } else {
                response.success = false;
                response.message = "Failed to update discount code";
            }

            callback(null, response);
        } catch (error) {
            logger.error("Error updating discount code", { error });
            callback({
                code: 500,
                message: error.message || "Error updating discount code",
                status: status.INTERNAL
            });
        }
    },
    createInvoice: async function ({ request }, callback) {
        const response = new InvoiceResponse();
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
            if (!request.customerId || !request.products || !request.totalAmount || !request.currency) {
                return callback({
                    code: 400,
                    message: "Customer ID, products, total amount, and currency are required",
                    status: status.INVALID_ARGUMENT
                });
            }

            if (!Array.isArray(request.products) || request.products.length === 0) {
                return callback({
                    code: 400,
                    message: "Products array is required and must not be empty",
                    status: status.INVALID_ARGUMENT
                });
            }

            const config = {
                baseURL: "http://localhost:3005",
                ...ServerInstance.Config.salesEnablement
            }

            const salesEnablement = new SalesEnablement(config);

            const invoiceData = {
                customerId: request.customerId,
                products: request.products,
                totalAmount: request.totalAmount,
                currency: request.currency,
                discountCode: request.discountCode || null,
                discountAmount: request.discountAmount || 0,
                taxAmount: request.taxAmount || 0,
                dueDate: request.dueDate || null,
                billingAddress: request.billingAddress || null,
                userId: request.userId || null,
                metadata: request.metadata || {}
            };

            const result = await salesEnablement.createInvoice(invoiceData);

            if (result.status === "success") {
                response.success = true;
                response.message = "Invoice created successfully";
                response.invoiceId = result.invoice.id;
                response.invoiceNumber = result.invoice.invoiceNumber;
                response.customerId = result.invoice.customerId;
                response.totalAmount = result.invoice.totalAmount;
                response.currency = result.invoice.currency;
                response.status = result.invoice.status;
                response.paymentStatus = result.invoice.paymentStatus;
                response.dueDate = result.invoice.dueDate;
            } else {
                response.success = false;
                response.message = "Failed to create invoice";
            }

            callback(null, response);
        } catch (error) {
            logger.error("Error creating invoice", { error });
            callback({
                code: 500,
                message: error.message || "Error creating invoice",
                status: status.INTERNAL
            });
        }
    },
    updateInvoice: async function ({ request }, callback) {
        const response = new InvoiceResponse();
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
            if (!request.invoiceId) {
                return callback({
                    code: 400,
                    message: "Invoice ID is required",
                    status: status.INVALID_ARGUMENT
                });
            }

            const config = {
                baseURL: "http://localhost:3005",
                ...ServerInstance.Config.salesEnablement
            }

            const salesEnablement = new SalesEnablement(config);

            // For now, we'll just return success since updateInvoice method is not implemented in the class
            // TODO: Implement updateInvoice method in SalesEnablement class
            response.success = true;
            response.message = "Invoice update not yet implemented";
            response.invoiceId = request.invoiceId;

            callback(null, response);
        } catch (error) {
            logger.error("Error updating invoice", { error });
            callback({
                code: 500,
                message: error.message || "Error updating invoice",
                status: status.INTERNAL
            });
        }
    },
    createLoyaltyPoints: async function ({ request }, callback) {
        const response = new LoyaltyPointsResponse();
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
            if (!request.customerId || !request.totalAmount) {
                return callback({
                    code: 400,
                    message: "Customer ID and total amount are required",
                    status: status.INVALID_ARGUMENT
                });
            }

            const config = {
                baseURL: "http://localhost:3005",
                ...ServerInstance.Config.salesEnablement
            }

            const salesEnablement = new SalesEnablement(config);

            const loyaltyData = {
                customerId: request.customerId,
                totalAmount: request.totalAmount,
                orderId: request.orderId || null,
                invoiceId: request.invoiceId || null,
                transactionId: request.transactionId || null
            };

            const result = await salesEnablement.createLoyaltyPoints(loyaltyData);

            if (result.status === "success") {
                response.success = true;
                response.message = "Loyalty points created successfully";
                response.loyalty = new TextEncoder().encode(JSON.stringify(result.loyalty));
            } else {
                response.success = false;
                response.message = "Failed to create loyalty points";
            }

            callback(null, response);
        } catch (error) {
            logger.error("Error creating loyalty points", { error });
            callback({
                code: 500,
                message: error.message || "Error creating loyalty points",
                status: status.INTERNAL
            });
        }
    },

    spendLoyaltyPoints: async function ({ request }, callback) {
        const response = new LoyaltyPointsResponse();
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
            if (!request.customerId || !request.pointsToSpend) {
                return callback({
                    code: 400,
                    message: "Customer ID and points are required",
                    status: status.INVALID_ARGUMENT
                });
            }

            const config = {
                baseURL: "http://localhost:3005",
                domain: ServerInstance.Config.domain,
                ...ServerInstance.Config.salesEnablement
            }

            const salesEnablement = new SalesEnablement(config);

            const loyaltyData = {
                customerId: request.customerId,
                pointsToSpend: request.pointsToSpend,
                orderId: request.orderId || null,
                invoiceId: request.invoiceId || null,
                transactionId: request.transactionId || null
            };

            const result = await salesEnablement.spendLoyaltyPoints(loyaltyData);

            if (result.status === "success") {
                response.success = true;
                response.message = "Loyalty points spent successfully";
                response.loyalty = new TextEncoder().encode(JSON.stringify(result.loyalty));
            } else {
                response.success = false;
                response.message = "Failed to spend loyalty points";
            }

            callback(null, response);
        } catch (error) {
            logger.error("Error spending loyalty points", { error: error?.message || error });
            callback({
                code: 500,
                message: error.message || "Error spending loyalty points",
                status: status.INTERNAL
            });
        }
    },
    getCustomerLoyaltyStatus: async function ({ request }, callback) {
        const response = new CustomerLoyaltyStatusResponse();
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
            if (!request.customerId) {
                return callback({
                    code: 400,
                    message: "Customer ID is required",
                    status: status.INVALID_ARGUMENT
                });
            }

            const config = {
                baseURL: "http://localhost:3005",
                ...ServerInstance.Config.salesEnablement
            }

            const salesEnablement = new SalesEnablement(config);

            const result = await salesEnablement.getCustomerLoyaltyStatus(request.customerId);

            if (result.status === "success") {
                response.success = true;
                response.message = "Customer loyalty status retrieved successfully";
                response.data = result.loyaltyStatus;
            } else {
                response.success = false;
                response.message = "Failed to get customer loyalty status";
            }

            callback(null, response);
        } catch (error) {
            logger.error("Error getting customer loyalty status", { error });
            callback({
                code: 500,
                message: error.message || "Error getting customer loyalty status",
                status: status.INTERNAL
            });
        }
    },
    updateLoyaltyPoints: async function ({ request }, callback) {
        const response = new LoyaltyPointsResponse();
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
            if (!request.customerId) {
                return callback({
                    code: 400,
                    message: "Customer ID is required",
                    status: status.INVALID_ARGUMENT
                });
            }

            const config = {
                baseURL: "http://localhost:3005",
                ...ServerInstance.Config.salesEnablement
            }

            const salesEnablement = new SalesEnablement(config);

            // For now, we'll just return success since updateLoyaltyPoints method is not implemented in the class
            // TODO: Implement updateLoyaltyPoints method in SalesEnablement class
            response.success = true;
            response.message = "Loyalty points update not yet implemented";
            response.data = { customerId: request.customerId };

            callback(null, response);
        } catch (error) {
            logger.error("Error updating loyalty points", { error });
            callback({
                code: 500,
                message: error.message || "Error updating loyalty points",
                status: status.INTERNAL
            });
        }
    },
    addProduct: async function ({ request }, callback) {
        const response = new ProductResponse();
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
            if (!request.name || !request.price || !request.currency) {
                return callback({
                    code: 400,
                    message: "Product name, price, and currency are required",
                    status: status.INVALID_ARGUMENT
                });
            }

            const config = {
                baseURL: "http://localhost:3005",
                ...ServerInstance.Config.salesEnablement
            }

            const salesEnablement = new SalesEnablement(config);

            // For now, we'll just return success since addProduct method is not implemented in the class
            // TODO: Implement addProduct method in SalesEnablement class
            response.success = true;
            response.message = "Product addition not yet implemented";
            response.productId = "temp_" + Date.now();

            callback(null, response);
        } catch (error) {
            logger.error("Error adding product", { error });
            callback({
                code: 500,
                message: error.message || "Error adding product",
                status: status.INTERNAL
            });
        }
    },
    updateProduct: async function ({ request }, callback) {
        const response = new ProductResponse();
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
            if (!request.productId) {
                return callback({
                    code: 400,
                    message: "Product ID is required",
                    status: status.INVALID_ARGUMENT
                });
            }

            const config = {
                baseURL: "http://localhost:3005",
                ...ServerInstance.Config.salesEnablement
            }

            const salesEnablement = new SalesEnablement(config);



            // For now, we'll just return success since updateProduct method is not implemented in the class
            // TODO: Implement updateProduct method in SalesEnablement class
            response.success = true;
            response.message = "Product update not yet implemented";
            response.productId = request.productId;

            callback(null, response);
        } catch (error) {
            logger.error("Error updating product", { error });
            callback({
                code: 500,
                message: error.message || "Error updating product",
                status: status.INTERNAL
            });
        }
    },
    deleteProduct: async function ({ request }, callback) {
        const response = new ProductResponse();
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
            if (!request.productId) {
                return callback({
                    code: 400,
                    message: "Product ID is required",
                    status: status.INVALID_ARGUMENT
                });
            }

            const config = {
                baseURL: "http://localhost:3005",
                ...ServerInstance.Config.salesEnablement
            }

            const salesEnablement = new SalesEnablement(config);

            // For now, we'll just return success since deleteProduct method is not implemented in the class
            // TODO: Implement deleteProduct method in SalesEnablement class
            response.success = true;
            response.message = "Product deletion not yet implemented";
            response.productId = request.productId;

            callback(null, response);
        } catch (error) {
            logger.error("Error deleting product", { error });
            callback({
                code: 500,
                message: error.message || "Error deleting product",
                status: status.INTERNAL
            });
        }
    },
};