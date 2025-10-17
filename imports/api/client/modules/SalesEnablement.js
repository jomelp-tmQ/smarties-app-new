import salesEnablement from '../../common/static_codegen/tmq/SalesEnablement_pb';

/**
 * Client-side SalesEnablement class that interfaces with SalesEnablementService
 * Uses hex values internally as defined in references.const
 * Handles protobuf serialization/deserialization
 */
class SalesEnablementClient {
    constructor(callFunction) {
        if (typeof callFunction !== 'function') {
            throw new Error('callFunction must be a function');
        }
        this.callFunction = callFunction;
    }

    // ===== CUSTOMER MANAGEMENT METHODS =====

    /**
     * Create a new customer
     * @param {Object} customerData - Customer data
     * @param {string} customerData.email - Customer email
     * @param {string} customerData.firstName - Customer first name
     * @param {string} customerData.lastName - Customer last name
     * @param {string} customerData.phone - Customer phone number
     * @param {Object} customerData.billingAddress - Billing address
     * @param {string} customerData.userId - User ID
     * @param {string} customerData.accountId - Account ID
     * @param {Object} customerData.metadata - Additional metadata
     * @returns {Promise<Object>} Created customer
     */
    async createCustomer(customerData) {
        // Create protobuf request
        const request = new salesEnablement.CustomerRequest();
        const billingAddress = customerData.billingAddress ? new salesEnablement.BillingAddress() : undefined;
        
        // Set the main request fields
        request.setEmail(customerData.email);
        request.setFirstname(customerData.firstName);
        request.setLastname(customerData.lastName);
        request.setPhone(customerData.phone);
        request.setUserid(customerData.userId);
        request.setMetadata(customerData.metadata ? new Uint8Array(Object.values(customerData.metadata)) : undefined);
        
        // Set billing address if provided
        if (billingAddress) {
            billingAddress.setLine1(customerData.billingAddress.line1);
            billingAddress.setLine2(customerData.billingAddress.line2);
            billingAddress.setCity(customerData.billingAddress.city);
            billingAddress.setState(customerData.billingAddress.state);
            billingAddress.setPostalcode(customerData.billingAddress.postalCode);
            billingAddress.setCountry(customerData.billingAddress.country);
            request.setBillingaddress(billingAddress);
        }

        // Send request
        const response = await this.callFunction(0x5f2e2388, request);
        
        // Deserialize response
        if (response && response.result) {
            const customerResponse = salesEnablement.CustomerResponse.deserializeBinary(response.result);
            const stringData = new TextDecoder().decode(customerResponse.getData());
            const objData = JSON.parse(stringData);
            return {
                success: customerResponse.getSuccess(),
                message: customerResponse.getMessage(),
                customer: objData
            };
        }
        
        return response;
    }

    /**
     * Update an existing customer
     * @param {string} customerId - Customer ID
     * @param {Object} updateData - Update data
     * @param {string} updateData.firstName - Customer first name
     * @param {string} updateData.lastName - Customer last name
     * @param {string} updateData.phone - Customer phone number
     * @param {Object} updateData.billingAddress - Billing address
     * @param {string} updateData.status - Customer status
     * @param {Object} updateData.metadata - Additional metadata
     * @returns {Promise<Object>} Updated customer
     */
    async updateCustomer(customerId, updateData) {
        // Create protobuf request
        const request = new salesEnablement.UpdateCustomerRequest();
        const billingAddress = updateData.billingAddress ? new salesEnablement.BillingAddress() : undefined;
        
        // Set the main request fields
        request.setCustomerid(customerId);
        request.setFirstname(updateData.firstName);
        request.setLastname(updateData.lastName);
        request.setPhone(updateData.phone);
        request.setStatus(updateData.status);
        request.setMetadata(updateData.metadata ? new Uint8Array(Object.values(updateData.metadata)) : undefined);
        
        // Set billing address if provided
        if (billingAddress) {
            billingAddress.setLine1(updateData.billingAddress.line1);
            billingAddress.setLine2(updateData.billingAddress.line2);
            billingAddress.setCity(updateData.billingAddress.city);
            billingAddress.setState(updateData.billingAddress.state);
            billingAddress.setPostalcode(updateData.billingAddress.postalCode);
            billingAddress.setCountry(updateData.billingAddress.country);
            request.setBillingaddress(billingAddress);
        }

        // Send request
        const response = await this.callFunction(0x3aa7ad76, request);
        
        // Deserialize response
        if (response && response.result) {
            const customerResponse = salesEnablement.CustomerResponse.deserializeBinary(response.result);
            const stringData = new TextDecoder().decode(customerResponse.getData());
            const objData = JSON.parse(stringData);
            return {
                success: customerResponse.getSuccess(),
                message: customerResponse.getMessage(),
                customer: objData
            };
        }
        
        return response;
    }

