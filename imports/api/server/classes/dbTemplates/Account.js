import { Adapter, Core, Logger, Utilities, MongoId } from "@tmq-dev-ph/tmq-dev-core-server";
import { tmq as assistant } from "../../../common/static_codegen/tmq/assistant";
const { AllAssistants } = assistant;

export class AccountData {
    #id = "";
    #userId = "";
    #createdAt = 0;
    #updatedAt = 0;
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
        }
    };
    toObject() {
        const retval = {
            userId: this.#userId,
            createdAt: this.#createdAt,
            updatedAt: this.#updatedAt,
        };
        if (this.#id) retval.id = Utilities.toObjectId(this.#id, this.#raw);
        return retval;
    }
    toProto() {
        const parsed = new AllAssistants();
        if (this.#userId) parsed.userId = this.#userId;
        if (this.#id) parsed.id = Utilities.toObjectId(this.#id, this.#raw);
        if (this.#createdAt) parsed.createdAt = this.#createdAt;
        if (this.#updatedAt) parsed.updatedAt = this.#updatedAt;

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
        const db = Core.getDB("users", true);
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