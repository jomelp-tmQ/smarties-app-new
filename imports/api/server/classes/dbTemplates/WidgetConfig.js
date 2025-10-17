import { Adapter, Core, Utilities, MongoId } from "@tmq-dev-ph/tmq-dev-core-server";
import { tmq as widget } from "../../../common/static_codegen/tmq/widgetConfig";
const { AllWidgetConfig } = widget;

export class WidgetConfig {
    #id = "";
    #userId = "";
    #createdAt = 0;
    #updatedAt = 0;
    #name = "";
    #widgetUrl = "";
    #siteId = "";
    #secret = "";
    #assistantIdCall = "";
    #assistantIdLlm = "";
    #domains = [];
    #keywords = [];
    #raw = false;
    constructor(doc, raw = false) {
        this.#parseDoc(doc);
        this.#raw = raw;
    }
    #parseDoc = (doc) => {
        if (doc) {
            if (doc.userId) this.#userId = doc.userId;
            if (doc._id) this.#id = doc._id;
            if (doc.createdAt) this.#createdAt = parseInt(doc.createdAt);
            if (doc.updatedAt) this.#updatedAt = parseInt(doc.updatedAt);
            if (doc.name) this.#name = doc.name;
            if (doc.widgetUrl) this.#widgetUrl = doc.widgetUrl;
            if (doc.siteId) this.#siteId = doc.siteId;
            if (doc.secret) this.#secret = doc.secret;
            if (doc.assistantIdCall) this.#assistantIdCall = doc.assistantIdCall;
            if (doc.assistantIdLlm) this.#assistantIdLlm = doc.assistantIdLlm;
            if (doc.domains && Array.isArray(doc.domains)) this.#domains = doc.domains;
            if (doc.keywords && Array.isArray(doc.keywords)) this.#keywords = doc.keywords;
        }
    };
    toObject() {
        const retval = {
            userId: this.#userId,
            createdAt: this.#createdAt,
            updatedAt: this.#updatedAt,
            name: this.#name,
            widgetUrl: this.#widgetUrl,
            siteId: this.#siteId,
            secret: this.#secret,
            assistantIdCall: this.#assistantIdCall,
            assistantIdLlm: this.#assistantIdLlm,
            domains: this.#domains,
            keywords: this.#keywords,
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

    toProto() {
        const parsed = new AllWidgetConfig();
        if (this.#userId) parsed.userId = this.#userId;
        if (this.#id) parsed.id = Utilities.toObjectId(this.#id, this.#raw);
        if (this.#createdAt) parsed.createdAt = this.#createdAt;
        if (this.#updatedAt) parsed.updatedAt = this.#updatedAt;
        if (this.#name) parsed.name = this.#name;
        if (this.#widgetUrl) parsed.widgetUrl = this.#widgetUrl;
        if (this.#siteId) parsed.siteId = this.#siteId;
        if (this.#secret) parsed.secret = this.#secret;
        if (this.#assistantIdCall) parsed.assistantIdCall = this.#assistantIdCall;
        if (this.#assistantIdLlm) parsed.assistantIdLlm = this.#assistantIdLlm;
        if (this.#domains && this.#domains.length > 0) {
            this.#domains.forEach(domain => {
                parsed.domains.push(domain);
            });
        }
        return parsed;
    }
    check() {
        if (!this.#userId) {
            return Promise.reject(new Error("User ID is required"));
        }
        if (!this.#name) {
            return Promise.reject(new Error("Widget name is required"));
        }
        if (!this.#siteId) {
            return Promise.reject(new Error("Site ID is required"));
        }
        if (!this.#assistantIdCall) {
            return Promise.reject(new Error("Assistant ID for call is required"));
        }
        if (!this.#assistantIdLlm) {
            return Promise.reject(new Error("Assistant ID for LLM is required"));
        }
        return Promise.resolve();
    }

    async validateDoc() {
        return await Core.getDB("widgetConfig", false).findOneAsync({ _id: Utilities.toObjectId({ _str: this.#id }) });
    }

    async save() {
        await this.check();
        const db = Core.getDB("widgetConfig", true);
        if (db) {
            const doc = this.toObject();
            if (this.#id) {
                delete doc.createdAt;
                delete doc.id;
                return await Core.getDB("widgetConfig", false).updateAsync({ _id: Utilities.toObjectId({ _str: this.#id }) }, { $set: doc });
            } else {
                delete doc._id;
                return db.insertOne(doc).then((res) => {
                    this.#id = res.insertedId.toString();
                    return res;
                });
            }
        }
        return Promise.reject(new Error("Database not found"));
    }
    static findOne(query, options = {}) {
        return Core.getDB("widgetConfig", false).findOneAsync(query, options);
    }
};