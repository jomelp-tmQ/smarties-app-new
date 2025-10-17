import { Core, Adapter, Path } from "@tmq-dev-ph/tmq-dev-core-server";
import { Vent } from "meteor/cultofcoders:redis-oplog";
import { Accounts } from "meteor/accounts-base";
import { WebApp } from "meteor/webapp";
import { Meteor } from "meteor/meteor";
import { Mongo } from "meteor/mongo";
import RedisVentService from "./classes/events/RedisVentService";
import { KBManager } from "./classes/knowledgeBase/KBManager";
import { Crawl } from "./classes/vapi/Crawl";
import { fetch } from "meteor/fetch";
import Billing from "billing-client";
import WidgetService from "../../api/server/classes/widget/Widget";
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { UploadManager } from "@tmq-justin/uploadmanager-client";
import Business from "./classes/dbTemplates/Business";
import { Assistant } from "@assistant/assistant-client";
import { RedisVentServer } from 'redisvent-module';
import UploadsManager from "./classes/uploads/UploadsManager";
import FilesManager from "./classes/files/FilesManager";
import AttachmentManager from "./classes/attachments/AttachmentManager";
import { UploadsCollection } from "./classes/dbTemplates/Uploads";
import cron from 'node-cron';
import { logger as baseLogger } from "./utils/serverUtils";
const logger = baseLogger.child({ service: 'Server.js' });

Adapter.Meteor = Meteor;
Adapter.Mongo = Mongo;
Adapter.Accounts = Accounts;
Adapter.Assets = Assets;
Adapter.WebApp = WebApp;
Adapter.Vent = Vent;