    /**
     * Get customer by ID
     * @param {string} customerId - Customer ID
     * @returns {Promise<Object>} Customer data
     */
    async getCustomer(customerId) {
        // Create protobuf request
        const request = new salesEnablement.GetCustomerRequest();
        request.setCustomerid(customerId);

        // Send request
        const response = await this.callFunction(0x50f24a26, request);
        
        // Deserialize response
        if (response && response.result) {
            const customerResponse = salesEnablement.CustomerResponse.deserializeBinary(response.result);
            const stringData = new TextDecoder().decode(customerResponse.getData());
            const objData = JSON.parse(stringData);
            return {
                success: customerResponse.getSuccess(),
                message: customerResponse.getMessage(),
                customer: objData
            };
        }
        
        return response;
    }

    /**
     * List customers with optional filtering
     * @param {Object} filters - Optional filters
     * @param {string} filters.status - Filter by status
     * @param {string} filters.userId - Filter by user ID
     * @returns {Promise<Object>} List of customers
     */
    async listCustomers(filters = {}) {
        // Create protobuf request
        const request = new salesEnablement.ListCustomersRequest();
        const customerFilters = new salesEnablement.CustomerFilters();
        
        // Set the filters
        customerFilters.setStatus(filters.status);
        customerFilters.setUserid(filters.userId);
        
        // Attach filters to request
        request.setFilters(customerFilters);

        // Send request
        const response = await this.callFunction(0x10339ec6, request);
        
        // Deserialize response
        if (response && response.result) {
            const listResponse = salesEnablement.ListCustomersResponse.deserializeBinary(response.result);
            const stringData = new TextDecoder().decode(listResponse.getData());
            const objData = JSON.parse(stringData);
            return {
                success: listResponse.getSuccess(),
                message: listResponse.getMessage(),
                customers: objData.customers,
                count: objData.count
            };
        }
        
        return response;
    }

    // ===== DISCOUNT CODE METHODS =====

