import { Logger } from "@tmq-dev-ph/tmq-dev-core-server";
import axios from "axios";

export class Crawl {
    #crawlUrl = "";
    #chatUrl = "";
    #assistantId = "";
    constructor(settings) {
        if (settings && settings.crawlUrl)
            this.#crawlUrl = settings.crawlUrl;
        if (settings && settings.chatUrl)
            this.#chatUrl = settings.chatUrl;
        if (settings && settings.assistantId)
            this.#assistantId = settings.assistantId;
    }
    async crawl({ url, strategy = "trieve-crawl-kb", webhookUrl = "", waitForResult = true }) {
        const request = {
            "url": url,
            "strategy": strategy,
            "webhookUrl": webhookUrl,
            "waitForResult": waitForResult
        };
        try {
            const response = await axios.post(this.#crawlUrl, request, {
                headers: {
                    "Content-Type": "application/json"
                }
            });
            if (response.status === 200)
                return response.data;
            else
                throw new Error(response.statusText);
        } catch (error) {
            Logger.showError("Crawl error", error.message || error);
            throw new Error(error);
        }

    }
    async chat({ query, threadId }) {
        try {
            const request = {};
            if (threadId) request.threadId = threadId;
            if (query) request.query = query;
            else throw new Error("Query is required");
            request.assistantId = this.#assistantId;
            const response = await axios.post(this.#chatUrl, request, {
                headers: {
                    "Content-Type": "application/json"
                }
            });
            if (response.status === 200)
                return response.data;
            else
                throw new Error(response.statusText);
        } catch (error) {
            Logger.showError("Chat error", error.message || error);
            throw new Error(error);
        }
    }
}