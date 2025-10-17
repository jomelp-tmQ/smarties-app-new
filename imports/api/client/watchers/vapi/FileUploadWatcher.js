import core from "@tmq-dev-ph/tmq-dev-core-client";
import Client from "../../Client";
import { UploadManager } from "@tmq-justin/uploadmanager-client";
import { Watcher2 } from "../../Watcher2";
import axios from "axios";
import RedisventService from "../../redisvent/RedisventService";
import { collectionManager, subscriptionManager } from 'redisvent-module';
import { toast } from 'sonner';
import { TOAST_STYLE } from "../../../common/const";
import filesService from "../../../common/static_codegen/tmq/files_pb";
const { Adapter, Logger } = core;

Adapter.Meteor = Meteor;
Adapter.Accounts = Accounts;

class FileUploadWatcher extends Watcher2 {
    #data;
    #lastBasis;
    #hasMore;
    #businessId;
    #slug;
    #fileSubscription;
    #processes = {};
    constructor(parent) {
        super(parent);
        this.uploadManager = new UploadManager(
            Client.Settings.uploadConfig
        );
        // Prepare and get minimongo collection for files (via redisvent-module)
        this.#data = collectionManager.getCollection('fileapp', 'file', {
            syncEnabled: false
        });
        this.#lastBasis = null;
        this.#hasMore = false;
        this.fileListening = false;

        Accounts.getCurrentUser().then((user) => {
            this.#businessId = user.businessId;
            this.#slug = user.slug;
        }).catch((error) => {
            // log error on development
        });
    }

    get UserId() {
        return Accounts.userId();
    }

    get BusinessId() {
        return this.#businessId;
    }

    get Config() {
        return this.config;
    }

    /**
     * @returns {Mongo.Collection}
     */
    get DB() {
        return this.#data;
    }



    async upload(files) {
        try {
            if (!files || files.length === 0) {
                console.error('No files provided for upload');
                return;
            }

            // Normalize to an array of File objects
            let fileArray;
            if (Array.isArray(files)) {
                fileArray = files;
            } else if (typeof FileList !== 'undefined' && files instanceof FileList) {
                fileArray = Array.from(files);
            } else {
                fileArray = [files];
            }

            for (let i = 0; i < fileArray.length; i++) {
                const file = fileArray[i];
                const formData = new FormData();
                formData.append('file', file);

                // Emit upload start event
                this.setValue("uploadProgress", {
                    status: 'uploading',
                    currentFile: i + 1,
                    totalFiles: fileArray.length,
                    fileName: file.name,
                    progress: 0
                });

                const res = await axios.post(`/api/b/${this.#slug}/upload`, formData, {
                    // Do NOT set Content-Type manually; the browser will add the correct boundary
                    onUploadProgress: (progressEvent) => {
                        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        // Emit progress update
                        this.setValue("uploadProgress", {
                            status: 'uploading',
                            currentFile: i + 1,
                            totalFiles: fileArray.length,
                            fileName: file.name,
                            progress: percentCompleted
                        });
                    }
                });

                // Emit upload complete for this file
                this.setValue("uploadProgress", {
                    status: 'complete',
                    currentFile: i + 1,
                    totalFiles: fileArray.length,
                    fileName: file.name,
                    progress: 100
                });
            }

            // Refresh the files list after successful upload
            await this.fetchFiles();

            // Clear progress after all uploads complete
            setTimeout(() => {
                this.setValue("uploadProgress", null);
            }, 2000);

        } catch (error) {
            console.error("Upload failed:", error);
            // Emit error event
            this.setValue("uploadProgress", {
                status: 'error',
                error: error.message
            });
            throw error;
        }
    }

    async download(file) {
        const { data, contentDisposition } = await this.uploadManager.downloadFile(file._id);
        const newFiles = new Blob([data], { type: contentDisposition });
    }

    async delete(currentSelected) {
        try {
            if (!currentSelected) {
                toast.error('No file selected', { style: TOAST_STYLE.ERROR });
                return;
            }
            const fileId = currentSelected.fileId || currentSelected.file_id || currentSelected.id || currentSelected._id;
            if (!fileId) {
                toast.error('Missing file id', { style: TOAST_STYLE.ERROR });
                return;
            }

            // Build request for FilesService.DeleteFile
            const req = new filesService.DeleteFileRequest();
            if (typeof req.setFileId === 'function') req.setFileId(String(fileId));
            else if (typeof req.setFileid === 'function') req.setFileid(String(fileId));

            const { result } = await this.Parent.callFunc(0x9ee33160, req);
            const resp = filesService.DeleteFileResponse.deserializeBinary(result).toObject();
            const ok = Boolean(resp.success ?? resp.ok ?? resp.Success ?? false);
            if (!ok) {
                const msg = resp.errorMessage || resp.error_message || 'Failed to delete file';
                toast.error(msg, { style: TOAST_STYLE.ERROR });
                return;
            }

            // Optimistically remove from local collection; RedisVent remove will also arrive shortly
            const key = currentSelected._id || currentSelected.id || currentSelected.fileId || currentSelected.file_id || String(fileId);
            let removed = await this.#data.remove(key);
            if (!removed) {
                const byFileId = await this.#data.findOne({ fileId: String(fileId) });
                if (byFileId) removed = await this.#data.remove(byFileId._id);
            }
            this.activateWatch();
            toast.success('File deleted', { style: TOAST_STYLE.SUCCESS });
        } catch (error) {
            console.error('Delete file failed:', error);
            toast.error('Delete failed', { style: TOAST_STYLE.ERROR });
        }
    }

    async fetchFiles({ append = true, limit = 20 } = {}) {
        try {
            if (!append) {
                this.#data.remove({});
                this.#lastBasis = null;
            }
            if (!this.#businessId) {
                console.error('BusinessId not found');
                return [];
            }
            if (this.#processes["fetchUploadFiles"]) return;
            this.#processes["fetchUploadFiles"] = true;
            const req = new filesService.FetchFilesRequest();
            // Include businessId for server-side ObjectId filtering
            if (this.#businessId) {
                if (typeof req.setBusinessId === 'function') req.setBusinessId(this.#businessId);
                else if (typeof req.setBusinessid === 'function') req.setBusinessid(this.#businessId);
            }
            // Build Pagination like MessagingWatcher
            if (typeof filesService.Pagination === 'function') {
                const p = new filesService.Pagination();
                if (typeof p.setLastBasis === 'function') p.setLastBasis(append ? (this.#lastBasis || 0) : 0);
                else if (typeof p.setLastbasis === 'function') p.setLastbasis(append ? (this.#lastBasis || 0) : 0);
                if (typeof p.setLimit === 'function') p.setLimit(limit);
                if (typeof req.setPage === 'function') req.setPage(p);
            }
            return this.Parent.callFunc(0x7f611a56, req).then(async ({ result }) => {
                const deserialized = filesService.FetchFilesResponse.deserializeBinary(result);
                const resObj = deserialized.toObject();
                const data = resObj.filesList || [];
                const lastBasis = Number((resObj.lastBasis ?? resObj.lastbasis) || 0);
                this.#lastBasis = lastBasis || 0;
                this.#hasMore = Boolean(lastBasis);
                // Replace vs Append already handled above by clearing when !append
                for (const item of data) {
                    const key = item.id || item._id || item.fileId || item.file_id;
                    if (!key) continue;
                    const doc = {
                        _id: key,
                        id: key,
                        fileId: item.fileId ?? item.file_id ?? item.fileid ?? key,
                        businessId: item.businessId ?? item.business_id ?? item.businessid ?? null,
                        userId: item.userId ?? item.user_id ?? item.userid ?? null,
                        originalName: item.originalName ?? item.original_name ?? item.originalname ?? String(key),
                        fileSize: typeof item.fileSize !== 'undefined' ? item.fileSize : (item.file_size ?? null),
                        mimeType: item.mimeType ?? item.mime_type ?? item.mimetype ?? null,
                        status: item.status ?? null,
                        kbStatus: item.kbStatus ?? item.kb_status ?? null,
                        createdAt: item.createdAt ?? item.created_at ?? 0,
                    };
                    const exists = await this.#data.findOne({ _id: key });
                    if (exists) {
                        // Replace whole doc (consistent with InboxWatcher semantics)
                        await this.#data.update(key, { ...exists, ...doc, _id: key, id: exists.id ?? key });
                    } else {
                        await this.#data.insert(doc);
                    }
                }
                this.setValue("isLoadingFiles", false);
                this.#processes["fetchUploadFiles"] = false;
                this.activateWatch();
                return { ok: true, lastBasis: this.#lastBasis, hasMore: this.#hasMore };
            });
        } catch (error) {
            toast.error('Failed to fetch files', {
                style: TOAST_STYLE.ERROR
            });
        }
    }

    get FilesHasMore() {
        return Boolean(this.#hasMore);
    }

    resetFilesPagination() {
        this.#lastBasis = null;
        this.#hasMore = false;
    }

    /** Subscribe to real-time file changes by routing key (e.g., businessId) */
    filesListen() {
        // Stop existing file subscription if any
        if (this.fileSubscription) {
            this.fileSubscription.stop();
            this.fileListening = false;
        }
        this.fileSubscription = subscriptionManager.listen(
            'fileapp',
            'file',
            this.#businessId,
            async (change) => {
                try {
                    switch (change.type) {
                        case 'initial':
                            break;
                        case 'insert': {
                            const exists = await this.#data.findOne({ fileId: change.data.fileId });
                            if (!exists) {
                                const data = {
                                    _id: change.data._id?._str ?? change.data._id ?? change.id,
                                    id: change.data._id?._str ?? change.data._id ?? change.id,
                                    fileId: change.data.fileId,
                                    businessId: change.data.businessId?._str ?? change.data.businessId ?? null,
                                    userId: change.data.userId?._str ?? change.data.userId ?? null,
                                    originalName: change.data.originalName,
                                    fileSize: change.data.fileSize,
                                    mimeType: change.data.mimeType ?? null,
                                    status: change.data.status ?? null,
                                    kbStatus: change.data.kbStatus ?? null,
                                    createdAt: change.data.createdAt,
                                };
                                await this.#data.insert(data);
                                this.activateWatch();
                            }
                            break;
                        }
                        case 'update': {
                            const updated = {
                                fileId: change.data.fileId,
                                businessId: change.data.businessId?._str ?? change.data.businessId ?? null,
                                userId: change.data.userId?._str ?? change.data.userId ?? null,
                                originalName: change.data.originalName,
                                fileSize: change.data.fileSize,
                                mimeType: change.data.mimeType ?? null,
                                status: change.data.status ?? null,
                                kbStatus: change.data.kbStatus ?? null,
                                createdAt: change.data.createdAt,
                            };
                            // Try to locate by fileId first
                            let existing = await this.#data.findOne({ fileId: change.id });
                            // Fallback to _id from payload or change.id
                            if (!existing) {
                                const payloadId = change.data._id?._str ?? change.data._id ?? null;
                                if (payloadId) existing = await this.#data.findOne({ _id: payloadId });
                                if (!existing) existing = await this.#data.findOne({ _id: change.id });
                            }
                            if (existing) {
                                // Replace entire doc with new values to ensure reactive fields update
                                const newDoc = { ...existing, ...updated, _id: existing._id, id: existing.id ?? existing._id };
                                await this.#data.update(existing._id, newDoc);
                            } else {
                                // If we still didn't find it, insert a new consolidated row
                                const newDoc = {
                                    _id: change.data._id?._str ?? change.data._id ?? change.id,
                                    id: change.data._id?._str ?? change.data._id ?? change.id,
                                    ...updated,
                                };
                                await this.#data.insert(newDoc);
                            }
                            this.activateWatch();
                            break;
                        }
                        case 'remove': {
                            // Try removing by _id; if not present, remove by located doc via fileId
                            const removed = await this.#data.remove(change.id);
                            if (!removed) {
                                const toRemove = await this.#data.findOne({ fileId: change.id });
                                if (toRemove) await this.#data.remove(toRemove._id);
                            }
                            this.activateWatch();
                            break;
                        }
                        default:
                            break;
                    }
                } catch (e) {
                    // On any error, fallback to refetch current list
                    this.fetchFiles({ append: true, limit: 20 });
                }
            }
        );

        this.fileListening = true;
    }

    stopListening() {
        if (this.fileSubscription) {
            this.fileSubscription.stop();
            this.fileListening = false;
        }
        // if (this.interactionSubscription) {
        //     this.interactionSubscription.stop();
        //     this.interactionListening = false;
        // }
    }
}

export default new FileUploadWatcher(Client);