import { Adapter, Core, Logger, Utilities, MongoId } from "@tmq-dev-ph/tmq-dev-core-server";
import { tmq as billing } from "../../../common/static_codegen/tmq/customBilling";
const { Invoice } = billing;

export class InvoicesData {
    #userId = "";
    #id = "";
    #invoiceId = "";
    #amountDue = 0;
    #amountPaid = 0;
    #currency = "";
    #status = "";
    #customerId = "";
    #invoiceUrl = "";
    #invoicePdf = "";
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
            if (doc.invoiceId) this.#invoiceId = doc.invoiceId;
            if (doc.amountDue) this.#amountDue = parseFloat(doc.amountDue);
            if (doc.amountPaid) this.#amountPaid = parseFloat(doc.amountPaid);
            if (doc.currency) this.#currency = doc.currency;
            if (doc.status) this.#status = doc.status;
            if (doc.customerId) this.#customerId = doc.customerId;
            if (doc.invoiceUrl) this.#invoiceUrl = doc.invoiceUrl;
            if (doc.invoicePdf) this.#invoicePdf = doc.invoicePdf;
            if (doc.createdAt) this.#createdAt = parseInt(doc.createdAt);
            if (doc.updatedAt) this.#updatedAt = parseInt(doc.updatedAt);
        }
    };
    toObject() {
        const retval = {
            userId: this.#userId,
            invoiceId: this.#invoiceId,
            amountDue: this.#amountDue,
            amountPaid: this.#amountPaid,
            currency: this.#currency,
            status: this.#status,
            customerId: this.#customerId,
            invoiceUrl: this.#invoiceUrl,
            invoicePdf: this.#invoicePdf,
            createdAt: this.#createdAt,
            updatedAt: this.#updatedAt,
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
        const parsed = new Invoice();
        if (this.#userId) parsed.userId = this.#userId;
        if (this.#id) parsed.id = Utilities.toObjectId(this.#id, this.#raw);
        if (this.#invoiceId) parsed.invoiceId = this.#invoiceId;
        if (this.#amountDue) parsed.amountDue = this.#amountDue;
        if (this.#amountPaid) parsed.amountPaid = this.#amountPaid;
        if (this.#currency) parsed.currency = this.#currency;
        if (this.#status) parsed.status = this.#status;
        if (this.#customerId) parsed.customerId = this.#customerId;
        if (this.#invoiceUrl) parsed.invoiceUrl = this.#invoiceUrl;
        if (this.#invoicePdf) parsed.invoicePdf = this.#invoicePdf;
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
        const db = Core.getDB("invoices", this.#raw);
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