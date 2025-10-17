import { SalesEnablementClient } from '@sales-enablement/client';
import { Core } from "@tmq-dev-ph/tmq-dev-core-server";
import { Customer } from "../dbTemplates/Customer";

class SalesEnablement {
    constructor(config, domain) {
        this.config = config;
        this.domain = domain;
        this.client = new SalesEnablementClient(config);
        this.db = Core.getDB("salesEnablement", true);
    }

    /**
     * Set the API key for the client
     * @param {string} apiKey - JWT token or API key
     */
    setApiKey(apiKey) {
        this.client.setApiKey(apiKey);
    }


    /**
     * Sign up with Stripe Connect
     * @param {Object} signUpData - Sign up data
     * @param {string} signUpData.email - Customer email
     * @param {string} signUpData.firstName - Customer first name
     * @param {string} signUpData.lastName - Customer last name
     * @param {string} signUpData.phone - Customer phone number
     * @param {Object} signUpData.billingAddress - Billing address information
     * @returns {Object} Signed up customer object
     */
    async connectStripe(userId) {
        const url = new URL(this.domain);
        const redirectUrl = `${url.origin}/api/sales-enablement/stripe/callback`;
        const response = await this.client.stripeOAuth.getConnectUrl(userId, redirectUrl);
        console.log(response);
        return response;
    }

    /**
     * Add a new customer
     * @param {Object} customerData - Customer information
     * @param {string} customerData.email - Customer email
     * @param {string} customerData.firstName - Customer first name
     * @param {string} customerData.lastName - Customer last name
     * @param {string} customerData.phone - Customer phone number
     * @param {Object} customerData.billingAddress - Billing address information
     * @param {string} customerData.userId - Associated user ID
     * @returns {Object} Created customer object
     */
    async addCustomer(customerData) {
        if (!customerData.email || !customerData.firstName || !customerData.lastName) {
            throw new Error('Email, firstName, and lastName are required');
        }

        try {
            // Use the client's createCustomer method instead of direct axios
            const response = await this.client.stripeOAuth.createCustomer(customerData.userId, {
                email: customerData.email,
                name: `${customerData.firstName} ${customerData.lastName}`,
                phone: customerData.phone,
                metadata: {
                    source: 'sales_enablement_class',
                    userId: customerData.userId
                }
            });

            console.log(response);

            if (response.newCustomer) {
                const customer = response.newCustomer;
                
                // Create or update customer using the Customer template
                let dbCustomer = await Customer.findByStripeCustomerId(customer.id) || 
                                await Customer.findByCustomerId(customer.id);
                
                if (!dbCustomer) {
                    // Create new customer
                    dbCustomer = new Customer({
                        customerId: customer.id,
                        accountId: customerData.accountId || 'default',
                        userId: customerData.userId || null,
                        customerType: 'sales',
                        source: 'stripe',
                        firstName: customerData.firstName,
                        lastName: customerData.lastName,
                        email: customerData.email,
                        phone: customerData.phone || null,
                        billingAddress: customerData.billingAddress || null,
                        stripeCustomerId: customer.id,
                        status: 'active',
                        lifecycleStage: 'customer',
                        tags: ['stripe', 'sales'],
                        metadata: customerData.metadata || {}
                    });
                } else {
                    // Update existing customer
                    dbCustomer.firstName = customerData.firstName;
                    dbCustomer.lastName = customerData.lastName;
                    dbCustomer.email = customerData.email;
                    dbCustomer.phone = customerData.phone || dbCustomer.phone;
                    dbCustomer.billingAddress = customerData.billingAddress || dbCustomer.billingAddress;
                    dbCustomer.metadata = { ...dbCustomer.metadata, ...customerData.metadata };
                }

                // Save customer to database
                await dbCustomer.save();

                return {
                    status: "success",
                    customer: {
                        id: dbCustomer.id,
                        customerId: dbCustomer.customerId,
                        stripeCustomerId: dbCustomer.stripeCustomerId,
                        email: dbCustomer.email,
                        firstName: dbCustomer.firstName,
                        lastName: dbCustomer.lastName,
                        phone: dbCustomer.phone,
                        billingAddress: dbCustomer.billingAddress,
                        status: dbCustomer.status,
                        customerType: dbCustomer.customerType,
                        createdAt: dbCustomer.createdAt
                    }
                };
            } else {
                throw new Error('Failed to create customer via client');
            }
        } catch (error) {
            console.error('Error creating customer:', error);
            throw new Error(`Failed to create customer: ${error.message}`);
        }
    }

