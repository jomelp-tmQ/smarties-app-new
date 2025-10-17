import { RedisVent, Adapter } from "@tmq-dev-ph/tmq-dev-core-client";
import { Vent } from "meteor/cultofcoders:redis-oplog";
import { Random } from "meteor/random";

Adapter.Vent = Vent;
Adapter.Random = Random;

class RedisventService extends RedisVent {
    constructor() {
        super();
    }
    get Assistant() {
        this.setSpace("assistant");
        return this;
    }

    get Tool() {
        this.setSpace("tool");
        return this;
    }

    get KnowledgeBase() {
        this.setSpace("KnowledgeBase");
        return this;
    }

    get Files() {
        this.setSpace("files");
        return this;
    }

    get WidgetConfig() {
        this.setSpace("widgetConfig");
        return this;
    }

    get Invoices() {
        this.setSpace("invoices");
        return this;
    }
    get Sessions() {
        this.setSpace("sessions");
        return this;
    }
    get ScrapeRequest() {
        this.setSpace("scrapeRequest");
        return this;
    }
    get Crawl() {
        this.setSpace("crawl");
        return this;
    }
    get CrawlPages() {
        this.setSpace("crawlPages");
        return this;
    }
}

export default new RedisventService();