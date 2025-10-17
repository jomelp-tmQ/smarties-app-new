import core from "@tmq-dev-ph/tmq-dev-core-client";
import { Watcher2 } from "../Watcher2";
import Client from "../Client";
import widgetConfigService from "../../common/static_codegen/tmq/widgetConfig_pb";
import { Mongo } from "meteor/mongo";
import { toast } from "sonner";
import { TOAST_STYLE } from "../../common/const";
import WidgetClientManager from "@tmq-justin/widget-client";
import RedisventService from "../redisvent/RedisventService";
import WebsiteVerifierClient from "website-validator-client";

const { Adapter, Logger } = core;

Adapter.Meteor = Meteor;
Adapter.Accounts = Accounts;
Adapter.Mongo = Mongo;

class WidgetWatcher extends Watcher2 {
    #data;
    #lastBasis;
    #processes = {};
    #websiteVerifierClient = null;
    #listen = null;
    constructor(parent) {
        super(parent);
        RedisventService.WidgetConfig.prepareCollection("widgetConfig");
        this.#data = RedisventService.WidgetConfig.getCollection("widgetConfig");
        this.initWebsiteVerifierClient();
    }

    get DB() {
        return this.#data;
    }

    get Widget() {
        return this.DB.find({}, { sort: { createdat: -1 } }).fetch() || [];
    }