    /**
     * Create a new discount code
     * @param {Object} discountData - Discount code data
     * @param {string} discountData.name - Discount name
     * @param {string} discountData.code - Discount code
     * @param {string} discountData.type - Discount type (percentage, fixed)
     * @param {number} discountData.value - Discount value
     * @param {string} discountData.currency - Currency code
     * @param {number} discountData.maxUses - Maximum uses
     * @param {Date} discountData.expiresAt - Expiration date
     * @param {number} discountData.minimumAmount - Minimum order amount
     * @param {string} discountData.userId - User ID
     * @param {Object} discountData.metadata - Additional metadata
     * @returns {Promise<Object>} Created discount code
     */
    async createDiscountCode(discountData) {
        // Create protobuf request
        const request = new salesEnablement.DiscountCodeRequest();
        request.setName(discountData.name);
        request.setCode(discountData.code);
        request.setType(discountData.type);
        request.setValue(discountData.value);
        request.setCurrency(discountData.currency);
        request.setMaxuses(discountData.maxUses);
        request.setExpiresat(discountData.expiresAt ? discountData.expiresAt.getTime() : undefined);
        request.setMinimumamount(discountData.minimumAmount);
        request.setUserid(discountData.userId);
        request.setMetadata(discountData.metadata ? new Uint8Array(Object.values(discountData.metadata)) : undefined);

        // Send request
        const response = await this.callFunction(0x9c71fb73, request);
        
        // Deserialize response
        if (response && response.result) {
            const discountResponse = salesEnablement.DiscountCodeResponse.deserializeBinary(response.result);

            const discountCodeData = discountResponse.getDiscount();

            return {
                success: discountResponse.getSuccess(),
                message: discountResponse.getMessage(),
                code: discountCodeData.getCode(),
                name: discountCodeData.getName(),
                type: discountCodeData.getType(),
                value: discountCodeData.getValue(),
                currency: discountCodeData.getCurrency(),
                maxUses: discountCodeData.getMaxuses(),
                currentUses: discountCodeData.getCurrentuses(),
                expiresAt: discountCodeData.getExpiresat(),
                minimumAmount: discountCodeData.getMinimumamount(),
                isActive: discountCodeData.getIsactive()
            };
        }
        
        return response;
    }

    /**
     * Update an existing discount code
     * @param {string} discountId - Discount code ID
     * @param {Object} updateData - Update data
     * @param {string} updateData.name - Discount name
     * @param {string} updateData.type - Discount type
     * @param {number} updateData.value - Discount value
     * @param {string} updateData.currency - Currency code
     * @param {number} updateData.maxUses - Maximum uses
     * @param {Date} updateData.expiresAt - Expiration date
     * @param {number} updateData.minimumAmount - Minimum order amount
     * @param {boolean} updateData.isActive - Active status
     * @param {Object} updateData.metadata - Additional metadata
     * @returns {Promise<Object>} Updated discount code
     */
    async updateDiscountCode(discountId, updateData) {
        // Create protobuf request
        const request = new salesEnablement.UpdateDiscountCodeRequest();
        request.setDiscountid(discountId);
        request.setName(updateData.name);
        request.setType(updateData.type);
        request.setValue(updateData.value);
        request.setCurrency(updateData.currency);
        request.setMaxuses(updateData.maxUses);
        request.setExpiresat(updateData.expiresAt ? updateData.expiresAt.getTime() : undefined);
        request.setMinimumamount(updateData.minimumAmount);
        request.setIsactive(updateData.isActive);
        request.setMetadata(updateData.metadata ? new Uint8Array(Object.values(updateData.metadata)) : undefined);

        // Send request
        const response = await this.callFunction(0xc6fa1ab8, request);
        
        // Deserialize response
        if (response && response.result) {
            const discountResponse = salesEnablement.DiscountCodeResponse.deserializeBinary(response.result);
            const stringData = new TextDecoder().decode(discountResponse.getData());
            const objData = JSON.parse(stringData);
            return {
                success: discountResponse.getSuccess(),
                message: discountResponse.getMessage(),
                discount: objData
            };
        }
        
        return response;
    }

    /**
     * Get discount code by ID
     * @param {string} discountId - Discount code ID
     * @returns {Promise<Object>} Discount code data
     */
    async getDiscountCode(discountId) {
        // Create protobuf request
        const request = new salesEnablement.GetDiscountCodeRequest();
        request.setDiscountid(discountId);

        // Send request
        const response = await this.callFunction(0xcbf1f268, request);
        
        // Deserialize response
        if (response && response.result) {
            const discountResponse = salesEnablement.DiscountCodeResponse.deserializeBinary(response.result);
            const stringData = new TextDecoder().decode(discountResponse.getData());
            const objData = JSON.parse(stringData);
            return {
                success: discountResponse.getSuccess(),
                message: discountResponse.getMessage(),
                discount: objData
            };
        }
        
        return response;
    }

