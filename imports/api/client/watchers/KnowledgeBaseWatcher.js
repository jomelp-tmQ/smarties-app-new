import core from "@tmq-dev-ph/tmq-dev-core-client";
import { Watcher2 } from "../Watcher2";
import Client from "../Client";
import knowledgeBaseService from "../../common/static_codegen/tmq/knowledgeBase_pb";
import { KNOWLEDGEBASE, TOAST_STYLE } from "../../common/const";
import { Mongo } from "meteor/mongo";
import { toast } from "sonner";
import {
    collectionManager,
    syncManager,
    subscriptionManager
} from 'redisvent-module';

const { Adapter, Logger } = core;

Adapter.Meteor = Meteor;
Adapter.Accounts = Accounts;
Adapter.Mongo = Mongo;

class KnowledgeBaseWatcher extends Watcher2 {
    #data;
    #lastBasis;
    #businessId = "";
    #listen = null;
    #lastQuery = null;
    #resultIds = null;

    constructor(parent) {
        super(parent);
        this.#data = collectionManager.getCollection("knowledgebaseapp", "knowledgebase", {
            syncEnabled: false, // We'll handle sync manually
            enableSyncRead: true
        });
        this.listening = false;

        if (!this.#businessId) this.fetchbusinessId();
    }

    get DB() {
        return this.#data;
    }
    get Data() {
        if (this.#resultIds instanceof Set) {
            if (this.#resultIds.size === 0) return [];
            const ids = Array.from(this.#resultIds);
            return this.#data.findSync({ _id: { $in: ids } }, { sort: { createdat: -1 } });
        }
        return this.#data.findSync({}, { sort: { createdat: -1 } });
    }

    async fetchbusinessId() {
        Accounts.getCurrentUser().then((user) => {
            this.#businessId = user.businessId;
        }).catch((error) => {
            // log error on development
        });
    }

    async initialize() {
        const redisVentReady = await this.Parent.RedisVentReadyPromise;
        if (!redisVentReady) {
            toast.error("RedisVent not ready");
            return;
        }
        syncManager.subscribeToSpace("knowledgebaseapp");
    }

    async handlesubmitNewKnowledgeBase(form) {
        const formData = new FormData(form);
        let name = formData.get('knowledge-base-name');
        if (name == "") return this.setValue("kbError", true);
        this.createKnowledgeBase(name);
        this.setValue("kbError", false);
    }

    normalizeKbDoc(raw, preferredId) {
        const collectionId = raw.collectionid || raw.collectionId || "";
        const userId = raw.userid || raw.userId || "";
        const collectionName = raw.collectionname || raw.collectionName || "";
        const createdAt = raw.createdat || raw.createdAt || 0;
        const updatedAt = raw.updatedat || raw.updatedAt || 0;
        const filesList = raw.filesList || raw.files || [];
        const id = raw.id || raw._id || preferredId || "";
        const urlsList = raw.urlsList || raw.urls || [];

        const normalized = {
            collectionid: collectionId,
            userid: userId,
            collectionname: collectionName,
            id: id,
            createdat: createdAt,
            updatedat: updatedAt,
            filesList: filesList,
            urlsList: urlsList
        };

        // Ensure stable _id for upserts
        if (preferredId || raw._id || raw.id) {
            normalized._id = preferredId || raw._id || raw.id;
        }
        return normalized;
    }

    async createKnowledgeBase(name) { //#[x]: @szyrelle add loading state while creating knowledge base
        try {
            this.setValue(KNOWLEDGEBASE.ISLOADING, true);
            const req = new knowledgeBaseService.createKnowledgeBaseRequest();
            req.setUserid(Accounts.userId());
            req.setCollectionname(name);
            if (!this.#businessId) await this.fetchbusinessId();
            req.setBusinessid(this.#businessId);
            return this.Parent.callFunc(0x703f5f0, req).then(({ result }) => {
                const deserialized = knowledgeBaseService.KnowledgeBaseResponse.deserializeBinary(result);
                if (deserialized.getSuccess()) {
                    toast.success('Knowledge base created successfully', {
                        style: TOAST_STYLE.SUCCESS
                    });
                }
            }).finally(() => {
                this.setValue(KNOWLEDGEBASE.ISLOADING, false);
            });
        } catch (error) {
            toast.error('Failed to create knowledge base', {
                style: TOAST_STYLE.ERROR
            });
        }
    }

    async fetchKnowledgeBase({ append = false, searchQuery = null, limit = 20 } = {}) { // #[x]: @szyrelle add loading state while fetching knowledge base
        try {
            this.setValue(KNOWLEDGEBASE.ISLOADING, true);
            if (!Accounts.userId()) {
                return [];
            }
            const loadMore = append === true;

            if (!loadMore) {
                this.#lastBasis = null;
                this.#resultIds = new Set();
            }
            const req = new knowledgeBaseService.FetchKnowledgeBaseRequest();
            req.setUserid(Accounts.userId());
            // also set top-level limit for backend logging/back-compat
            try { if (typeof req.setLimit === 'function') req.setLimit(limit); } catch (_e) { }

            // remember last query for subsequent pagination
            if (typeof searchQuery === 'string' || searchQuery === null) {
                this.#lastQuery = searchQuery;
            }

            // New style Pagination object (if available in generated client)
            try {
                if (knowledgeBaseService.Pagination && typeof req.setPage === 'function') {
                    const p = new knowledgeBaseService.Pagination();
                    p.setLastBasis(loadMore ? (this.#lastBasis || 0) : 0);
                    p.setLimit(limit);
                    req.setPage(p);
                } else if (loadMore && this.#lastBasis) {
                    // Legacy fallback
                    req.setLastbasis(this.#lastBasis);
                }
            } catch (_e) {
                if (loadMore && this.#lastBasis) req.setLastbasis(this.#lastBasis);
            }

            if (this.#lastQuery) req.setSearchquery(this.#lastQuery);

            const { result } = await this.Parent.callFunc(0xc2261c79, req);
            const deserialized = knowledgeBaseService.FetchKnowledgeBaseResponse.deserializeBinary(result);
            const data = deserialized.getKnowledgebasesList().map(item => item.toObject());
            const lastBasis = deserialized.getLastbasis();

            this.#lastBasis = lastBasis;
            if (data && data.length) {
                if (!(this.#resultIds instanceof Set)) this.#resultIds = new Set();
                data.forEach(item => {
                    const preferredId = item.id || item._id;
                    const doc = this.normalizeKbDoc(item, preferredId);
                    if (doc && doc._id) this.#resultIds.add(doc._id);
                    if (doc && !doc.url) try { this.DB.insert(doc); } catch (_e) { try { if (doc._id) this.DB.update(doc._id, doc); } catch (_e2) { } }
                });
            } else if (!loadMore) {
                // explicit empty result for fresh search
                this.#resultIds = new Set();
            }

            // notify UI that the dataset changed
            this.activateWatch();
            this.setValue(KNOWLEDGEBASE.ISLOADING, false);
            return this.KnowledgeBases;
        } catch (error) {
            this.setValue(KNOWLEDGEBASE.ISLOADING, false);
            toast.error('Failed to fetch knowledge base', {
                style: TOAST_STYLE.ERROR
            });
        }
    }

    async loadMoreKnowledgeBase() {
        return this.fetchKnowledgeBase({ append: true });
    }

    async uploadKnowledgeBase(files, urls, type = "file") {
        try {
            this.setValue("uploadisLoading", true);
            const req = new knowledgeBaseService.KnowledgeBaseUploadRequest();
            const selected = this.getValue(KNOWLEDGEBASE.CURRENTSELECTED);
            if (!selected || !selected.collectionid) {
                toast.error("No knowledge base selected", { style: TOAST_STYLE.ERROR });
                return;
            }
            req.setCollectionid(selected.collectionid);
            req.setUserid(Accounts.userId());
            req.setFileidlistList(files);
            req.setUrllistList(urls);
            if (!this.#businessId) await this.fetchbusinessId();
            req.setBusinessid(this.#businessId);
            req.setType(type);
            return this.Parent.callFunc(0x27971cae, req).then(({ result }) => {
                const deserialized = knowledgeBaseService.KnowledgeBaseResponse.deserializeBinary(result);
                if (deserialized.getSuccess()) {
                    toast.success('Knowledge base uploaded successfully', {
                        style: TOAST_STYLE.SUCCESS
                    });
                }
            }).finally(() => {
                this.setValue("uploadisLoading", false);
                this.setValue(KNOWLEDGEBASE.CURRENTSELECTED, null);
                this.fetchKnowledgeBase();
            });
        } catch (error) {
            toast.error('Failed to upload knowledge base', {
                style: TOAST_STYLE.ERROR
            });
        }
    }
    assignknowledgeBasetoAssistant() { }

    async listen() {
        const redisVentReady = await this.Parent.RedisVentReadyPromise;
        if (!redisVentReady) {
            toast.error("RedisVent not ready", TOAST_STYLE);
            return;
        }

        if (this.listening) return;
        if (!this.#businessId) {
            toast.warning("Business not set", TOAST_STYLE.WARNING);
            await this.fetchbusinessId();
        }
        // Subscribe to real-time changes
        this.subscription = subscriptionManager.listen(
            "knowledgebaseapp",
            "knowledgebase",
            this.#businessId, // businessId as routingId
            async (change) => {
                // Handle real-time updates by mutating the merged Minimongo collection without full refetch
                switch (change.type) {

                    case 'initial':
                        break;
                    case 'insert':
                        if (!change || !change.data) break;
                        try {
                            const id = change.id || (change.data && change.data._id);
                            const doc = this.normalizeKbDoc(change.data, id);
                            try { this.DB.insert(doc); } catch (_e) { try { if (doc._id) this.DB.update(doc._id, doc); } catch (_e2) { } }
                        } catch (_e) { }
                        break;
                    case 'update':
                        if (!change || !change.data) break;
                        try {
                            const key = change.id || (change.data && (change.data._id || change.data.id));
                            if (!key) break;
                            const existing = await this.DB.findOne({ _id: key }) || await this.DB.findOne({ id: key });

                            if (existing) {
                                const update = {};

                                // Merge/append files instead of replacing
                                const incomingFiles = (change.data.files || change.data.filesList);
                                if (Array.isArray(incomingFiles) && incomingFiles.length) {
                                    const currentFiles = Array.isArray(existing.filesList) ? existing.filesList : (existing.files || []);
                                    const byId = new Map();
                                    for (const f of (currentFiles || [])) {
                                        const fid = f?.id || f?.fileId || f?._id || f?.file_id || f?.name;
                                        if (fid) byId.set(fid, f);
                                    }
                                    for (const f of incomingFiles) {
                                        const fid = f?.id || f?.fileId || f?._id || f?.file_id || f?.name;
                                        if (!fid) continue;
                                        const prev = byId.get(fid);
                                        byId.set(fid, prev ? { ...prev, ...f } : f);
                                    }
                                    update.filesList = Array.from(byId.values());
                                }

                                // Only set provided fields; never clobber with blanks
                                if (typeof change.data.collectionname !== 'undefined' || typeof change.data.collectionName !== 'undefined') {
                                    update.collectionname = change.data.collectionname ?? change.data.collectionName ?? existing.collectionname;
                                }
                                if (typeof change.data.updatedat !== 'undefined' || typeof change.data.updatedAt !== 'undefined') {
                                    update.updatedat = change.data.updatedat ?? change.data.updatedAt;
                                }

                                if (Object.keys(update).length > 0) {
                                    try { await this.DB.update(existing._id, update); } catch (_e) { }
                                }
                            } else {
                                // If we don't have it locally, insert a normalized doc using the key.
                                const doc = this.normalizeKbDoc({ ...change.data, id: key, _id: key }, key);
                                try { this.DB.insert(doc); } catch (_e) { try { if (doc._id) this.DB.update(doc._id, doc); } catch (_e2) { } }
                            }
                        } catch (_e) { }
                        break;
                    case 'remove':
                        break;
                }
                this.activateWatch();
            }
        );

        this.listening = true;
    }

    stopListening() {
        if (this.subscription) {
            this.subscription.stop();
            this.listening = false;
        }
    }
}

export default new KnowledgeBaseWatcher(Client);