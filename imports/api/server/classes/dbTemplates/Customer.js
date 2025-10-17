import { Adapter, Core, Logger, Utilities, MongoId } from "@tmq-dev-ph/tmq-dev-core-server";

export class Customer {
    #id = "";
    #customerId = ""; // External customer ID from the service
    #accountId = ""; // Account ID associated with the customer
    #userId = ""; // Internal user ID who created/manages this customer
    #createdAt = 0;
    #updatedAt = 0;
    #lastEngagementAt = 0; // Last time customer engaged with the system

    // Customer type and source
    #customerType = "engagement"; // engagement, sales, stripe, etc.
    #source = "webhook"; // webhook, manual, import, api, etc.

    // Basic customer information
    #firstName = "";
    #lastName = "";
    #email = "";
    #phone = "";
    #company = "";
    #position = "";

    // Billing and payment information (for sales customers)
    #billingAddress = null;
    #stripeCustomerId = "";
    #paymentMethods = [];

    // Social media profiles
    #socialProfiles = {
        facebook: "",
        twitter: "",
        linkedin: "",
        instagram: "",
        youtube: ""
    };

    // Engagement tracking
    #engagementHistory = []; // Array of engagement events
    #totalEngagements = 0;
    #lastWebhookEvent = null; // Last webhook event processed for this customer

    // Lead qualification data
    #leadQuality = "unknown"; // unknown, low, medium, high, qualified
    #leadScore = 0; // Numeric score 0-100
    #confidence = 0; // Confidence level 0-1

    // Product preferences and recommendations
    #productPreferences = [];
    #recommendedProducts = [];

    // Tags and categorization
    #tags = [];
    #categories = [];
    #priority = 0.5; // Priority level 0-1

    // Status and lifecycle
    #status = "active"; // active, inactive, archived, converted
    #lifecycleStage = "prospect"; // prospect, lead, opportunity, customer, advocate

    // Metadata and custom fields
    #metadata = {};
    #customFields = {};

    #raw = false;

    constructor(doc, raw = false) {
        this.#parseDoc(doc);
        this.#raw = raw;
    }

    #parseDoc = (doc) => {
        if (doc) {
            if (doc._id) this.#id = doc._id;
            if (doc.customerId) this.#customerId = doc.customerId;
            if (doc.accountId) this.#accountId = doc.accountId;
            if (doc.userId) this.#userId = doc.userId;
            if (doc.createdAt) this.#createdAt = parseInt(doc.createdAt);
            if (doc.updatedAt) this.#updatedAt = parseInt(doc.updatedAt);
            if (doc.lastEngagementAt) this.#lastEngagementAt = parseInt(doc.lastEngagementAt);

            // Customer type and source
            if (doc.customerType) this.#customerType = doc.customerType;
            if (doc.source) this.#source = doc.source;

            // Basic information
            if (doc.firstName) this.#firstName = doc.firstName;
            if (doc.lastName) this.#lastName = doc.lastName;
            if (doc.email) this.#email = doc.email;
            if (doc.phone) this.#phone = doc.phone;
            if (doc.company) this.#company = doc.company;
            if (doc.position) this.#position = doc.position;

            // Billing and payment information
            if (doc.billingAddress) this.#billingAddress = doc.billingAddress;
            if (doc.stripeCustomerId) this.#stripeCustomerId = doc.stripeCustomerId;
            if (doc.paymentMethods && Array.isArray(doc.paymentMethods)) this.#paymentMethods = doc.paymentMethods;

            // Social profiles
            if (doc.socialProfiles) this.#socialProfiles = { ...this.#socialProfiles, ...doc.socialProfiles };

            // Engagement data
            if (doc.engagementHistory && Array.isArray(doc.engagementHistory)) this.#engagementHistory = doc.engagementHistory;
            if (doc.totalEngagements) this.#totalEngagements = parseInt(doc.totalEngagements);
            if (doc.lastWebhookEvent) this.#lastWebhookEvent = doc.lastWebhookEvent;

            // Lead qualification
            if (doc.leadQuality) this.#leadQuality = doc.leadQuality;
            if (doc.leadScore) this.#leadScore = parseInt(doc.leadScore);
            if (doc.confidence) this.#confidence = parseFloat(doc.confidence);

            // Product data
            if (doc.productPreferences && Array.isArray(doc.productPreferences)) this.#productPreferences = doc.productPreferences;
            if (doc.recommendedProducts && Array.isArray(doc.recommendedProducts)) this.#recommendedProducts = doc.recommendedProducts;

            // Categorization
            if (doc.tags && Array.isArray(doc.tags)) this.#tags = doc.tags;
            if (doc.categories && Array.isArray(doc.categories)) this.#categories = doc.categories;
            if (doc.priority) this.#priority = parseFloat(doc.priority);

            // Status
            if (doc.status) this.#status = doc.status;
            if (doc.lifecycleStage) this.#lifecycleStage = doc.lifecycleStage;

            // Metadata
            if (doc.metadata) this.#metadata = doc.metadata;
            if (doc.customFields) this.#customFields = doc.customFields;
        }
    };

    // Getters
    get id() { return this.#id; }
    get customerId() { return this.#customerId; }
    get accountId() { return this.#accountId; }
    get userId() { return this.#userId; }
    get createdAt() { return this.#createdAt; }
    get updatedAt() { return this.#updatedAt; }
    get lastEngagementAt() { return this.#lastEngagementAt; }
    get customerType() { return this.#customerType; }
    get source() { return this.#source; }
    get firstName() { return this.#firstName; }
    get lastName() { return this.#lastName; }
    get email() { return this.#email; }
    get phone() { return this.#phone; }
    get company() { return this.#company; }
    get position() { return this.#position; }
    get billingAddress() { return this.#billingAddress; }
    get stripeCustomerId() { return this.#stripeCustomerId; }
    get paymentMethods() { return [...this.#paymentMethods]; }
    get socialProfiles() { return { ...this.#socialProfiles }; }
    get engagementHistory() { return [...this.#engagementHistory]; }
    get totalEngagements() { return this.#totalEngagements; }
    get lastWebhookEvent() { return this.#lastWebhookEvent; }
    get leadQuality() { return this.#leadQuality; }
    get leadScore() { return this.#leadScore; }
    get confidence() { return this.#confidence; }
    get productPreferences() { return [...this.#productPreferences]; }
    get recommendedProducts() { return [...this.#recommendedProducts]; }
    get tags() { return [...this.#tags]; }
    get categories() { return [...this.#categories]; }
    get priority() { return this.#priority; }
    get status() { return this.#status; }
    get lifecycleStage() { return this.#lifecycleStage; }
    get metadata() { return { ...this.#metadata }; }
    get customFields() { return { ...this.#customFields }; }

    // Setters
    set customerId(value) { this.#customerId = value; }
    set accountId(value) { this.#accountId = value; }
    set userId(value) { this.#userId = value; }
    set customerType(value) { this.#customerType = value; }
    set source(value) { this.#source = value; }
    set firstName(value) { this.#firstName = value; }
    set lastName(value) { this.#lastName = value; }
    set email(value) { this.#email = value; }
    set phone(value) { this.#phone = value; }
    set company(value) { this.#company = value; }
    set position(value) { this.#position = value; }
    set billingAddress(value) { this.#billingAddress = value; }
    set stripeCustomerId(value) { this.#stripeCustomerId = value; }
    set leadQuality(value) { this.#leadQuality = value; }
    set leadScore(value) { this.#leadScore = parseInt(value) || 0; }
    set confidence(value) { this.#confidence = parseFloat(value) || 0; }
    set priority(value) { this.#priority = parseFloat(value) || 0.5; }
    set status(value) { this.#status = value; }
    set lifecycleStage(value) { this.#lifecycleStage = value; }

    // Methods to update social profiles
    updateSocialProfile(platform, value) {
        if (this.#socialProfiles.hasOwnProperty(platform)) {
            this.#socialProfiles[platform] = value;
        }
    }

    // Methods to manage tags and categories
    addTag(tag) {
        if (!this.#tags.includes(tag)) {
            this.#tags.push(tag);
        }
    }

    removeTag(tag) {
        this.#tags = this.#tags.filter(t => t !== tag);
    }

    addCategory(category) {
        if (!this.#categories.includes(category)) {
            this.#categories.push(category);
        }
    }

    removeCategory(category) {
        this.#categories = this.#categories.filter(c => c !== category);
    }

    // Methods to manage product preferences
    addProductPreference(product) {
        if (!this.#productPreferences.includes(product)) {
            this.#productPreferences.push(product);
        }
    }

    addRecommendedProduct(product) {
        if (!this.#recommendedProducts.includes(product)) {
            this.#recommendedProducts.push(product);
        }
    }

    // Methods to manage payment methods
    addPaymentMethod(paymentMethod) {
        if (!this.#paymentMethods.find(pm => pm.id === paymentMethod.id)) {
            this.#paymentMethods.push(paymentMethod);
        }
    }

    removePaymentMethod(paymentMethodId) {
        this.#paymentMethods = this.#paymentMethods.filter(pm => pm.id !== paymentMethodId);
    }

    setStripeCustomerId(stripeId) {
        this.#stripeCustomerId = stripeId;
        this.#customerType = "sales";
    }

    // Methods to track engagement
    addEngagementEvent(event) {
        const now = new Date().valueOf();
        this.#engagementHistory.push({
            ...event,
            timestamp: now
        });
        this.#totalEngagements++;
        this.#lastEngagementAt = now;
    }

    updateLastWebhookEvent(event) {
        this.#lastWebhookEvent = event;
        this.#lastEngagementAt = new Date().valueOf();
    }

    // Methods to update lead qualification
    updateLeadQualification(quality, score, confidence) {
        this.#leadQuality = quality;
        this.#leadScore = score;
        this.#confidence = confidence;
    }

    // Methods to manage metadata and custom fields
    setMetadata(key, value) {
        this.#metadata[key] = value;
    }

    getMetadata(key) {
        return this.#metadata[key];
    }

    setCustomField(key, value) {
        this.#customFields[key] = value;
    }

    getCustomField(key) {
        return this.#customFields[key];
    }

    // Utility methods
    getFullName() {
        if (this.#firstName && this.#lastName) {
            return `${this.#firstName} ${this.#lastName}`;
        }
        return this.#firstName || this.#lastName || 'Unknown';
    }

    getDisplayName() {
        if (this.#company && this.#firstName) {
            return `${this.#firstName} (${this.#company})`;
        }
        return this.getFullName();
    }

    isActive() {
        return this.#status === 'active';
    }

    isQualified() {
        return this.#leadQuality === 'qualified';
    }

    hasHighPriority() {
        return this.#priority >= 0.7;
    }

    // Sales-specific utility methods
    isSalesCustomer() {
        return this.#customerType === "sales";
    }

    isStripeCustomer() {
        return !!this.#stripeCustomerId;
    }

    hasBillingAddress() {
        return !!this.#billingAddress;
    }

    getBillingAddress() {
        return this.#billingAddress;
    }

    setBillingAddress(address) {
        this.#billingAddress = address;
    }

    toObject() {
        const retval = {
            customerId: this.#customerId,
            accountId: this.#accountId,
            userId: this.#userId,
            createdAt: this.#createdAt,
            updatedAt: this.#updatedAt,
            lastEngagementAt: this.#lastEngagementAt,
            customerType: this.#customerType,
            source: this.#source,
            firstName: this.#firstName,
            lastName: this.#lastName,
            email: this.#email,
            phone: this.#phone,
            company: this.#company,
            position: this.#position,
            billingAddress: this.#billingAddress,
            stripeCustomerId: this.#stripeCustomerId,
            paymentMethods: this.#paymentMethods,
            socialProfiles: this.#socialProfiles,
            engagementHistory: this.#engagementHistory,
            totalEngagements: this.#totalEngagements,
            lastWebhookEvent: this.#lastWebhookEvent,
            leadQuality: this.#leadQuality,
            leadScore: this.#leadScore,
            confidence: this.#confidence,
            productPreferences: this.#productPreferences,
            recommendedProducts: this.#recommendedProducts,
            tags: this.#tags,
            categories: this.#categories,
            priority: this.#priority,
            status: this.#status,
            lifecycleStage: this.#lifecycleStage,
            metadata: this.#metadata,
            customFields: this.#customFields
        };

        if (this.#id) retval.id = Utilities.toObjectId(this.#id, this.#raw);
        return retval;
    }

    toObjectLowerCase() {
        const obj = this.toObject();
        const lowerCaseObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                let newKey = key.toLowerCase();
                if (Array.isArray(obj[key])) {
                    newKey += 'List';
                }
                lowerCaseObj[newKey] = obj[key];
            }
        }
        return lowerCaseObj;
    }

    check() {
        if (!this.#customerId) {
            return Promise.reject(new Error("Customer ID is required"));
        }
        if (!this.#accountId) {
            return Promise.reject(new Error("Account ID is required"));
        }
        if (!this.#userId) {
            return Promise.reject(new Error("User ID is required"));
        }
        return Promise.resolve();
    }

    async validateDoc() {
        return await Core.getDB("customers", false).findOneAsync({ _id: Utilities.toObjectId({ _str: this.#id }) });
    }

    async save() {
        await this.check();
        const db = Core.getDB("customers", true);
        if (db) {
            const doc = this.toObject();
            const now = new Date().valueOf();

            if (this.#id) {
                // Update existing customer
                delete doc.createdAt;
                delete doc.id;
                doc.updatedAt = now;
                return await Core.getDB("customers", false).updateAsync(
                    { _id: Utilities.toObjectId({ _str: this.#id }) },
                    { $set: doc }
                );
            } else {
                // Insert new customer
                delete doc._id;
                doc.createdAt = now;
                doc.updatedAt = now;
                return db.insertOne(doc).then((res) => {
                    this.#id = res.insertedId.toString();
                    return res;
                });
            }
        }
        return Promise.reject(new Error("Database not found"));
    }

    // Static methods for finding customers
    static async findByCustomerId(customerId) {
        const db = Core.getDB("customers", false);
        if (db) {
            const doc = await db.findOneAsync({ customerId: customerId });
            return doc ? new Customer(doc) : null;
        }
        return null;
    }

    static async findByAccountId(accountId) {
        const db = Core.getDB("customers", false);
        if (db) {
            const docs = await db.findAsync({ accountId: accountId });
            return docs.map(doc => new Customer(doc));
        }
        return [];
    }

    static async findByEmail(email) {
        const db = Core.getDB("customers", false);
        if (db) {
            const doc = await db.findOneAsync({ email: email });
            return doc ? new Customer(doc) : null;
        }
        return null;
    }

    static async findByTags(tags) {
        const db = Core.getDB("customers", false);
        if (db) {
            const docs = await db.findAsync({ tags: { $in: tags } });
            return docs.map(doc => new Customer(doc));
        }
        return [];
    }

    static async findByLeadQuality(quality) {
        const db = Core.getDB("customers", false);
        if (db) {
            const docs = await db.findAsync({ leadQuality: quality });
            return docs.map(doc => new Customer(doc));
        }
        return [];
    }

    static async findByStatus(status) {
        const db = Core.getDB("customers", false);
        if (db) {
            const docs = await db.findAsync({ status: status });
            return docs.map(doc => new Customer(doc));
        }
        return [];
    }

    static async findHighPriorityCustomers() {
        const db = Core.getDB("customers", false);
        if (db) {
            const docs = await db.findAsync({ priority: { $gte: 0.7 } });
            return docs.map(doc => new Customer(doc));
        }
        return [];
    }

    static async findRecentEngagements(hours = 24) {
        const db = Core.getDB("customers", false);
        if (db) {
            const cutoffTime = new Date(Date.now() - (hours * 60 * 60 * 1000)).valueOf();
            const docs = await db.findAsync({ lastEngagementAt: { $gte: cutoffTime } });
            return docs.map(doc => new Customer(doc));
        }
        return [];
    }

    // Static methods for finding sales customers
    static async findByStripeCustomerId(stripeId) {
        const db = Core.getDB("customers", false);
        if (db) {
            const doc = await db.findOneAsync({ stripeCustomerId: stripeId });
            return doc ? new Customer(doc) : null;
        }
        return null;
    }

    static async findByCustomerType(customerType) {
        const db = Core.getDB("customers", false);
        if (db) {
            const docs = await db.findAsync({ customerType: customerType });
            return docs.map(doc => new Customer(doc));
        }
        return [];
    }

    static async findSalesCustomers() {
        return await Customer.findByCustomerType("sales");
    }

    static async findEngagementCustomers() {
        return await Customer.findByCustomerType("engagement");
    }
}
