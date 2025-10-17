import { RedisVent } from "@tmq-dev-ph/tmq-dev-core-server";

class RedisVentService extends RedisVent {
    constructor() {
        super();
    }
    get HelloWorld() { // sample event namespace
        this.setSpace("helloworld");
        return this;
    }
    get ChatCallback() {
        this.setSpace("chatCallback");
        return this;
    }
    get WebParseStatus() {
        this.setSpace("webParserStatus");
        return this;
    }
    get WebParseOutput() {
        this.setSpace("webParserOutput");
        return this;
    }
    get Inbox() {
        this.setSpace("inbox");
        return this;
    }
    get VoiceTranscript() {
        this.setSpace("voiceTranscript");
        return this;
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
    get WidgetConfig() {
        this.setSpace("widgetConfig");
        return this;
    }
    get Sessions() {
        this.setSpace("sessions");
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
export default new RedisVentService();