    /**
     * Update an existing customer
     * @param {string} customerId - Customer ID to update
     * @param {Object} updateData - Data to update
     * @returns {Object} Updated customer object
     */
    async updateCustomer(customerId, updateData) {
        if (!customerId) {
            throw new Error('Customer ID is required');
        }

        try {
            // Use the client's updateCustomer method
            const response = await this.client.customers.updateCustomer(customerId, {
                firstName: updateData.firstName,
                lastName: updateData.lastName,
                phone: updateData.phone,
                billingAddress: updateData.billingAddress,
                metadata: {
                    ...updateData.metadata,
                    updatedAt: new Date().valueOf()
                }
            });

            if (response.data) {
                const updatedCustomer = response.data;
                
                // Create or update customer using the Customer template
                let dbCustomer = await Customer.findByStripeCustomerId(customerId) || 
                                await Customer.findByCustomerId(customerId);
                
                if (!dbCustomer) {
                    // This case should ideally not happen if updateCustomer works correctly
                    // but as a fallback, we can create a new customer if it doesn't exist
                    dbCustomer = new Customer({
                        customerId: customerId,
                        accountId: 'default', // Assuming accountId is not part of updateData
                        userId: null, // Assuming userId is not part of updateData
                        customerType: 'sales',
                        source: 'stripe',
                        firstName: updatedCustomer.firstName,
                        lastName: updatedCustomer.lastName,
                        email: updatedCustomer.email,
                        phone: updatedCustomer.phone,
                        billingAddress: updatedCustomer.billingAddress,
                        stripeCustomerId: customerId,
                        status: 'active',
                        lifecycleStage: 'customer',
                        tags: ['stripe', 'sales'],
                        metadata: updatedCustomer.metadata || {}
                    });
                } else {
                    // Update existing customer
                    dbCustomer.firstName = updatedCustomer.firstName;
                    dbCustomer.lastName = updatedCustomer.lastName;
                    dbCustomer.email = updatedCustomer.email;
                    dbCustomer.phone = updatedCustomer.phone || dbCustomer.phone;
                    dbCustomer.billingAddress = updatedCustomer.billingAddress || dbCustomer.billingAddress;
                    dbCustomer.metadata = { ...dbCustomer.metadata, ...updatedCustomer.metadata };
                }

                // Save updated customer
                await dbCustomer.save();

                return {
                    status: "success",
                    customer: {
                        id: dbCustomer.id,
                        customerId: dbCustomer.customerId,
                        stripeCustomerId: dbCustomer.stripeCustomerId,
                        email: dbCustomer.email,
                        firstName: dbCustomer.firstName,
                        lastName: dbCustomer.lastName,
                        phone: dbCustomer.phone,
                        billingAddress: dbCustomer.billingAddress,
                        status: dbCustomer.status,
                        updatedAt: dbCustomer.updatedAt
                    }
                };
            } else {
                throw new Error('Failed to update customer via client');
            }
        } catch (error) {
            console.error('Error updating customer:', error);
            throw new Error(`Failed to update customer: ${error.message}`);
        }
    }

