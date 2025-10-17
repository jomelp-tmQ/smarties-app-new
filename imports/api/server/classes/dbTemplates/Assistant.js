import { Adapter, Core, Logger, Utilities, MongoId } from "@tmq-dev-ph/tmq-dev-core-server";
import { tmq as assistant } from "../../../common/static_codegen/tmq/assistant";
const { AllAssistants, Model, Voice, Transcriber, KnowledgeBase, Tool } = assistant;
import { Struct } from "google-protobuf/google/protobuf/struct_pb.js";
import { Mongo } from "meteor/mongo";
import { isValidObjectIdString } from "../db/helper";

export const AssistantsCollection = new Mongo.Collection('assistants', {
    idGeneration: 'MONGO', // keeps _id as ObjectId to match your schemas
});


export class AssistantData {
    #id = "";
    #userId = "";
    #businessId = "";
    #createdAt = 0;
    #updatedAt = 0;
    #name = "";
    #assistantId = "";
    #assistantIdLlm = "";
    #voiceObj = null; // { provider, voiceId, name }
    #modelObj = null; // { provider, model }
    #metadata = null;
    #description = "";
    #firstMessage = "";
    #systemMessage = "";
    #serverUrl = "";
    #transcriber = null; // { provider, model, language, smartFormat }
    #serverMessages = [];
    #tools = [];
    #knowledgeBase = null; // { provider, id }
    #raw = false;
    /**
     * 
     * @param {assistant.AssistantRequest} doc 
     * @param {boolean} raw 
     */
    constructor(doc, raw = false) {
        this.#parseDoc(doc);
        this.#raw = raw;
    }
    #parseDoc = (doc) => {
        if (!doc) return;
        if (doc.userId) this.#userId = doc.userId;
        if (doc.businessId) this.#businessId = typeof doc.businessId === "string" ? doc.businessId : (doc.businessId.toString ? doc.businessId.toString() : `${doc.businessId}`);
        if (doc._id) this.#id = doc._id;
        if (doc.createdAt) this.#createdAt = parseInt(doc.createdAt);
        if (doc.updatedAt) this.#updatedAt = parseInt(doc.updatedAt);
        if (doc.name) this.#name = doc.name;
        if (doc.assistantId) this.#assistantId = doc.assistantId;
        if (doc.assistantIdLlm) this.#assistantIdLlm = doc.assistantIdLlm;
        if (doc.voice && typeof doc.voice === "object") this.#voiceObj = { provider: doc.voice.provider || "", voiceId: doc.voice.voiceId || "", name: doc.voice.name || "" };
        if (doc.voiceObj && typeof doc.voiceObj === "object") this.#voiceObj = { provider: doc.voiceObj.provider || "", voiceId: doc.voiceObj.voiceId || "", name: doc.voiceObj.name || "" };
        if (doc.model && typeof doc.model === "object") this.#modelObj = { provider: doc.model.provider || "", model: doc.model.model || "" };
        if (doc.modelObj && typeof doc.modelObj === "object") this.#modelObj = { provider: doc.modelObj.provider || "", model: doc.modelObj.model || "" };
        if (doc.metadata && typeof doc.metadata === "object") this.#metadata = doc.metadata;
        if (doc.description) this.#description = doc.description;
        if (doc.firstMessage) this.#firstMessage = doc.firstMessage;
        if (doc.systemMessage) this.#systemMessage = doc.systemMessage;
        if (doc.serverUrl) this.#serverUrl = doc.serverUrl;
        if (doc.transcriber && typeof doc.transcriber === "object") {
            this.#transcriber = {
                provider: doc.transcriber.provider || "",
                model: doc.transcriber.model || "",
                language: doc.transcriber.language || "",
                smartFormat: (typeof doc.transcriber.smartFormat === "boolean") ? doc.transcriber.smartFormat : (String(doc.transcriber.smartFormat).toLowerCase() === "true")
            };
        }
        if (Array.isArray(doc.serverMessages)) this.#serverMessages = doc.serverMessages;
        if (Array.isArray(doc.tools)) this.#tools = doc.tools;
        if (doc.knowledgeBase && typeof doc.knowledgeBase === "object") {
            this.#knowledgeBase = {
                provider: doc.knowledgeBase.provider || "",
                id: doc.knowledgeBase.id || ""
            }
        };
    }
    toObject() {
        const retval = {
            _id: this.#id,
            userId: this.#userId,
            businessId: typeof this.#businessId === "string" ? this.#businessId : (this.#businessId ? this.#businessId.toString() : ""),
            createdAt: this.#createdAt,
            updatedAt: this.#updatedAt,
            name: this.#name,
            assistantId: this.#assistantId,
            assistantIdLlm: this.#assistantIdLlm,
        };
        if (this.#voiceObj) retval.voice = { provider: this.#voiceObj.provider || "", voiceId: this.#voiceObj.voiceId || "", name: this.#voiceObj.name || "" };
        if (this.#modelObj) retval.model = { provider: this.#modelObj.provider || "", model: this.#modelObj.model || "" };
        if (this.#metadata) retval.metadata = this.#metadata;
        if (this.#description) retval.description = this.#description;
        if (this.#firstMessage) retval.firstMessage = this.#firstMessage;
        if (this.#systemMessage) retval.systemMessage = this.#systemMessage;
        if (this.#serverUrl) retval.serverUrl = this.#serverUrl;
        if (this.#transcriber) retval.transcriber = this.#transcriber;
        if (this.#serverMessages && this.#serverMessages.length > 0) retval.serverMessages = this.#serverMessages;
        if (this.#tools && this.#tools.length > 0) retval.tools = this.#tools;
        if (this.#knowledgeBase) retval.knowledgeBase = this.#knowledgeBase;
        return retval;
    }
    toProto() {
        const parsed = new AllAssistants();

        const toStringId = (val) => {
            if (!val) return "";
            try {
                if (typeof val === "string") return val;
                if (val.toString) return val.toString();
            } catch (_) { /* noop */ }
            return `${val}`;
        };

        if (this.#id) parsed.id = toStringId(this.#id);
        if (this.#userId) parsed.userId = this.#userId;
        if (this.#businessId) parsed.businessId = this.#businessId;
        if (this.#createdAt) parsed.createdAt = this.#createdAt;
        if (this.#updatedAt) parsed.updatedAt = this.#updatedAt;
        if (this.#name) parsed.name = this.#name;
        if (this.#assistantId) parsed.assistantId = this.#assistantId;
        if (this.#assistantIdLlm) parsed.assistantIdLlm = this.#assistantIdLlm;

        if (this.#voiceObj) {
            const v = new Voice();
            if (this.#voiceObj.provider) v.provider = this.#voiceObj.provider;
            if (this.#voiceObj.voiceId) v.voiceId = this.#voiceObj.voiceId;
            if (this.#voiceObj.name) v.name = this.#voiceObj.name;
            parsed.voice = v;
        }

        if (this.#modelObj) {
            const m = new Model();
            if (this.#modelObj.provider) m.provider = this.#modelObj.provider;
            if (this.#modelObj.model) m.model = this.#modelObj.model;
            parsed.model = m;
        }

        if (this.#metadata) {
            try {
                const struct = Struct.fromJavaScript ? Struct.fromJavaScript(this.#metadata) : null;
                if (struct) parsed.metadata = struct;
            } catch (e) {
                Logger.showError("Failed to convert metadata to Struct", e);
            }
        }

        if (this.#description) parsed.description = this.#description;
        if (this.#firstMessage) parsed.firstMessage = this.#firstMessage;
        if (this.#systemMessage) parsed.systemMessage = this.#systemMessage;
        if (this.#serverUrl) parsed.serverUrl = this.#serverUrl;

        if (this.#transcriber) {
            const tr = new Transcriber();
            if (this.#transcriber.provider) tr.provider = this.#transcriber.provider;
            if (this.#transcriber.model) tr.model = this.#transcriber.model;
            if (this.#transcriber.language) tr.language = this.#transcriber.language;
            tr.smartFormat = !!this.#transcriber.smartFormat;
            parsed.transcriber = tr;
        }

        if (Array.isArray(this.#serverMessages) && this.#serverMessages.length > 0) {
            this.#serverMessages.forEach((m) => {
                if (typeof m === "string") parsed.serverMessages.push(m);
                else parsed.serverMessages.push(JSON.stringify(m));
            });
        }

        if (this.#knowledgeBase) {
            const kb = this.#knowledgeBase;
            const kbm = new KnowledgeBase();
            if (kb.provider) kbm.provider = kb.provider;
            if (kb.id) kbm.id = kb.id;
            parsed.knowledgeBase = kbm;
        }

        if (Array.isArray(this.#tools) && this.#tools.length > 0) {
            this.#tools.forEach((t) => {
                const tm = new Tool();
                if (t.type) tm.type = t.type;
                if (t.function) {
                    try {
                        const fStruct = Struct.fromJavaScript ? Struct.fromJavaScript(t.function) : null;
                        if (fStruct) tm.function = fStruct;
                    } catch (_) { /* noop */ }
                }
                parsed.tools.push(tm);
            });
        }

        return parsed;
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
        if (!this.#userId) return Promise.reject(new Error("User ID is required"));
        if (!this.#name) return Promise.reject(new Error("Assistant name is required"));
        if (!this.#assistantId) return Promise.reject(new Error("Assistant ID is required"));
        if (!this.#assistantIdLlm) return Promise.reject(new Error("Assistant ID for LLM is required"));
        if (!(this.#voiceObj && this.#voiceObj.provider)) return Promise.reject(new Error("Voice provider is required"));
        if (!(this.#voiceObj && this.#voiceObj.voiceId)) return Promise.reject(new Error("Voice ID is required"));
        if (!(this.#modelObj && this.#modelObj.provider)) return Promise.reject(new Error("Model provider is required"));
        if (!(this.#modelObj && this.#modelObj.model)) return Promise.reject(new Error("Model is required"));
        return Promise.resolve();
    }
    async save() {
        await this.check();
        const doc = this.toObject();
        if (this.#id)
            return AssistantsCollection.updateAsync({ _id: Utilities.toObjectId(this.#id, this.#raw) }, { $set: doc }, { upsert: true });
        else {
            delete doc._id;
            return AssistantsCollection.insertAsync(doc).then((res) => {
                this.#id = res._str;
                return res;
            });
        }
    }
    /**
     * Find an assistant by user ID
     * @param {String} userId 
     * @returns {Promise<AssistantData>}
     */
    static async findByUserId(userId) {
        const doc = await AssistantsCollection.findOneAsync({ userId });
        return doc ? new AssistantData(doc) : null;
    }
    /**
     * Find assistants by business ID
     * @param {String} businessId 
     * @returns {Promise<AssistantData[]>}
     */
    static async findByBusinessId(businessId) {
        const docs = await AssistantsCollection.find({ businessId }).fetchAsync();
        return docs.map(d => new AssistantData(d));
    }
    /**
     * Find all assistants by user ID
     * @param {String} userId 
     * @param {Number} lastBasis 
     * @returns {Promise<AssistantData[]>}
     */
    static async findAllByUserId(userId, lastBasis = null) {
        const query = { userId };
        if (lastBasis) query.createdAt = { $lt: lastBasis };
        const docs = await AssistantsCollection.find(query).fetchAsync();
        return docs.map(d => new AssistantData(d));
    }
    static async findAllByName(businessId, name, lastBasis = null) {
        if (typeof businessId === "object") businessId = businessId._str;
        const query = { businessId };
        if (name && name.trim()) query.name = name.trim().toLowerCase();
        if (lastBasis) query.createdAt = { $lt: lastBasis };
        console.log("query", query);
        const docs = await AssistantsCollection.find(query).fetchAsync();
        return docs.map(d => new AssistantData(d));
    }
    static async findByAssistantId(assistantId) {
        const doc = await AssistantsCollection.findOneAsync({ assistantId });
        return doc ? new AssistantData(doc) : null;
    }
    static async update(assistantId, data) {
        try {
            const doc = await AssistantsCollection.findOneAsync({ assistantId });
            if (!doc) return null;
            await AssistantsCollection.updateAsync({ assistantId }, { $set: data });
            const updated = await AssistantsCollection.findOneAsync({ assistantId });
            return updated ? new AssistantData(updated) : null;
        } catch (error) {
            console.error('❌ AssistantData.update() failed:', {
                error: error.message,
                code: error.code,
                errInfo: error.errInfo,
                document: data
            });
            throw error;
        }

    }
};