    /**
     * List discount codes with optional filtering
     * @param {Object} filters - Optional filters
     * @returns {Promise<Object>} List of discount codes
     */
    async listDiscountCodes(filters = {}) {
        // Create protobuf request
        const request = new salesEnablement.ListDiscountCodesRequest();
        const discountFilters = new salesEnablement.DiscountCodeFilters();
        
        // Set the filters
        discountFilters.setIsactive(filters.isActive);
        discountFilters.setCreatedby(filters.createdBy);
        
        // Attach filters to request
        request.setFilters(discountFilters);

        // Send request
        const response = await this.callFunction(0xfa1cacee, request);
        
        // Deserialize response
        if (response && response.result) {
            const listResponse = salesEnablement.ListDiscountCodesResponse.deserializeBinary(response.result);
            const stringData = new TextDecoder().decode(listResponse.getData());
            const objData = JSON.parse(stringData);
            return {
                success: listResponse.getSuccess(),
                message: listResponse.getMessage(),
                discounts: objData.discounts,
                count: objData.count
            };
        }
        
        return response;
    }

    // ===== INVOICE METHODS =====

    /**
     * Create a new invoice
     * @param {Object} invoiceData - Invoice data
     * @param {string} invoiceData.customerId - Customer ID
     * @param {Array} invoiceData.products - Array of products
     * @param {number} invoiceData.totalAmount - Total amount
     * @param {string} invoiceData.currency - Currency code
     * @param {string} invoiceData.discountCode - Discount code
     * @param {number} invoiceData.discountAmount - Discount amount
     * @param {number} invoiceData.taxAmount - Tax amount
     * @param {Date} invoiceData.dueDate - Due date
     * @param {Object} invoiceData.billingAddress - Billing address
     * @param {string} invoiceData.userId - User ID
     * @param {Object} invoiceData.metadata - Additional metadata
     * @returns {Promise<Object>} Created invoice
     */
    async createInvoice(invoiceData) {
        // Create protobuf request
        const request = new salesEnablement.InvoiceRequest();
        const billingAddress = invoiceData.billingAddress ? new salesEnablement.BillingAddress() : undefined;
        
        // Set the main request fields
        request.setCustomerid(invoiceData.customerId);
        request.setTotalamount(invoiceData.totalAmount);
        request.setCurrency(invoiceData.currency);
        request.setDiscountcode(invoiceData.discountCode);
        request.setDiscountamount(invoiceData.discountAmount);
        request.setTaxamount(invoiceData.taxAmount);
        request.setDuedate(invoiceData.dueDate ? invoiceData.dueDate.getTime() : undefined);
        request.setUserid(invoiceData.userId);
        request.setMetadata(invoiceData.metadata ? new Uint8Array(Object.values(invoiceData.metadata)) : undefined);
        
        // Set products
        const products = invoiceData.products.map(product => {
            const productObj = new salesEnablement.Product();
            productObj.setId(product.id);
            productObj.setName(product.name);
            productObj.setDescription(product.description);
            productObj.setPrice(product.price);
            productObj.setQuantity(product.quantity);
            productObj.setSku(product.sku);
            return productObj;
        });
        request.setProducts(products);
        
        // Set billing address if provided
        if (billingAddress) {
            billingAddress.setLine1(invoiceData.billingAddress.line1);
            billingAddress.setLine2(invoiceData.billingAddress.line2);
            billingAddress.setCity(invoiceData.billingAddress.city);
            billingAddress.setState(invoiceData.billingAddress.state);
            billingAddress.setPostalcode(invoiceData.billingAddress.postalCode);
            billingAddress.setCountry(invoiceData.billingAddress.country);
            request.setBillingaddress(billingAddress);
        }

        // Send request
        const response = await this.callFunction(0x3c5653a9, request);
        
        // Deserialize response
        if (response && response.result) {
            const invoiceResponse = salesEnablement.InvoiceResponse.deserializeBinary(response.result);
            const stringData = new TextDecoder().decode(invoiceResponse.getData());
            const objData = JSON.parse(stringData);
            return {
                success: invoiceResponse.getSuccess(),
                message: invoiceResponse.getMessage(),
                invoice: objData
            };
        }
        
        return response;
    }