    /**
     * Create a new discount code
     * @param {Object} discountData - Discount code information
     * @param {string} discountData.name - Discount name
     * @param {string} discountData.code - Discount code
     * @param {string} discountData.type - Discount type (percentage or fixed)
     * @param {number} discountData.value - Discount value
     * @param {string} discountData.currency - Currency code
     * @param {number} discountData.maxUses - Maximum number of uses
     * @param {Date} discountData.expiresAt - Expiration date
     * @param {number} discountData.minimumAmount - Minimum order amount
     * @param {string} discountData.userId - Creator user ID
     * @returns {Object} Created discount code object
     */
    async createDiscountCode(discountData) {
        if (!discountData.name || !discountData.code || !discountData.type || 
            !discountData.value || !discountData.currency) {
            throw new Error('Name, code, type, value, and currency are required');
        }

        if (!['percentage', 'fixed'].includes(discountData.type)) {
            throw new Error('Type must be either "percentage" or "fixed"');
        }

        try {
            // Use the client's transactions.createDiscountCode method
            const response = await this.client.transactions.createDiscountCode(discountData, discountData.userId);
            console.log(response);
            
            if (response.data) {
                // Store additional discount data in local database
                const now = new Date().valueOf();
                const discountRecord = {
                    discountId: response.data._id || response.data.id,
                    name: discountData.name,
                    code: discountData.code.toUpperCase(),
                    type: discountData.type,
                    value: discountData.value,
                    currency: discountData.currency.toLowerCase(),
                    maxUses: discountData.maxUses || null,
                    currentUses: 0,
                    expiresAt: discountData.expiresAt || null,
                    minimumAmount: discountData.minimumAmount || 0,
                    isActive: true,
                    createdBy: discountData.userId || null,
                    createdAt: now,
                    updatedAt: now,
                    metadata: discountData.metadata || {}
                };

                await this.db.insertOne(discountRecord);

                return {
                    status: "success",
                    discount: {
                        id: discountRecord._id,
                        discountId: response.data._id || response.data.id,
                        name: response.data.name || discountData.name,
                        code: response.data.code || discountData.code,
                        type: response.data.type || discountData.type,
                        value: response.data.value || discountData.value,
                        currency: response.data.currency || discountData.currency,
                        maxUses: response.data.maxUses || discountData.maxUses,
                        currentUses: response.data.currentUses || 0,
                        expiresAt: response.data.expiresAt || discountData.expiresAt,
                        minimumAmount: response.data.minimumAmount || discountData.minimumAmount,
                        isActive: response.data.isActive !== false,
                        createdAt: response.data.createdAt || discountRecord.createdAt
                    }
                };
            } else {
                throw new Error('Failed to create discount code via client');
            }
        } catch (error) {
            console.error('Error creating discount code:', error);
            throw new Error(`Failed to create discount code: ${error.message}`);
        }
    }

    /**
     * Update an existing discount code
     * @param {string} discountId - Discount code ID to update
     * @param {Object} updateData - Data to update
     * @returns {Object} Updated discount code object
     */
    async updateDiscountCode(discountId, updateData) {
        if (!discountId) {
            throw new Error('Discount code ID is required');
        }

        try {
            // Get existing discount record
            const existingDiscount = await this.db.findOne({ _id: discountId });
            if (!existingDiscount) {
                throw new Error('Discount code not found');
            }

            const allowedFields = [
                'name', 'type', 'value', 'currency', 'maxUses', 
                'expiresAt', 'minimumAmount', 'isActive', 'metadata'
            ];

            const updateFields = {};
            allowedFields.forEach(field => {
                if (updateData[field] !== undefined) {
                    updateFields[field] = updateData[field];
                }
            });

            if (Object.keys(updateFields).length === 0) {
                throw new Error('No valid fields to update');
            }

            // Validate type if being updated
            if (updateFields.type && !['percentage', 'fixed'].includes(updateFields.type)) {
                throw new Error('Type must be either "percentage" or "fixed"');
            }

            updateFields.updatedAt = new Date().valueOf();

            // Update local database
            const result = await this.db.updateOne(
                { _id: discountId },
                { $set: updateFields }
            );

            if (result.modifiedCount > 0) {
                // If we have the original discount ID, try to update via client
                if (existingDiscount.discountId) {
                    try {
                        // Note: This would require the client to have an updateDiscountCode method
                        // For now, we'll just update the local database
                        console.log('Local discount code updated. Client update method not implemented.');
                    } catch (clientError) {
                        console.warn('Failed to update discount code via client, but local update succeeded:', clientError.message);
                    }
                }

                const updatedDiscount = await this.db.findOne({ _id: discountId });
                return {
                    status: "success",
                    discount: {
                        id: updatedDiscount._id,
                        discountId: updatedDiscount.discountId,
                        name: updatedDiscount.name,
                        code: updatedDiscount.code,
                        type: updatedDiscount.type,
                        value: updatedDiscount.value,
                        currency: updatedDiscount.currency,
                        maxUses: updatedDiscount.maxUses,
                        currentUses: updatedDiscount.currentUses,
                        expiresAt: updatedDiscount.expiresAt,
                        minimumAmount: updatedDiscount.minimumAmount,
                        isActive: updatedDiscount.isActive,
                        updatedAt: updatedDiscount.updatedAt
                    }
                };
            } else {
                throw new Error('No changes were made to the discount code');
            }
        } catch (error) {
            console.error('Error updating discount code:', error);
            throw new Error(`Failed to update discount code: ${error.message}`);
        }
    }

