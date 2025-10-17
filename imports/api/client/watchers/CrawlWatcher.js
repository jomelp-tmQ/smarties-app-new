import core from "@tmq-dev-ph/tmq-dev-core-client";
import { Meteor } from "meteor/meteor";
import { Watcher2 } from "../Watcher2";
import Client from "../Client";
const { Adapter, Logger } = core;
import crawlService from "../../common/static_codegen/tmq/crawl_pb";
import { TOAST_STYLE } from "../../common/const";
import { toast } from 'sonner';
import { Mongo } from "meteor/mongo";
import RedisventService from "../redisvent/RedisventService";


const { CrawlRequest, FetchCrawlRequestsRequest, FetchCrawlRequestsResponse, FetchCrawlPagesRequest, FetchCrawlPagesResponse, UpdateCrawlPagesRequest } = crawlService;

Adapter.Meteor = Meteor;
Adapter.Mongo = Mongo;


const Pages = [
    { id: '9cf8063bfda03314d5b7bc2c1', url: "sample1.com/about", status: "pending" },
    { id: '9cf8063bfda03314d5b7bc2c2', url: "sample2.com/home", status: "pending" },
    { id: '9cf8063bfda03314d5b7bc2c3', url: "sample3.com/info", status: "pending" },
    { id: '9cf8063bfda03314d5b7bc2c4', url: "sample4.com/howto", status: "pending" },
    { id: '9cf8063bfda03314d5b7bc2c5', url: "sample5.com/any", status: "pending" },
];

export const CRAWL_FORM = {
    URL: "url",
    MAX_PAGES: "maxPages",
    DEPTH: "depth",
    UPDATe_INTERVAL: "updateInterval",
    STATUS: "status",
};

export const CRAWL_STATE = {
    SELECTED_CRAWL: "selectedCrawl",
    LOADING: "loading"
};

class CrawlWatcher extends Watcher2 {
    #data;
    #lastBasis;
    #processes = {};
    #searchQuery = "";
    #searchPagesQuery = "";
    #lastPagesBasis = null;
    #listen = null;
    #spaces = { CRAWL: 'crawlapp' };
    #collections = { CRAWL: 'crawl' };
    #pages = new Mongo.Collection(null);
    #url = new Mongo.Collection(null);
    constructor(parent) {
        super(parent);
        this.listen();
    }

    get Url() {
        return this.#url.find({}).fetch();
    }

    get Pages() {
        const query = {};
        if (this.getValue(CRAWL_STATE.SELECTED_CRAWL)) {
            query.crawlId = this.getValue(CRAWL_STATE.SELECTED_CRAWL);
        }
        return this.#pages.find(query).fetch();
    }

    setSelectedUrl(id = null) {
        this.setValue(CRAWL_STATE.SELECTED_CRAWL, id);
        if (!this.getValue(CRAWL_STATE.SELECTED_CRAWL)) return;
        this.#lastBasis = null;
        this.#lastPagesBasis = null;
        this.#searchQuery = "";
        this.#searchPagesQuery = "";
        setImmediate(() => this.fetchCrawlPages());
    }
    setLoading(loading) {
        this.setValue(CRAWL_STATE.LOADING, loading);
    }

    listen() {
        if (!Client.CurrentUser?._id) {
            setTimeout(() => {
                this.listen();
            }, 1000);
            return;
        }
        if (!this.crawlSubscription)
            this.crawlSubscription = RedisventService.Crawl.listen("crawl", Client.CurrentUser._id, ({ event, data }) => {
                delete data.data._id;
                switch (event) {
                    case "insert":
                        this.#url.upsert({ id: data.data.id }, { $set: data.data });
                        break;
                    case "upsert":
                        this.#url.upsert({ id: data.data.id }, { $set: data.data });
                        break;
                }
                this.activateWatch();
            });
        if (!this.crawlPagesSubscription)
            this.crawlPagesSubscription = RedisventService.CrawlPages.listen("crawlPages", Client.CurrentUser._id, ({ event, data }) => {
                delete data.data._id;
                switch (event) {
                    case "insert":
                        this.#pages.upsert({ id: data.data.id }, { $set: data.data });
                        break;
                    case "upsert":
                        this.#pages.upsert({ id: data.data.id }, { $set: data.data });
                        break;
                }
                this.activateWatch();
            });
    }