    initWebsiteVerifierClient() {
        if (this.#websiteVerifierClient) return;
        const config = Client.Settings.websiteVerifier;
        if (!config) {
            toast.error('Website verifier is not set', {
                style: TOAST_STYLE.ERROR
            });
            return;
        }
        this.#websiteVerifierClient = new WebsiteVerifierClient({
            serverUrl: config.serverUrl || 'http://localhost:6800',
            apiKey: config.apiKey || 'your-client-api-key-change-in-production',
        });
    }

    isValidUUIDv4(str) {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
    }

    sanitizeInput(data) {
        const sanitized = {};

        // Sanitize and validate name
        if (typeof data.name === 'string') {
            sanitized.name = data.name.trim().replace(/[^\w\s\-]/g, '').substring(0, 100);
        }

        // Sanitize and validate domain
        if (Array.isArray(data.domain)) {
            sanitized.domain = data.domain
                .filter(d => typeof d === 'string')
                .map(d => d.trim().toLowerCase())
                .filter(d => {
                    // Allow localhost and IP addresses
                    if (/^(localhost|127\.0\.0\.1)(:\d{1,5})?$/.test(d)) {
                        return true;
                    }
                    // More flexible domain validation that allows numbers in subdomains
                    // Must end with a valid TLD (2+ letters) and can have multiple subdomains with numbers
                    return /^[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?)*\.[a-z]{2,}(:\d{1,5})?$/.test(d);
                });
        }

        // Validate assistantId (UUID v4)
        if (typeof data.assistantId === 'string') {
            sanitized.assistantId = data.assistantId.trim();
        }

        // Validate assistantidllm
        if (typeof data.assistantidllm === 'string' && /^AS_[a-zA-Z0-9]{5,}$/.test(data.assistantidllm.trim())) {
            sanitized.assistantidllm = data.assistantidllm.trim();
        }

        // Ensure all required fields are present and valid
        const missingFields = [];
        if (!sanitized.name) missingFields.push('name');
        if (!sanitized.domain || sanitized.domain.length === 0) missingFields.push('domain');
        if (!sanitized.assistantId) missingFields.push('assistantId');
        if (!sanitized.assistantidllm) missingFields.push('assistantidllm');

        if (missingFields.length > 0) {
            throw new Error(`Invalid or missing fields: ${missingFields.join(', ')}`);
        }

        return sanitized;
    }

    //#[x] @szyrelle add loading state
    /**
     * 
     * @param {{name: string, domain: string[], assistantId: string, assistantidllm: string}} data 
     * @returns 
     */
    async createWidgetConfig(data) {
        try {
            const sanitizedData = this.sanitizeInput(data);
            if (this.#processes["createWidgetConfig"]) return;
            this.setValue("isLoadingCreation", true);
            this.#processes["createWidgetConfig"] = true;
            const req = new widgetConfigService.WidgetConfigRequest();
            req.setUserid(Client.CurrentUser._id);
            req.setAssistantid(sanitizedData.assistantId);
            req.setName(sanitizedData.name);
            req.setDomainList(sanitizedData.domain);
            req.setAssistantidllm(sanitizedData.assistantidllm);
            return this.Parent.callFunc(0x62cb6156, req).then(({ result, err }) => {
                if (err) {
                    toast.error(err.message, {
                        style: TOAST_STYLE.ERROR
                    });
                    return false;
                }
                const deserialized = widgetConfigService.WidgetConfigResponse.deserializeBinary(result);
                if (deserialized.getSuccess()) {
                    toast.success('Widget Configuration created successfully', {
                        style: TOAST_STYLE.SUCCESS
                    });
                    return deserialized.getSuccess();
                }
            }).catch((err) => {
                toast.error(err.message, {
                    style: TOAST_STYLE.ERROR
                });
            }).finally(() => {
                this.#processes["createWidgetConfig"] = false;
                this.setValue("isLoadingCreation", false);
                this.setValue("showPopUp", false);
            });
        } catch (error) {
            this.setValue("isLoadingCreation", false);
            this.#processes["createWidgetConfig"] = false;

            // Show more specific error message for validation errors
            const errorMessage = error.message && error.message.includes('Invalid or missing fields')
                ? error.message
                : 'Failed to create widget configuration';

            toast.error(errorMessage, {
                style: TOAST_STYLE.ERROR
            });
            return false;
        }
    }

    async fetchWidgetConfig({ isLoadmore = false, searchQuery = null } = {}) { //#[x] @szyrelle add loading state
        try {
            if (!Accounts.userId()) {
                return [];
            }

            if (!isLoadmore) {
                this.#data.remove({});
                this.#lastBasis = null;
            }

            if (this.#processes["fetchtWidgetConfig"]) return;
            this.#processes["fetchtWidgetConfig"] = true;
            const req = new widgetConfigService.FetchWidgetConfigRequest();
            req.setUserid(Accounts.userId());

            if (isLoadmore && this.#lastBasis) {
                req.setLastbasis(this.#lastBasis);
            }

            if (searchQuery) {
                req.setSearchquery(searchQuery);
            }

            const { result } = await this.Parent.callFunc(0xc21c51a7, req);
            const deserialized = widgetConfigService.FetchWidgetConfigResponse.deserializeBinary(result);
            const res = deserialized.toObject();
            const data = res.widgetconfigsList;
            const lastBasis = res.lastbasis;
            this.#lastBasis = lastBasis;
            if (data && data.length) {
                data.forEach(item => {
                    this.DB.upsert({ id: item.id }, { $set: item });
                });
            }
            this.#processes["fetchtWidgetConfig"] = false;
            this.setValue("isLoadingWidget", false);
            return this.Widget;
        } catch (error) {
            Logger.showError("WidgetWatcher.fetchWidgetConfig", error);
            toast.error('Failed to fetch Widget Config', {
                style: TOAST_STYLE.ERROR
            });
        }
    }

    updateWidgetConfig(data) {
        try {
            if (!Accounts.userId()) {
                return [];
            }
            if (this.#processes["updateWidgetConfig"]) return;
            this.setValue("isLoadingUpdate", true);
            this.#processes["updateWidgetConfig"] = true;
            const req = new widgetConfigService.UpdateWidgetConfigRequest();
            req.setUserid(Accounts.userId());
            req.setId(data.id);
            req.setName(data.name);
            req.setWidgeturl(data.widgetUrl);
            req.setDomainsList(data.domain);
            req.setSiteid(data.siteId);
            req.setAssistantidcall(data.assistantidcall);
            req.setAssistantidllm(data.assistantidllm);
            // req.setId(sanitizedData.id);
            // req.setName(sanitizedData.name);
            // req.setDomainsList(sanitizedData.domain);
            // req.setAssistantidcall(sanitizedData.assistantId);
            // req.setAssistantidllm(sanitizedData.assistantidllm);

            return this.Parent.callFunc(0x3840809d, req).then(({ result }) => {
                const deserialized = widgetConfigService.WidgetConfigResponse.deserializeBinary(result);
                if (deserialized.getSuccess()) {
                    toast.success('Widget Configuration updated successfully', {
                        style: TOAST_STYLE.SUCCESS
                    });
                } else {
                    toast.error(deserialized.getMessage() || 'Failed to update widget configuration', {
                        style: TOAST_STYLE.ERROR
                    });
                }
            }).finally(() => {
                this.#processes["updateWidgetConfig"] = false;
                this.setValue("isLoadingUpdate", false);
            });
        } catch (error) {
            console.error(error);
            toast.error('Failed to update widget configuration', {
                style: TOAST_STYLE.ERROR
            });
        }
    }

    async loadWidget(siteId) {
        try {
            if (siteId) {
                const script = document.createElement("script");
                const url = new URL(Client.Settings.widgetConfig.serverUrl);
                url.pathname = "/widget/iframe.js";
                url.searchParams.set("siteId", siteId);
                script.src = url.toString();
                script.async = true;
                document.body.appendChild(script);
            }
        } catch (error) {
            console.error("Error loading widget:", error);
            toast.error('Failed to load widget', {
                style: TOAST_STYLE.ERROR
            });
        }
    }


    async formatWidgetUrl(siteId) {
        const widgetClient = new WidgetClientManager({
            serverUrl: Client.Settings.widgetConfig.serverUrl
        });

        const embedCode = await widgetClient.generateEmbedCode({
            siteId: siteId,
            strategy: "domain",
        });

        // add to clipboard
        navigator.clipboard.writeText(embedCode.embedCode);
        toast.success('Widget URL copied to clipboard', {
            style: TOAST_STYLE.SUCCESS
        });
        return embedCode.embedCode;
    }

    async checkDomain(domain) {
        try {
            if (!this.#websiteVerifierClient) this.initWebsiteVerifierClient();
            this.setValue("isWebsiteVerifying", true);
            const response = await this.#websiteVerifierClient.verifyWebsite(domain);
            const isValidWebsite = response.formatValid &&
                response.dnsResolved &&
                response.httpAccessible;

            this.setValue("isWebsiteVerifying", false);
            return isValidWebsite;
        } catch (error) {
            this.setValue("isWebsiteVerifying", false);
            toast.error('Failed to verify domain', {
                style: TOAST_STYLE.ERROR
            });
            return false;
        }

    }

    TabChange(tab = "appearance") {
        this.setValue("activeTab", tab);
    }

    listen() {
        if (!this.#listen) {
            this.#listen = RedisventService.WidgetConfig.listen("widgetConfig", Accounts.userId(), ({ event, data }) => {
                switch (event) {
                    case "remove":
                        break;
                    case "upsert":
                        const res = data.data;
                        if (res && res.id) {
                            this.DB.upsert({ id: res.id }, { $set: res });
                        }
                        break;
                    case "update":
                        const updateData = data.data;
                        delete updateData._id; // Remove MongoDB _id field
                        this.DB.update({ id: updateData.id }, { $set: updateData });
                        break;
                    default:
                        Logger.showLog("Unknown event", event);
                        break;
                }
                this.activateWatch();
            });
        }
    }

    removeListener() {
        RedisventService.WidgetConfig.remove(this.#listen);
    }
}

export default new WidgetWatcher(Client);