    /**
     * Create a new invoice
     * @param {Object} invoiceData - Invoice information
     * @param {string} invoiceData.customerId - Customer ID
     * @param {Array} invoiceData.products - Array of products
     * @param {number} invoiceData.totalAmount - Total amount in cents
     * @param {string} invoiceData.currency - Currency code
     * @param {string} invoiceData.discountCode - Applied discount code
     * @param {number} invoiceData.discountAmount - Discount amount in cents
     * @param {Date} invoiceData.dueDate - Invoice due date
     * @param {Object} invoiceData.billingAddress - Billing address
     * @param {string} invoiceData.userId - Creator user ID
     * @returns {Object} Created invoice object
     */
    async createInvoice(invoiceData) {
        if (!invoiceData.customerId || !invoiceData.products || 
            !invoiceData.totalAmount || !invoiceData.currency) {
            throw new Error('Customer ID, products, total amount, and currency are required');
        }

        if (!Array.isArray(invoiceData.products) || invoiceData.products.length === 0) {
            throw new Error('Products array is required and must not be empty');
        }

        try {
            // Use the client's transactions.generateInvoice method
            const response = await this.client.transactions.generateInvoice(invoiceData);
            
            if (response.data) {
                // Store additional invoice data in local database
                const now = new Date().valueOf();
                const invoiceRecord = {
                    _id: Core.generateId(),
                    invoiceId: response.data._id || response.data.id,
                    invoiceNumber: response.data.invoiceNumber || `INV-${Date.now()}`,
                    customerId: invoiceData.customerId,
                    products: invoiceData.products,
                    subtotalAmount: invoiceData.subtotalAmount || invoiceData.totalAmount,
                    totalAmount: invoiceData.totalAmount,
                    currency: invoiceData.currency.toLowerCase(),
                    discountCode: invoiceData.discountCode || null,
                    discountAmount: invoiceData.discountAmount || 0,
                    taxAmount: invoiceData.taxAmount || 0,
                    dueDate: invoiceData.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    billingAddress: invoiceData.billingAddress || null,
                    status: response.data.status || 'pending',
                    paymentStatus: response.data.paymentStatus || 'unpaid',
                    createdBy: invoiceData.userId || null,
                    createdAt: now,
                    updatedAt: now,
                    metadata: invoiceData.metadata || {}
                };

                await this.db.insertOne(invoiceRecord);

                return {
                    status: "success",
                    invoice: {
                        id: invoiceRecord._id,
                        invoiceId: response.data._id || response.data.id,
                        invoiceNumber: response.data.invoiceNumber || invoiceRecord.invoiceNumber,
                        customerId: invoiceData.customerId,
                        products: invoiceData.products,
                        subtotalAmount: invoiceRecord.subtotalAmount,
                        totalAmount: invoiceData.totalAmount,
                        currency: invoiceData.currency,
                        discountCode: invoiceData.discountCode,
                        discountAmount: invoiceData.discountAmount,
                        taxAmount: invoiceData.taxAmount,
                        dueDate: invoiceRecord.dueDate,
                        status: response.data.status || 'pending',
                        paymentStatus: response.data.paymentStatus || 'unpaid',
                        createdAt: response.data.createdAt || invoiceRecord.createdAt
                    }
                };
            } else {
                throw new Error('Failed to create invoice via client');
            }
        } catch (error) {
            console.error('Error creating invoice:', error);
            throw new Error(`Failed to create invoice: ${error.message}`);
        }
    }