    /**
     * Update an existing invoice
     * @param {string} invoiceId - Invoice ID
     * @param {Object} updateData - Update data
     * @returns {Promise<Object>} Updated invoice
     */
    async updateInvoice(invoiceId, updateData) {
        // Create protobuf request
        const request = new salesEnablement.UpdateInvoiceRequest();
        
        // Set the main request fields
        request.setInvoiceid(invoiceId);
        request.setStatus(updateData.status);
        request.setPaymentstatus(updateData.paymentStatus);
        request.setSubtotalamount(updateData.subtotalAmount);
        request.setTotalamount(updateData.totalAmount);
        request.setTaxamount(updateData.taxAmount);
        
        // Set products if provided
        if (updateData.products) {
            const products = updateData.products.map(product => {
                const productObj = new salesEnablement.Product();
                productObj.setId(product.id);
                productObj.setName(product.name);
                productObj.setDescription(product.description);
                productObj.setPrice(product.price);
                productObj.setQuantity(product.quantity);
                productObj.setSku(product.sku);
                return productObj;
            });
            request.setProducts(products);
        }

        // Send request
        const response = await this.callFunction(0x5016bf1, request);
        
        // Deserialize response
        if (response && response.result) {
            const invoiceResponse = salesEnablement.InvoiceResponse.deserializeBinary(response.result);
            const stringData = new TextDecoder().decode(invoiceResponse.getData());
            const objData = JSON.parse(stringData);
            return {
                success: invoiceResponse.getSuccess(),
                message: invoiceResponse.getMessage(),
                invoice: objData
            };
        }
        
        return response;
    }

    /**
     * Get invoice by ID
     * @param {string} invoiceId - Invoice ID
     * @returns {Promise<Object>} Invoice data
     */
    async getInvoice(invoiceId) {
        // Create protobuf request
        const request = new salesEnablement.GetInvoiceRequest();
        request.setInvoiceid(invoiceId);

        // Send request
        const response = await this.callFunction(0xe0c6c9e0, request);
        
        // Deserialize response
        if (response && response.result) {
            const invoiceResponse = salesEnablement.InvoiceResponse.deserializeBinary(response.result);
            const stringData = new TextDecoder().decode(invoiceResponse.getData());
            const objData = JSON.parse(stringData);
            return {
                success: invoiceResponse.getSuccess(),
                message: invoiceResponse.getMessage(),
                invoice: objData
            };
        }
        
        return response;
    }

    /**
     * List invoices with optional filtering
     * @param {Object} filters - Optional filters
     * @returns {Promise<Object>} List of invoices
     */
    async listInvoices(filters = {}) {
        // Create protobuf request
        const request = new salesEnablement.ListInvoicesRequest();
        const invoiceFilters = new salesEnablement.InvoiceFilters();
        
        // Set the filters
        invoiceFilters.setCustomerid(filters.customerId);
        invoiceFilters.setStatus(filters.status);
        invoiceFilters.setPaymentstatus(filters.paymentStatus);
        
        // Attach filters to request
        request.setFilters(invoiceFilters);

        // Send request
        const response = await this.callFunction(0xd984d53, request);
        
        // Deserialize response
        if (response && response.result) {
            const listResponse = salesEnablement.ListInvoicesResponse.deserializeBinary(response.result);
            const stringData = new TextDecoder().decode(listResponse.getData());
            const objData = JSON.parse(stringData);
            return {
                success: listResponse.getSuccess(),
                message: listResponse.getMessage(),
                invoices: objData.invoices,
                count: objData.count
            };
        }
        
        return response;
    }

    // ===== LOYALTY POINTS METHODS =====