    formValidation({ url, maxPages, depth, updateInterval }) {
        const urlPattern = /^(https?:\/\/)?([\w-]+(\.[\w-]+)+)(\/[\w-./?%&=]*)?$/;
        if (!url || !urlPattern.test(url)) {
            this.setValue(CRAWL_FORM.STATUS, { status: "fail", message: "Invalid URL format." });
            return false;
        }
        if (isNaN(maxPages) || maxPages <= 0) {
            this.setValue(CRAWL_FORM.STATUS, { status: "fail", message: "Max Pages must be a positive number." });
            return false;
        }
        if (isNaN(depth) || depth < 0) {
            this.setValue(CRAWL_FORM.STATUS, { status: "fail", message: "Depth must be a non-negative number." });
            return false;
        }
        if (!updateInterval || updateInterval == "") {
            this.setValue(CRAWL_FORM.STATUS, { status: "fail", message: "Update Interval must be not empty." });
            return false;
        }
        return true;


    }

    submitCrawlForm(e) {
        e.preventDefault();
        const url = this.getValue(CRAWL_FORM.URL);
        const maxPages = parseInt(this.getValue(CRAWL_FORM.MAX_PAGES));
        const depth = parseInt(this.getValue(CRAWL_FORM.DEPTH));
        const updateInterval = this.getValue(CRAWL_FORM.UPDATe_INTERVAL);

        try {
            const validateData = this.formValidation({ url, maxPages, depth, updateInterval });
            if (!validateData) return;

            this.crawlerRequest({ url, maxPages, depth, updateInterval });
        } catch (error) {
            Logger.showError("CrawlWatcher.submitCrawlForm", error);
            toast.error("Form validation failed.", {
                style: TOAST_STYLE.ERROR,
            });
            return;
        }
    }

    crawlerRequest({ url, maxPages, depth, updateInterval }) {
        const request = new CrawlRequest();
        request.setDepth(depth);
        request.setMaxPages(maxPages);
        request.setUrl(url);
        request.setUserid(Client.CurrentUser._id);
        Client.callFunc(0x8bea0b6d, request).then(({ err, result }) => {
            if (err) {
                this.setValue(CRAWL_FORM.STATUS, { status: "fail", message: err.message || err || "Crawl request failed." });
                return;
            }
            this.activateWatch();
            this.setValue(CRAWL_FORM.STATUS, {});
        }).catch((err) => {
            this.setValue(CRAWL_FORM.STATUS, { status: "fail", message: err.message || err || "Crawl request failed." });
        });
    }
    fetchCrawlRequests() {
        const request = new FetchCrawlRequestsRequest();
        request.setUserid(Client.CurrentUser._id);
        request.setSearchquery(this.#searchQuery);
        request.setLastbasis(this.#lastBasis);
        Client.callFunc(0x398ad7ee, request).then(({ err, result }) => {
            const response = FetchCrawlRequestsResponse.deserializeBinary(result);
            const data = response.getCrawlrequestsList().map(item => item.toObject());
            const lastBasis = response.getLastbasis();
            this.#lastBasis = lastBasis;
            if (data && data.length) {
                data.forEach(item => {
                    this.#url.upsert({ id: item.id }, { $set: item });
                });
            }
            this.activateWatch();
        });
    }
    fetchCrawlPages() {
        this.setValue(CRAWL_STATE.LOADING, true);
        try {
            const request = new FetchCrawlPagesRequest();
            const selectedCrawl = this.getValue(CRAWL_STATE.SELECTED_CRAWL);
            if (!selectedCrawl) return;
            request.setUserid(Client.CurrentUser._id);
            request.setCrawlid(selectedCrawl);
            request.setSearchquery(this.#searchPagesQuery);
            request.setLastbasis(this.#lastPagesBasis);
            Client.callFunc(0xb5e2b386, request).then(({ err, result }) => {
                const response = FetchCrawlPagesResponse.deserializeBinary(result);
                const data = response.getCrawlpagesList().map(item => item.toObject());
                const lastBasis = response.getLastbasis();
                this.#lastPagesBasis = lastBasis;
                if (data && data.length) {
                    data.forEach(item => {
                        this.#pages.upsert({ id: item.id }, { $set: item });
                    });
                }
                // this.activateWatch();
                this.setValue(CRAWL_STATE.LOADING, false);
            });
        } catch (err) {
            Logger.showError('fetchCrawlPages Error', err);
            this.setValue(CRAWL_STATE.LOADING, false);
        }
    }
    updateCrawlPages(id, active) {
        const request = new UpdateCrawlPagesRequest();
        request.setUserid(Client.CurrentUser._id);
        request.setId(id);
        request.setActive(active);
        Client.callFunc(0xde40c364, request).then(({ err, result }) => {
            if (err) {
                toast.error("Failed to update crawl pages.", {
                    style: TOAST_STYLE.ERROR,
                });
            } else {
                this.#pages.update({ _id: id }, { $set: { active: active } });
                this.activateWatch();
            }
        }).catch((err) => {
            toast.error("Failed to update crawl pages.", {
                style: TOAST_STYLE.ERROR,
            });
        });
    }
}

export default new CrawlWatcher(Client);