    /**
     * Get customer by ID
     * @param {string} customerId - Customer ID
     * @returns {Object} Customer object
     */
    async getCustomer(customerId) {
        if (!customerId) {
            throw new Error('Customer ID is required');
        }

        try {
            // Use the client's getCustomerById method
            const response = await this.client.customers.getCustomerById(customerId);
            
            if (response.data) {
                const customer = response.data;
                
                return {
                    status: "success",
                    customer: {
                        id: customer.id,
                        customerId: customer.customerId,
                        stripeCustomerId: customer.stripeCustomerId,
                        email: customer.email,
                        firstName: customer.firstName,
                        lastName: customer.lastName,
                        phone: customer.phone,
                        billingAddress: customer.billingAddress,
                        status: customer.status,
                        customerType: customer.customerType,
                        createdAt: customer.createdAt,
                        updatedAt: customer.updatedAt
                    }
                };
            } else {
                throw new Error('Customer not found via client');
            }
        } catch (error) {
            console.error('Error getting customer:', error);
            throw new Error(`Failed to get customer: ${error.message}`);
        }
    }

    /**
     * Delete customer by ID
     * @param {string} customerId - Customer ID to delete
     * @returns {Object} Deletion result
     */
    async deleteCustomer(customerId) {
        if (!customerId) {
            throw new Error('Customer ID is required');
        }

        try {
            // Use the client's deleteCustomer method
            const response = await this.client.customers.deleteCustomer(customerId);
            
            if (response.data) {
                // Also remove from local database if it exists
                try {
                    const dbCustomer = await Customer.findByStripeCustomerId(customerId) || 
                                      await Customer.findByCustomerId(customerId);
                    if (dbCustomer) {
                        await dbCustomer.remove();
                    }
                } catch (dbError) {
                    console.warn('Failed to remove customer from local database:', dbError.message);
                }

                return {
                    status: "success",
                    message: response.data.message || "Customer deleted successfully",
                    requestId: response.data.requestId
                };
            } else {
                throw new Error('Failed to delete customer via client');
            }
        } catch (error) {
            console.error('Error deleting customer:', error);
            throw new Error(`Failed to delete customer: ${error.message}`);
        }
    }

    /**
     * Get discount code by ID
     * @param {string} discountId - Discount code ID
     * @returns {Object} Discount code object
     */
    async getDiscountCode(discountId) {
        if (!discountId) {
            throw new Error('Discount code ID is required');
        }

        try {
            const discount = await this.db.findOne({ _id: discountId });
            
            if (!discount) {
                throw new Error('Discount code not found');
            }

            return {
                status: "success",
                discount: {
                    id: discount._id,
                    discountId: discount.discountId,
                    name: discount.name,
                    code: discount.code,
                    type: discount.type,
                    value: discount.value,
                    currency: discount.currency,
                    maxUses: discount.maxUses,
                    currentUses: discount.currentUses,
                    expiresAt: discount.expiresAt,
                    minimumAmount: discount.minimumAmount,
                    isActive: discount.isActive,
                    createdAt: discount.createdAt,
                    updatedAt: discount.updatedAt
                }
            };
        } catch (error) {
            console.error('Error getting discount code:', error);
            throw new Error(`Failed to get discount code: ${error.message}`);
        }
    }

    /**
     * Get invoice by ID
     * @param {string} invoiceId - Invoice ID
     * @returns {Object} Invoice object
     */
    async getInvoice(invoiceId) {
        if (!invoiceId) {
            throw new Error('Invoice ID is required');
        }

        try {
            const invoice = await this.db.findOne({ _id: invoiceId });
            
            if (!invoice) {
                throw new Error('Invoice not found');
            }

            return {
                status: "success",
                invoice: {
                    id: invoice._id,
                    invoiceId: invoice.invoiceId,
                    invoiceNumber: invoice.invoiceNumber,
                    customerId: invoice.customerId,
                    products: invoice.products,
                    subtotalAmount: invoice.subtotalAmount,
                    totalAmount: invoice.totalAmount,
                    currency: invoice.currency,
                    discountCode: invoice.discountCode,
                    discountAmount: invoice.discountAmount,
                    taxAmount: invoice.taxAmount,
                    dueDate: invoice.dueDate,
                    status: invoice.status,
                    paymentStatus: invoice.paymentStatus,
                    createdAt: invoice.createdAt,
                    updatedAt: invoice.updatedAt
                }
            };
        } catch (error) {
            console.error('Error getting invoice:', error);
            throw new Error(`Failed to get invoice: ${error.message}`);
        }
    }

