import { Adapter, Core, Logger, Utilities, MongoId } from "@tmq-dev-ph/tmq-dev-core-server";
import { tmq as knowledge } from "../../../common/static_codegen/tmq/knowledgeBase";
const { AllKnowledgeBase, File, Url } = knowledge;
import Server from "../../Server";
import axios from "axios";

export class KnowledgeBaseFile {
    #collectionId = "";
    #userId = "";
    #collectionName = "";
    #id = "";
    #createdAt = 0;
    #updatedAt = 0;
    #files = [];
    #keywords = [];
    #raw = false;
    #urls = [];
    constructor(doc, raw = false) {
        this.#parseDoc(doc);
        this.#raw = raw;
    }
    #parseDoc = (doc) => {
        if (doc) {
            if (doc.collectionId) this.#collectionId = doc.collectionId;
            if (doc.userId) this.#userId = doc.userId;
            if (doc.collectionName) this.#collectionName = doc.collectionName;
            if (doc._id) this.#id = doc._id;
            if (doc.createdAt) this.#createdAt = parseInt(doc.createdAt);
            if (doc.updatedAt) this.#updatedAt = parseInt(doc.updatedAt);
            if (doc.files) this.#files = doc.files;
            if (doc.keywords && Array.isArray(doc.keywords)) this.#keywords = doc.keywords;
            if (doc.urls) this.#urls = doc.urls;
        }
    };
    toObject() {
        const retval = {
            collectionId: this.#collectionId,
            userId: this.#userId,
            collectionName: this.#collectionName,
            createdAt: this.#createdAt,
            updatedAt: this.#updatedAt,
            files: this.#files,
            keywords: this.#keywords,
            urls: this.#urls,
        };
        if (this.#id) retval.id = Utilities.toObjectId(this.#id, this.#raw);
        return retval;
    }
    toProto() {
        try {
            const { logger: baseLogger } = require('../../utils/serverUtils.js');
            const logger = baseLogger.child({ service: 'dbTemplates/KnowledgeBase.js' });
            logger.debug('KnowledgeBase.toProto', { urlsCount: Array.isArray(this.#urls) ? this.#urls.length : 0 });
        } catch (_) { }
        const parsed = new AllKnowledgeBase();
        if (this.#collectionId) parsed.collectionId = this.#collectionId;
        if (this.#userId) parsed.userId = this.#userId;
        if (this.#collectionName) parsed.collectionName = this.#collectionName;
        if (this.#id) parsed.id = Utilities.toObjectId(this.#id, this.#raw);
        if (this.#createdAt) parsed.createdAt = this.#createdAt;
        if (this.#updatedAt) parsed.updatedAt = this.#updatedAt;
        if (this.#files && this.#files.length > 0) {
            this.#files.forEach(file => {
                if (!file.url) {
                    const fileProto = new File();
                    if (file.id) fileProto.id = file.id;
                    if (file.name) fileProto.name = file.name;
                    if (file.title) fileProto.name = file.title;
                    if (file.url) fileProto.url = file.url;
                    parsed.files.push(fileProto);
                }
            });
        }
        if (this.#urls && this.#urls.length > 0) {
            this.#urls.forEach(url => {
                const urlProto = new Url();
                if (url.id) urlProto.id = url.id;
                if (url.url) urlProto.url = url.url;
                parsed.urls.push(urlProto);
            });
        }
        return parsed;
    }
    check() {
        if (!this.#collectionId) {
            return Promise.reject(new Error("Collection ID is required"));
        }
        if (!this.#userId) {
            return Promise.reject(new Error("User ID is required"));
        }
        if (!this.#collectionName) {
            return Promise.reject(new Error("Collection name is required"));
        }
        return Promise.resolve();
    }
    async save() {
        await this.check();
        const db = Core.getDB("knowledgeBase", this.#raw);
        if (db) {
            const doc = this.toObject();
            if (this.#id)
                return db.updateOne({ _id: Utilities.toObjectId(this.#id, this.#raw) }, { $set: doc }, { upsert: true });
            else {
                delete doc._id;
                return db.insertOne(doc).then((res) => {
                    this.#id = res.insertedId.toString();
                    return res;
                });
            }
        }
        return Promise.reject(new Error("Database not found"));
    }
    static async sendToIngest({ businessId, fileId, url, meta }) {
        const endpoint = Server.Config?.knowledgeBase?.serverUrl;
        if (!endpoint) {
            return Promise.reject(new Error("Knowledge base server URL not found"));
        }
        let data = JSON.stringify({
            "businessId": businessId,
            "fileId": fileId,
            "url": url,
            "meta": meta,
            "config": {
                "strategy": "tokens",
                "param": 512
            },
            "embedModel": "text-embedding-3-small",
            "embedVer": 1,
            "isActive": true
        });

        let config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: endpoint,
            headers: {
                'Content-Type': 'application/json'
            },
            data: data
        };
        return axios.request(config);
    }
    static async addKb({ userId, collectionId, files, urls }) {
        return Core.getDB("knowledgeBase", true).updateOne({ collectionId: collectionId, userId: userId }, { $set: { files: files, urls: urls } });
    }
    static async findById({ collectionId, userId }) {
        return Core.getDB("knowledgeBase", true).findOne({ collectionId: collectionId, userId: userId });
    }
};