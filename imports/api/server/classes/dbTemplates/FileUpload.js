import { Adapter, Core, Logger, Utilities, MongoId } from "@tmq-dev-ph/tmq-dev-core-server";
import { tmq as fileUpload } from "../../../common/static_codegen/tmq/fileUpload";
const { AllFiles } = fileUpload;

export class FileUpload {
    #id = "";
    #userId = "";
    #createdAt = 0;
    #updatedAt = 0;
    #name = "";
    #size = 0;
    #type = "";
    #path = "";
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
            if (doc.size) this.#size = parseInt(doc.size);
            if (doc.type) this.#type = doc.type;
            if (doc.path) this.#path = doc.path;
        }
    };
    toObject() {
        const retval = {
            userId: this.#userId,
            createdAt: this.#createdAt,
            updatedAt: this.#updatedAt,
            name: this.#name,
            size: this.#size,
            type: this.#type,
        };
        if (this.#id) retval.id = Utilities.toObjectId(this.#id, this.#raw);
        return retval;
    }
    toProto() {
        const parsed = new AllFiles();
        if (this.#userId) parsed.userId = this.#userId;
        if (this.#id) parsed.id = Utilities.toObjectId(this.#id, this.#raw);
        if (this.#createdAt) parsed.createdAt = this.#createdAt;
        if (this.#updatedAt) parsed.updatedAt = this.#updatedAt;
        if (this.#name) parsed.name = this.#name;
        if (this.#size) parsed.size = this.#size;
        if (this.#type) parsed.type = this.#type;
        if (this.#path) parsed.path = this.#path;
        return parsed;
    }
    check() {
        if (!this.#userId) {
            return Promise.reject(new Error("User ID is required"));
        }
        return Promise.resolve();
    }
    async save() {
        await this.check();
        const db = Core.getDB("mediaFiles", true);
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
};