    /**
     * List all customers with optional filtering
     * @param {Object} filters - Optional filters
     * @param {string} filters.status - Filter by status
     * @param {string} filters.userId - Filter by user ID
     * @returns {Object} List of customers
     */
    async listCustomers(filters = {}) {
        try {
            // Use the client's getCustomers method with filters
            const response = await this.client.customers.getCustomers(filters);
            
            if (response.data) {
                const customers = response.data.data || response.data;
                const count = response.data.total || customers.length;
                
                return {
                    status: "success",
                    customers: customers.map(customer => ({
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
                    })),
                    count: count
                };
            } else {
                throw new Error('Failed to get customers via client');
            }
        } catch (error) {
            console.error('Error listing customers:', error);
            throw new Error(`Failed to list customers: ${error.message}`);
        }
    }

    /**
     * List all discount codes with optional filtering
     * @param {Object} filters - Optional filters
     * @param {boolean} filters.isActive - Filter by active status
     * @param {string} filters.createdBy - Filter by creator user ID
     * @returns {Object} List of discount codes
     */
    async listDiscountCodes(filters = {}) {
        try {
            const query = {};
            
            if (filters.isActive !== undefined) {
                query.isActive = filters.isActive;
            }
            
            if (filters.createdBy) {
                query.createdBy = filters.createdBy;
            }

            const discounts = await this.db.find(query).toArray();
            
            return {
                status: "success",
                discounts: discounts.map(discount => ({
                    id: discount._id,
                    discountId: discount.discountId,
                    name: discount.name,
                    code: discount.code,
                    type: discount.type,
                    value: discount.value,
                    currency: discount.currency,
                    maxUses: discount.maxUses,
                    currentUses: discount.currentUses,
                    expiresAt: discount.expiresAt,
                    isActive: discount.isActive,
                    createdAt: discount.createdAt
                })),
                count: discounts.length
            };
        } catch (error) {
            console.error('Error listing discount codes:', error);
            throw new Error(`Failed to list discount codes: ${error.message}`);
        }
    }

    /**
     * List all invoices with optional filtering
     * @param {Object} filters - Optional filters
     * @param {string} filters.customerId - Filter by customer ID
     * @param {string} filters.status - Filter by status
     * @param {string} filters.paymentStatus - Filter by payment status
     * @returns {Object} List of invoices
     */
    async listInvoices(filters = {}) {
        try {
            const query = {};
            
            if (filters.customerId) {
                query.customerId = filters.customerId;
            }
            
            if (filters.status) {
                query.status = filters.status;
            }
            
            if (filters.paymentStatus) {
                query.paymentStatus = filters.paymentStatus;
            }

            const invoices = await this.db.find(query).toArray();
            
            return {
                status: "success",
                invoices: invoices.map(invoice => ({
                    id: invoice._id,
                    invoiceId: invoice.invoiceId,
                    invoiceNumber: invoice.invoiceNumber,
                    customerId: invoice.customerId,
                    totalAmount: invoice.totalAmount,
                    currency: invoice.currency,
                    status: invoice.status,
                    paymentStatus: invoice.paymentStatus,
                    dueDate: invoice.dueDate,
                    createdAt: invoice.createdAt
                })),
                count: invoices.length
            };
        } catch (error) {
            console.error('Error listing invoices:', error);
            throw new Error(`Failed to list invoices: ${error.message}`);
        }
    }