class Server extends Core {
    #crawl;
    #generatePrompts;
    #customAIAssistant;
    #twilio;
    #billing;
    #kbManager;
    #uploadManager;
    #widgetManager;
    #redisVentServer = null;
    constructor(settings) {
        super(settings);
        logger.info("Pino Logger Server initialized");
        // this.settings = settings;
        this.loadDefaultServices();
        // this.#crawl = new Crawl(settings.crawl);
        this.onLogin((user) => {
            logger.info("User login", { userId: user && user._id });
        });
        this.#widgetManager = new WidgetService({
            ...this.Config.widgetConfig,
            domain: this.Config.host
        });
        this.#kbManager = new KBManager(this.Config.KB_CLIENT, this.Config.host);
        if (this.Config.billingInfo) {
            this.client = new Billing({
                serverUrl: this.Config.billingInfo.apiUrl,
                apiKey: this.Config.billingInfo.apiKey,
                onTokenRefresh: (token) => {
                    logger.debug("Billing token refreshed");
                },
                onError: (error) => {
                    logger.error("Billing client error", { error: error?.message || error });
                }
            });
            this.#uploadManager = new UploadManager(this.Config.public.uploadConfig);
        }
        if (this.Config.assistant) {
            this.#customAIAssistant = new Assistant({
                serverUrl: this.Config.assistant.serverUrl,
                apiKey: this.Config.assistant.apiKey,
            });
        }

    }
    /**
     * @returns {KBManager}
     */
    get KBManager() {
        return this.#kbManager;
    }
    /**
     * @returns {Crawl}
     */
    get Crawl() {
        return this.#crawl;
    }
    /**
     * @returns {UploadManager} 
     */
    get UploadManager() {
        return this.#uploadManager;
    }
    /**
     * @returns {WidgetService}
     */
    get WidgetManager() {
        return this.#widgetManager;
    }

    /**
   * @returns {RedisVentServer}
   */
    get RedisVentServer() {
        return this.#redisVentServer;
    }

    /**
     * @returns {Assistant}
     */
    get CustomAIAssistant() {
        return this.#customAIAssistant;
    }
    async initVapiConfig() {
        if (!this.Config || !this.Config.vapi) {
            logger.warn("VAPI settings are not defined.");
            return;
        }

        const coll = Core.getDB("clientConfig", true);

        // Update assistantId only if it exists
        if (this.settings.vapi.assistantId) {
            await coll.updateOne({ key: "assistantId" }, { $set: { value: this.settings.vapi.assistantId } }, { upsert: true });
        }
        // Update publicKey only if it exists
        if (this.settings.vapi.assistantId) {
            await coll.updateOne({ key: "publicKey" }, { $set: { value: this.settings.vapi.publicKey } }, { upsert: true });
        }
    }

    async registerBillingWebhook() {
        try {
            if (this.client) {
                const res = await this.client.registerAppWebhook(this.Config.app.name, `${this.Config.app.url}/billing/webhook`);
                logger.info("Successfully registered billing webhook");
            }
        } catch (error) {
            logger.warn("Error registering billing webhook", { error });
        }
    }

    async startRedis() {
        if (this.#redisVentServer) return;
        try {
            const redisVentServer = new RedisVentServer();
            await redisVentServer.initialize({
                redis: {
                    host: this.Config.redisOplog.redis.host || 'localhost',
                    port: this.Config.redisOplog.redis.port || 6379
                },
                wsPort: this.Config.server.wsPort || 3502,
                debug: false
            });
            this.#redisVentServer = redisVentServer;
            logger.info('RedisVent server initialized');
            return super.startRedis().then(() => {
                RedisVentService.publish(["sayHello", "INBOX", "INTERACTION", "TRANSCRIPT", "SESSIONS", "PAGE_VIEWS"], true); // register custom events here
                this.assignRedisVent(RedisVentService); // assign RedisVentService to Core
                /*
                    Sample custom event trigger
                    Meteor.setInterval(() => {
                        // trigger custom events here
                        RedisVentService.HelloWorld.triggerCustom(
                            "helloworld", // listener scope to trigger
                            "sayHello", // custom event to trigger
                            "hi1234", // listener unique id to trigger to
                            { msg: "Hello from Server" }); // data to send
                    }, 5000);
                    */
            });
        } catch (error) {
            logger.error("Error starting Redis", { error });
            throw error;
        }
    }
    startAccountListener() {
        Accounts.onCreateUser(async (options, user) => {
            try {
                const business = new Business({
                    name: Business.generateNameFromEmail(user.emails[0].address)
                });
                business.slug = await Business.generateUniqueSlug(business.name);
                business.local = "en-US";
                business.plan = "free";
                await business.save();
                user.businessId = business._id;
            } catch (error) {
                logger.error("Error creating user", { error });
            }
            return user;
        });
    }

    /**
     * Reconcile Uploads with remote storage by polling statusUrl for non-completed uploads
     * - If remote state is stored/ready: finalize Upload, update Files and related Attachments
     * - If remote state is failed/deleted: mark Upload failed, update Files/Attachments
     * - Otherwise: keep as pending
     */
    async checkAndReconcileUploadsStatuses() {
        cron.schedule('0 0 * * *', async () => {
            try {
                const docs = await UploadsCollection.rawCollection()
                    .find({ status: { $in: ['pending'] }, statusUrl: { $exists: true, $ne: null } }, { sort: { updatedAt: -1 } })
                    .toArray();

                for (const d of docs) {
                    const fileId = d.fileId;
                    const statusUrl = d.statusUrl;
                    if (!fileId || !statusUrl) continue;
                    try {
                        const resp = await axios.get(statusUrl);
                        const rf = resp?.data || {};
                        const rfState = rf.state || rf.status || null;

                        const detectedExt = rf.ext ? `.${String(rf.ext).toLowerCase()}` : (path.extname(rf.name || '') || '').toLowerCase();
                        const detectedMime = rf.mime || null;
                        const detectedSize = typeof rf.size === 'number' ? rf.size : null;
                        const remoteUrl = `${this.Config.server.rabbitFile.url}/download/${fileId}`;
                        const originalName = rf.name || d.originalName || `${fileId}`;

                        if (rfState === 'stored' || rfState === 'ready') {
                            // Finalize upload
                            try { await UploadsManager.updateUploadMetadata(fileId, { fileSize: detectedSize, mimeType: detectedMime, fileExtension: detectedExt, remoteUrl }, { finalize: true }); } catch (_) { }
                            // Ensure Files record and update
                            try {
                                let fileRec = await FilesManager.getFileByFileId(fileId);
                                if (!fileRec) {
                                    try { await FilesManager.createFile({ fileId, originalName, businessId: d.businessId, status: 'completed', mimeType: detectedMime }); } catch (_) { }
                                }
                                await FilesManager.updateFileMetadata(fileId, { fileSize: detectedSize, originalName, mimeType: detectedMime, status: 'completed' });
                                try {
                                    const fr = await FilesManager.getFileByFileId(fileId);
                                    if (fr) {
                                        const bizId = fr.businessId?._str || fr.businessId?.toString() || String(fr.businessId || d.businessId || '');
                                        this.RedisVentServer.triggers.update('fileapp', 'file', bizId, fileId, fr);
                                    }
                                } catch (_) { }
                            } catch (_) { }
                            // Update related attachments
                            try {
                                const atts = await AttachmentManager.getAttachmentsByRecordingId(String(fileId));
                                if (Array.isArray(atts) && atts.length > 0) {
                                    for (const att of atts) {
                                        try {
                                            const baseAttrs = Array.isArray(att.attributes) ? att.attributes : [];
                                            const filtered = baseAttrs.filter(a => a && a.key !== 'status');
                                            const newAttributes = [...filtered, { key: 'status', value: 'completed' }];
                                            await AttachmentManager.updateAttachment(att._id, { remoteUrl, fileSize: detectedSize ?? att.fileSize ?? null, mimeType: detectedMime ?? att.mimeType ?? null, fileExtension: detectedExt || att.fileExtension || null, originalName: originalName || att.originalName || fileId, attributes: newAttributes });
                                            const consumerId = att.consumerId?._str || att.consumerId?.toString() || String(att.consumerId);
                                            this.RedisVentServer.triggers.update('attachmentapp', 'attachment', consumerId, fileId, { ...att, remoteUrl, fileSize: detectedSize ?? att.fileSize ?? null, mimeType: detectedMime ?? att.mimeType ?? null, fileExtension: detectedExt || att.fileExtension || null, originalName: originalName || att.originalName || fileId, attributes: newAttributes });
                                        } catch (_) { }
                                    }
                                }
                            } catch (_) { }
                        } else if (rfState === 'deleted' || rfState === 'failed') {
                            try { await UploadsManager.markUploadFailed(fileId, rfState); } catch (_) { }
                            try {
                                await FilesManager.updateFileMetadata(fileId, { status: 'failed' });
                                try {
                                    const fr = await FilesManager.getFileByFileId(fileId);
                                    if (fr) {
                                        const bizId = fr.businessId?._str || fr.businessId?.toString() || String(fr.businessId || d.businessId || '');
                                        this.RedisVentServer.triggers.update('fileapp', 'file', bizId, fileId, fr);
                                    }
                                } catch (_) { }
                            } catch (_) { }
                        } else {
                            // Keep pending state for in-progress
                            try { const up = await UploadsManager.getUploadByFileId(fileId); if (up) { up.markAsPending(); await up.save(); } } catch (_) { }
                            try {
                                await FilesManager.updateFileMetadata(fileId, { status: 'pending' });
                                try {
                                    const fr = await FilesManager.getFileByFileId(fileId);
                                    if (fr) {
                                        const bizId = fr.businessId?._str || fr.businessId?.toString() || String(fr.businessId || d.businessId || '');
                                        this.RedisVentServer.triggers.update('fileapp', 'file', bizId, fileId, fr);
                                    }
                                } catch (_) { }
                            } catch (_) { }
                        }
                    } catch (e) {
                        // Ignore per-item errors to continue loop
                    }
                }
                return { processed: docs.length };
            } catch (error) {
                logger.error('checkAndReconcileUploadsStatuses failed', { error });
                throw error;
            }
        }, { timezone: 'America/New_York' });
    }
}
export default (Adapter.ServerInstance = new Server(Meteor.settings));