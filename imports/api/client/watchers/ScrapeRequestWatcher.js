import core from "@tmq-dev-ph/tmq-dev-core-client";
import { Meteor } from "meteor/meteor";
import { Watcher2 } from "../Watcher2";
import Client from "../Client";
const { Adapter, Logger } = core;
import scrapeRequestService from "../../common/static_codegen/tmq/scrapeRequest_pb";
import { TOAST_STYLE } from "../../common/const";
import { toast } from 'sonner';
import { Mongo } from "meteor/mongo";
import RedisventService from "../redisvent/RedisventService";

Adapter.Meteor = Meteor;
Adapter.Mongo = Mongo;

class ScrapeRequestWatcher extends Watcher2 {
    #data;
    #lastBasis;
    #processes = {};
    #searchQuery = "";
    #listen = null;

    constructor(parent) {
        super(parent);

        // INITIALIZATION
        // Prepare the client-side collection and listener
        RedisventService.ScrapeRequest.prepareCollection("scrapeRequest");
        this.#data = RedisventService.ScrapeRequest.getCollection("scrapeRequest");
        this.listen();
    }

    /**
     * @returns {Mongo.Collection} The local collection of scrape requests.
     */
    get DB() {
        return this.#data;
    }

    /**
     * @returns {Array} All scrape requests from the local collection, sorted by creation date.
     */
    get ScrapeRequests() {
        return this.DB.find({}, { sort: { createdat: -1 } }).fetch() || [];
    }

    /**
     * Fetches all scrape requests from the server, with support for searching and pagination.
     * @param {Object} [options] - Fetching options.
     * @param {boolean} [options.isLoadmore=false] - If true, fetches the next page of results.
     */
    async fetchAllScrapeRequests({ isLoadmore = false } = {}) {
        try {
            if (!isLoadmore) {
                // For a new search or initial load, clear local data and reset pagination
                this.#data.remove({});
                this.#lastBasis = null;
            }

            if (this.#processes["fetchScrapeRequests"]) return;
            this.#processes["fetchScrapeRequests"] = true;
            this.setValue("isLoadingScrapeRequests", true);

            const req = new scrapeRequestService.FetchScrapeRequest();
            req.setSearchquery(this.#searchQuery || "");
            if (this.#lastBasis) {
                req.setLastbasis(this.#lastBasis);
            }
            req.setUserid(Client.CurrentUser._id);

            // NOTE: Replace 0x_YOUR_FETCH_HASH_HERE_ with the actual hash for your 'fetchScrapeRequests' RPC method.
            return this.Parent.callFunc(0x478e5e0b, req).then(({ err, result }) => {
                if (err) {
                    toast.error('Failed to fetch scrape requests', { style: TOAST_STYLE.ERROR });
                    return;
                }
                const deserialized = scrapeRequestService.FetchScrapeResponse.deserializeBinary(result);
                const res = deserialized.toObject();
                const data = res.scraperequestList; // Note: protobuf generates 'List' suffix and lowercase field names
                console.log(data);
                const lastBasis = res.lastbasis;

                this.#lastBasis = lastBasis;

                if (data && data.length) {
                    data.forEach(item => {
                        // Assuming 'id' or a unique field exists for upserting
                        this.DB.upsert({ _id: item.id }, { $set: item });
                    });
                }
                this.activateWatch();
            }).finally(() => {
                this.#processes["fetchScrapeRequests"] = false;
                this.setValue("isLoadingScrapeRequests", false);
            });
        } catch (error) {
            this.setValue("isLoadingScrapeRequests", false);
            Logger.showError("Failed to fetch scrape requests", error);
            toast.error('An error occurred while fetching scrape requests', {
                style: TOAST_STYLE.ERROR
            });
        }
    }

    /**
     * Sets the search query and triggers a new fetch.
     * @param {string} query - The search term.
     */
    searchScrapeRequests(query) {
        this.#searchQuery = query;
        this.fetchAllScrapeRequests();
    }

    /**
     * Listens for real-time updates from the server via RedisVent.
     */
    listen() {
        if (!this.#listen && Client.CurrentUser) {
            this.#listen = RedisventService.Scraper.listen("scrapeRequest", Client.CurrentUser._id, ({ event, data }) => {
                switch (event) {
                    case "remove":
                        this.DB.remove({ _id: data._id });
                        break;
                    case "insert":
                        this.DB.upsert({ _id: data._id }, { $set: data.data });
                        break;
                    case "update":
                        const updateData = data.data;
                        const docId = data._id;
                        delete updateData._id; // Ensure _id is not in the $set object
                        this.DB.update(
                            { _id: docId },
                            { $set: updateData }
                        );
                        break;
                    default:
                        Logger.showLog("Unknown scrape request event", event);
                        break;
                }
                this.activateWatch();
            });
        }
    }

    /**
     * Removes the RedisVent listener to prevent memory leaks.
     */
    removeListener() {
        if (this.#listen) {
            RedisventService.Scraper.remove(this.#listen);
            this.#listen = null;
        }
    }
}

export default new ScrapeRequestWatcher(Client);