import { Mongo } from "meteor/mongo";
import { tmq as scrapeRequest } from "../../../common/static_codegen/tmq/scrapeRequest"; // Adjust the import path to your generated protobuf file

const { AllScrapeRequest, Body, Metadata, IpAddress, IpData, Response, ResponseBody } = scrapeRequest;

export const ScrapeRequestsCollection = new Mongo.Collection('scrapeRequests', {
    idGeneration: 'MONGO',
});

export class ScrapeRequestData {
    #id = "";
    #createdAt = 0;
    #status = "";
    #code = 0;
    #errorMsg = "";
    #body = null;
    #response = null;

    constructor(doc) {
        this.#parseDoc(doc);
    }

    #parseDoc = (doc) => {
        if (!doc) return;
        if (doc._id) this.#id = doc._id.toString();
        if (doc.createdAt) this.#createdAt = parseInt(doc.createdAt, 10);
        if (doc.status) this.#status = doc.status;
        if (doc.code) this.#code = doc.code;
        if (doc.errorMsg) this.#errorMsg = doc.errorMsg;
        if (doc.body) this.#body = doc.body;
        if (doc.response) this.#response = doc.response;
    }

    // [FIXED] This method now correctly returns the object
    toObject() {
        return {
            _id: this.#id,
            createdAt: this.#createdAt,
            status: this.#status,
            code: this.#code,
            errorMsg: this.#errorMsg,
            body: this.#body,
            response: this.#response,
        };
    }

    toProto() {
        const parsed = new AllScrapeRequest();

        const toStringId = (val) => {
            if (!val) return "";
            try {
                if (typeof val === "string") return val;
                if (val.toString) return val.toString();
            } catch (_) { /* noop */ }
            return `${val}`;
        };

        if (this.#id) parsed.id = toStringId(this.#id);
        if (this.#createdAt) parsed.createdAt = this.#createdAt;
        if (this.#status) parsed.status = this.#status;
        if (this.#code) parsed.code = this.#code;
        if (this.#errorMsg) parsed.errorMsg = this.#errorMsg;
        if (this.#body) {
            const bodyProto = new Body();
            if (this.#body.url) bodyProto.url = this.#body.url;
            if (this.#body.metadata) {
                const metadataProto = new Metadata();
                if (this.#body.metadata.consumerName) metadataProto.consumerName = this.#body.metadata.consumerName;
                if (this.#body.metadata.ipAddress && this.#body.metadata.ipAddress.data) {
                    const ipAddressProto = new IpAddress();
                    const ipDataProto = new IpData();
                    if (this.#body.metadata.ipAddress.data.ip) ipDataProto.ip = this.#body.metadata.ipAddress.data.ip;
                    ipAddressProto.data = ipDataProto;
                    metadataProto.ipAddress = ipAddressProto;
                }
                bodyProto.metadata = metadataProto;
            }
            parsed.body = bodyProto;
        }

        if (this.#response) {
            const responseProto = new Response();
            if (this.#response.status) responseProto.status = this.#response.status;
            if (this.#response.body) {
                const responseBodyProto = new ResponseBody();
                if (this.#response.body.message) responseBodyProto.message = this.#response.body.message;
                if (this.#response.body.assistantId) responseBodyProto.assistantId = this.#response.body.assistantId;
                responseProto.body = responseBodyProto;
            }
            parsed.response = responseProto;
        }

        return parsed;
    }

    // [FIXED] This method now correctly returns an array of ScrapeRequestData instances
    static async findAllByUserId(userId, lastBasis = null) {
        const query = {}; // Assuming you'll add userId here if needed, e.g., { userId }
        if (lastBasis) query.createdAt = { $lt: lastBasis };
        const docs = await ScrapeRequestsCollection.find(query).fetchAsync();
        // Use implicit return by removing the curly braces
        return docs.map(d => new ScrapeRequestData(d));
    }
}