    /**
     * Create loyalty points for a customer
     * @param {Object} loyaltyData - Loyalty data
     * @param {string} loyaltyData.customerId - Customer ID
     * @param {number} loyaltyData.totalAmount - Total amount spent
     * @param {string} loyaltyData.orderId - Order ID
     * @param {string} loyaltyData.invoiceId - Invoice ID
     * @param {string} loyaltyData.transactionId - Transaction ID
     * @returns {Object} Loyalty points result
     */
    async createLoyaltyPoints(loyaltyData) {
        if (!loyaltyData.customerId || !loyaltyData.totalAmount) {
            throw new Error('Customer ID and total amount are required');
        }

        try {
            // Use the client's loyalty.earnPointsFromPurchase method
            const response = await this.client.loyalty.earnPointsFromPurchase(loyaltyData);

            console.log(response);
            
            if (response.data) {
                this.db.insertOne({
                    customerId: loyaltyData.customerId,
                    totalAmount: loyaltyData.totalAmount,
                    orderId: loyaltyData.orderId,
                    invoiceId: loyaltyData.invoiceId,
                    transactionId: loyaltyData.transactionId,
                    pointsEarned: response.data.pointsEarned,
                    newBalance: response.data.newBalance,
                    newLevel: response.data.newLevel,
                    totalSpent: response.data.totalSpent
                });
                
                return {
                    status: "success",
                    loyalty: {
                        pointsEarned: response.data.pointsEarned,
                        newBalance: response.data.newBalance,
                        newLevel: response.data.newLevel,
                        totalSpent: response.data.totalSpent
                    }
                };
            } else {
                throw new Error('Failed to create loyalty points via client');
            }
        } catch (error) {
            console.error('Error creating loyalty points:', error);
            throw new Error(`Failed to create loyalty points: ${error.message}`);
        }
    }

    /**
     * Spend loyalty points for a customer
     * @param {Object} loyaltyData - Loyalty data
     * @param {string} loyaltyData.customerId - Customer ID
     * @param {number} loyaltyData.points - Points to spend
     * @returns {Object} Loyalty points result
     */
    async spendLoyaltyPoints(loyaltyData) {
        if (!loyaltyData.customerId || !loyaltyData.pointsToSpend) {
            throw new Error('Customer ID and points are required');
        }
        
        try {
            // Use the client's loyalty.spendPoints method
            const response = await this.client.loyalty.spendPointsForDiscount(loyaltyData);
            
            if (response && response.pointsSpent) {
                this.db.insertOne({
                    customerId: loyaltyData.customerId,
                    pointsSpent: response.pointsSpent,
                    remainingPoints: response.remainingPoints,
                    discountAmount: response.discountAmount,
                    message: response.message
                });
                return {
                    status: "success",
                    loyalty: {
                        pointsSpent: response.pointsSpent,
                        remainingPoints: response.remainingPoints,
                        discountAmount: response.discountAmount,
                        message: response.message
                    }
                };
            } else {
                throw new Error('Failed to spend loyalty points via client');
            }
        } catch (error) {
            console.error('Error spending loyalty points:', error);
            throw new Error(`Failed to spend loyalty points: ${error.message}`);
        }
    }

    /**
     * Get customer loyalty status
     * @param {string} customerId - Customer ID
     * @returns {Object} Loyalty status
     */
    async getCustomerLoyaltyStatus(customerId) {
        if (!customerId) {
            throw new Error('Customer ID is required');
        }

        try {
            // Use the client's loyalty.getCustomerLoyaltyStatus method
            const response = await this.client.loyalty.getCustomerLoyaltyStatus(customerId);
            
            if (response.data) {
                return {
                    status: "success",
                    loyaltyStatus: response.data
                };
            } else {
                throw new Error('Failed to get loyalty status via client');
            }
        } catch (error) {
            console.error('Error getting loyalty status:', error);
            throw new Error(`Failed to get loyalty status: ${error.message}`);
        }
    }