    /**
     * Create loyalty points for a customer
     * @param {Object} loyaltyData - Loyalty points data
     * @param {string} loyaltyData.customerId - Customer ID
     * @param {number} loyaltyData.totalAmount - Total order amount
     * @param {string} loyaltyData.orderId - Order ID
     * @param {string} loyaltyData.invoiceId - Invoice ID
     * @param {string} loyaltyData.transactionId - Transaction ID
     * @returns {Promise<Object>} Created loyalty points
     */
    async createLoyaltyPoints(loyaltyData) {
        // Create protobuf request
        const request = new salesEnablement.LoyaltyPointsRequest();
        request.setCustomerid(loyaltyData.customerId);
        request.setTotalamount(loyaltyData.totalAmount);
        request.setOrderid(loyaltyData.orderId);
        request.setInvoiceid(loyaltyData.invoiceId);
        request.setTransactionid(loyaltyData.transactionId);

        // Send request
        const response = await this.callFunction(0x358d8266, request);
        
        // Deserialize response
        if (response && response.result) {
            const loyaltyResponse = salesEnablement.LoyaltyPointsResponse.deserializeBinary(response.result);
            const stringData = new TextDecoder().decode(loyaltyResponse.getLoyalty());
            const objData = JSON.parse(stringData);
            return {
                success: loyaltyResponse.getSuccess(),
                message: loyaltyResponse.getMessage(),
                loyalty: objData
            };
        }
        
        return response;
    }

    /**
     * Spend loyalty points for a customer
     * @param {Object} loyaltyData - Loyalty data
     * @param {string} loyaltyData.customerId - Customer ID
     * @param {number} loyaltyData.points - Points to spend
     * @param {string} loyaltyData.orderId - Order ID
     * @param {string} loyaltyData.invoiceId - Invoice ID
     * @param {string} loyaltyData.transactionId - Transaction ID
     * @returns {Promise<Object>} Loyalty points result
     */
    async spendLoyaltyPoints(loyaltyData) {
        // Create protobuf request
        const request = new salesEnablement.LoyaltyPointsSpendRequest();
        request.setCustomerid(loyaltyData.customerId);
        request.setPointstospend(loyaltyData.points);
        request.setOrderid(loyaltyData.orderId);
        request.setInvoiceid(loyaltyData.invoiceId);
        request.setTransactionid(loyaltyData.transactionId);

        if (loyaltyData.points < 100) {
            return {
                success: false,
                message: "Points to spend must be greater than 100",
                loyalty: null
            };
        }

        // Send request
        const response = await this.callFunction(0xe4e2a953, request);
        
        // Deserialize response
        if (response && response.result) {
            const loyaltyResponse = salesEnablement.LoyaltyPointsResponse.deserializeBinary(response.result);
            const stringData = new TextDecoder().decode(loyaltyResponse.getLoyalty());
            const objData = JSON.parse(stringData);
            return {
                success: loyaltyResponse.getSuccess(),
                message: loyaltyResponse.getMessage(),
                loyalty: objData
            };
        }
        
        return response;
    }

    /**
     * Get customer loyalty status
     * @param {string} customerId - Customer ID
     * @returns {Promise<Object>} Customer loyalty status
     */
    async getCustomerLoyaltyStatus(customerId) {
        // Create protobuf request
        const request = new salesEnablement.CustomerLoyaltyStatusRequest();
        request.setCustomerid(customerId);

        // Send request
        const response = await this.callFunction(0x4e68b464, request);
        
        // Deserialize response
        if (response && response.result) {
            const loyaltyResponse = salesEnablement.CustomerLoyaltyStatusResponse.deserializeBinary(response.result);
            const stringData = new TextDecoder().decode(loyaltyResponse.getData());
            const objData = JSON.parse(stringData);
            return {
                success: loyaltyResponse.getSuccess(),
                message: loyaltyResponse.getMessage(),
                loyaltyStatus: objData.loyaltyStatus
            };
        }
        
        return response;
    }