    /**
     * Create or update customer from engagement data
     * @param {Object} engagementData - Engagement customer data
     * @param {string} engagementData.customerId - External customer ID
     * @param {string} engagementData.accountId - Account ID
     * @param {string} engagementData.userId - User ID
     * @param {string} engagementData.email - Customer email
     * @param {string} engagementData.firstName - First name
     * @param {string} engagementData.lastName - Last name
     * @param {string} engagementData.company - Company name
     * @param {Object} engagementData.leadQualification - Lead qualification data
     * @returns {Object} Customer object
     */
    async createCustomerFromEngagement(engagementData) {
        if (!engagementData.customerId || !engagementData.accountId) {
            throw new Error('Customer ID and Account ID are required');
        }

        try {
            // Check if customer already exists
            let customer = await Customer.findByCustomerId(engagementData.customerId);
            
            if (!customer) {
                // Create new customer from engagement data
                customer = new Customer({
                    customerId: engagementData.customerId,
                    accountId: engagementData.accountId,
                    userId: engagementData.userId || null,
                    customerType: 'engagement',
                    source: 'webhook',
                    firstName: engagementData.firstName || '',
                    lastName: engagementData.lastName || '',
                    email: engagementData.email || '',
                    company: engagementData.company || '',
                    status: 'active',
                    lifecycleStage: 'prospect',
                    tags: ['engagement', 'webhook'],
                    metadata: engagementData.metadata || {}
                });

                // Set lead qualification if available
                if (engagementData.leadQualification) {
                    customer.leadQuality = engagementData.leadQualification.leadQuality || 'unknown';
                    customer.leadScore = engagementData.leadQualification.leadScore || 0;
                    customer.confidence = engagementData.leadQualification.confidence || 0;
                }
            } else {
                // Update existing customer with engagement data
                if (engagementData.firstName) customer.firstName = engagementData.firstName;
                if (engagementData.lastName) customer.lastName = engagementData.lastName;
                if (engagementData.email) customer.email = engagementData.email;
                if (engagementData.company) customer.company = engagementData.company;
                
                // Update lead qualification if available
                if (engagementData.leadQualification) {
                    customer.leadQuality = engagementData.leadQualification.leadQuality || customer.leadQuality;
                    customer.leadScore = engagementData.leadQualification.leadScore || customer.leadScore;
                    customer.confidence = engagementData.leadQualification.confidence || customer.confidence;
                }

                // Add engagement tag if not present
                if (!customer.tags.includes('engagement')) {
                    customer.addTag('engagement');
                }
            }

            // Save customer
            await customer.save();

            return {
                status: "success",
                customer: {
                    id: customer.id,
                    customerId: customer.customerId,
                    accountId: customer.accountId,
                    email: customer.email,
                    firstName: customer.firstName,
                    lastName: customer.lastName,
                    company: customer.company,
                    customerType: customer.customerType,
                    leadQuality: customer.leadQuality,
                    leadScore: customer.leadScore,
                    confidence: customer.confidence,
                    status: customer.status,
                    lifecycleStage: customer.lifecycleStage,
                    createdAt: customer.createdAt,
                    updatedAt: customer.updatedAt
                }
            };
        } catch (error) {
            console.error('Error creating customer from engagement:', error);
            throw new Error(`Failed to create customer from engagement: ${error.message}`);
        }
    }

    /**
     * Convert engagement customer to sales customer
     * @param {string} customerId - Customer ID to convert
     * @param {Object} salesData - Sales-specific data
     * @param {string} salesData.stripeCustomerId - Stripe customer ID
     * @param {Object} salesData.billingAddress - Billing address
     * @param {string} salesData.phone - Phone number
     * @returns {Object} Converted customer object
     */
    async convertToSalesCustomer(customerId, salesData) {
        if (!customerId || !salesData.stripeCustomerId) {
            throw new Error('Customer ID and Stripe Customer ID are required');
        }

        try {
            const customer = await Customer.findByCustomerId(customerId);
            if (!customer) {
                throw new Error('Customer not found');
            }

            // Convert customer type
            customer.customerType = 'sales';
            customer.source = 'conversion';
            customer.stripeCustomerId = salesData.stripeCustomerId;
            customer.billingAddress = salesData.billingAddress || customer.billingAddress;
            customer.phone = salesData.phone || customer.phone;
            customer.lifecycleStage = 'customer';
            
            // Update tags
            customer.removeTag('engagement');
            customer.addTag('sales');
            customer.addTag('converted');

            // Save changes
            await customer.save();

            return {
                status: "success",
                customer: {
                    id: customer.id,
                    customerId: customer.customerId,
                    stripeCustomerId: customer.stripeCustomerId,
                    email: customer.email,
                    firstName: customer.firstName,
                    lastName: customer.lastName,
                    phone: customer.phone,
                    billingAddress: customer.billingAddress,
                    customerType: customer.customerType,
                    lifecycleStage: customer.lifecycleStage,
                    status: customer.status,
                    updatedAt: customer.updatedAt
                }
            };
        } catch (error) {
            console.error('Error converting customer to sales:', error);
            throw new Error(`Failed to convert customer to sales: ${error.message}`);
        }
    }
}

export default SalesEnablement;