    /**
     * Update customer loyalty points
     * @param {string} customerId - Customer ID
     * @param {Object} updateData - Update data
     * @returns {Promise<Object>} Updated loyalty points
     */
    async updateLoyaltyPoints(customerId, updateData) {
        // Create protobuf request
        const request = new salesEnablement.UpdateLoyaltyPointsRequest();
        request.setCustomerid(customerId);
        request.setPoints(updateData.points);
        request.setOperation(updateData.operation);
        request.setReason(updateData.reason);

        // Send request
        const response = await this.callFunction(0x396112bf, request);
        
        // Deserialize response
        if (response && response.result) {
            const loyaltyResponse = salesEnablement.LoyaltyPointsResponse.deserializeBinary(response.result);
            const stringData = new TextDecoder().decode(loyaltyResponse.getData());
            const objData = JSON.parse(stringData);
            return {
                success: loyaltyResponse.getSuccess(),
                message: loyaltyResponse.getMessage(),
                loyalty: objData
            };
        }
        
        return response;
    }

    // ===== PRODUCT METHODS =====

    /**
     * Add a new product
     * @param {Object} productData - Product data
     * @param {string} productData.name - Product name
     * @param {number} productData.price - Product price
     * @param {string} productData.currency - Currency code
     * @param {string} productData.description - Product description
     * @param {Array} productData.categories - Product categories
     * @param {Object} productData.metadata - Additional metadata
     * @returns {Promise<Object>} Created product
     */
    async addProduct(productData) {
        // Create protobuf request
        const request = new salesEnablement.ProductRequest();
        request.setName(productData.name);
        request.setDescription(productData.description);
        request.setPrice(productData.price);
        request.setCategory(productData.categories?.[0] || '');
        request.setSku(productData.sku);
        request.setInventory(productData.inventory || 0);

        // Send request
        const response = await this.callFunction(0xc5378f26, request);
        
        // Deserialize response
        if (response && response.result) {
            const productResponse = salesEnablement.SalesProductResponse.deserializeBinary(response.result);
            const stringData = new TextDecoder().decode(productResponse.getData());
            const objData = JSON.parse(stringData);
            return {
                success: productResponse.getSuccess(),
                message: productResponse.getMessage(),
                product: objData
            };
        }
        
        return response;
    }

    /**
     * Update an existing product
     * @param {string} productId - Product ID
     * @param {Object} updateData - Update data
     * @returns {Promise<Object>} Updated product
     */
    async updateProduct(productId, updateData) {
        // Create protobuf request
        const request = new salesEnablement.UpdateSalesProductRequest();
        request.setProductid(productId);
        request.setName(updateData.name);
        request.setDescription(updateData.description);
        request.setPrice(updateData.price);
        request.setCategory(updateData.category);
        request.setSku(updateData.sku);
        request.setInventory(updateData.inventory);

        // Send request
        const response = await this.callFunction(0x462e7818, request);
        
        // Deserialize response
        if (response && response.result) {
            const productResponse = salesEnablement.SalesProductResponse.deserializeBinary(response.result);
            const stringData = new TextDecoder().decode(productResponse.getData());
            const objData = JSON.parse(stringData);
            return {
                success: productResponse.getSuccess(),
                message: productResponse.getMessage(),
                product: objData
            };
        }
        
        return response;
    }

    /**
     * Delete a product
     * @param {string} productId - Product ID
     * @returns {Promise<Object>} Deletion result
     */
    async deleteProduct(productId) {
        // Create protobuf request
        const request = new salesEnablement.DeleteSalesProductRequest();
        request.setProductid(productId);

        // Send request
        const response = await this.callFunction(0x82cdc94, request);
        
        // Deserialize response
        if (response && response.result) {
            const productResponse = salesEnablement.SalesProductResponse.deserializeBinary(response.result);
            const stringData = new TextDecoder().decode(productResponse.getData());
            const objData = JSON.parse(stringData);
            return {
                success: productResponse.getSuccess(),
                message: productResponse.getMessage(),
                product: objData
            };
        }
        
        return response;
    }
}

export default SalesEnablementClient;
