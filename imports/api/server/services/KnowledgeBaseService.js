import { Adapter, Core, Utilities } from "@tmq-dev-ph/tmq-dev-core-server";
import { logger as baseLogger } from "../utils/serverUtils";
const logger = baseLogger.child({ service: 'services/KnowledgeBaseService.js' });
import { tmq as knowledge } from "../../common/static_codegen/tmq/knowledgeBase";
import { status } from "@grpc/grpc-js";
import moment from "moment";
import pdf from "pdf-parse";
import Server from "../Server";
import RedisVentService from "../classes/events/RedisVentService";

const { KnowledgeBaseResponse, FetchKnowledgeBaseResponse, AllKnowledgeBase, FetchKbUrlResponse, File } = knowledge;
import CrawlPages, { CrawlPagesCollection } from "../classes/dbTemplates/CrawlPages";
import { KnowledgeBaseFile } from "../classes/dbTemplates/KnowledgeBase";
import Crawl, { CrawlCollection } from "../classes/dbTemplates/Crawl";
import { UploadsCollection } from "../classes/dbTemplates/Uploads";
import Business from "../classes/dbTemplates/Business";
import Uploads from "../classes/dbTemplates/Uploads";
import { toObjectId } from "../classes/db/helper";
import Files from "../classes/dbTemplates/Files";



export default {
    createKnowledgeBase: async function ({ request }, callback) {
        const response = new KnowledgeBaseResponse();
        try {
            const { ServerInstance } = Adapter;
            if (!ServerInstance) {
                return callback({
                    code: 500,
                    message: "Server instance not initialized!",
                    status: status.INTERNAL
                });
            }

            // Validate collection name
            if (!request.collectionName || request.collectionName.trim() === "") {
                return callback({
                    code: 400,
                    message: "Collection name is required and cannot be empty",
                    status: status.INVALID_ARGUMENT || 400
                });
            }

            let collectionName = request.collectionName;
            if (collectionName) {
                collectionName = collectionName.trim();
                collectionName = collectionName.replace(/[^a-zA-Z0-9]/g, '_');
            }

            const knowledgeBase = await Server.KBManager.KBClient.createCollection({ collectionName });

            if (!knowledgeBase) {
                return callback({
                    code: 500,
                    message: "Knowledgebase creation failed",
                    status: status.INTERNAL
                });
            }

            // Create your original data object
            // derive keywords for search: collectionName tokens
            const nameTokens = (knowledgeBase.collection_name || '').split(/\s+/).filter(Boolean);
            const data = {
                collectionId: knowledgeBase.collection_id,
                collectionName: knowledgeBase.collection_name,
                userId: request.userId,
                createdAt: moment().valueOf(),
                updatedAt: moment().valueOf(),
                index1: knowledgeBase.collection_name.toLowerCase() + moment().valueOf(),
                files: [],
                keywords: Array.from(new Set(nameTokens.map(s => s.toLowerCase().trim()).filter(s => s.length > 0)))
            };

            // Insert into DB
            // const db = Core.getDB("knowledgeBase", true);
            // const result = await db.insertOne(data);

            // if (result.insertedId) {
            //     data._id = result.insertedId.toString();
            //     data.id = result.insertedId.toString();
            //     data.createdAt = data.createdAt.toString();
            //     data.updatedAt = data.updatedAt.toString();
            // }
            const kb = new KnowledgeBaseFile(data, true);
            const savedData = await kb.save();

            // Transform for Redis (convert keys to lowercase, rename 'files' -> 'filesList')
            // const transformedData = {};

            // for (const key in data) {
            //     if (!data.hasOwnProperty(key)) continue;

            //     if (key === 'files') {
            //         transformedData['filesList'] = data[key]; // rename
            //     } else {
            //         transformedData[key.toLowerCase()] = data[key]; // lowercase everything else
            //     }
            // }

            // Server.RedisVentServer.triggers.insert('knowledgebaseapp', 'knowledgebase', businessId, ,);
            const id = savedData.insertedId.toString() || savedData.insertedId.toString() || String(savedData.insertedId || '');
            const bizId = request.businessId;
            // Ensure downstream listeners receive a stable _id matching the event id
            data._id = id;
            // Emit an insert event for newly created knowledge bases
            ServerInstance.RedisVentServer.triggers.insert('knowledgebaseapp', 'knowledgebase', bizId, id, data);
            response.success = true;
            response.message = "Knowledgebase created successfully";
            callback(null, response);

        } catch (error) {
            logger.error('createKnowledgeBase error', { error: error?.message || error });
            callback({
                code: 500,
                message: error.message || "Error creating knowledge base",
                status: status.INTERNAL
            });
        }
    },

    /**
     * 
     * @param {Object} call 
     * @param {knowledge.KnowledgeBaseUploadRequest} call.request
     * @param {*} callback 
     */
    uploadKnowledgeBase: async function ({ request }, callback) {
        const response = new KnowledgeBaseResponse();
        try {
            const { ServerInstance } = Adapter;
            if (!ServerInstance) {
                throw new Error("Server instance not initialized!");
            }
            const proc = [];
            const urls = [];
            const knowledgeBaseFiles = [];
            const currentKb = await KnowledgeBaseFile.findById({ collectionId: request.collectionId, userId: request.userId });

            switch (request.type) {
                case "file":
                    if (request.fileIdList && request.fileIdList.length) {
                        request.fileIdList.forEach(element => {
                            proc.push(Files.findById(element).then(file => file ? { id: file.fileId, name: file.originalName } : null));
                        });
                    }
                    const files = (await Promise.all(proc)).filter(Boolean);
                    if (files && files.length) {
                        files.forEach(file => knowledgeBaseFiles.push(file));
                    }
                    if (currentKb && currentKb.files && currentKb.files.length) {
                        currentKb.files.forEach(file => {
                            if (file.url) knowledgeBaseFiles.push(file);
                        });
                        if (currentKb.urls && currentKb.urls.length) {
                            currentKb.urls.forEach(url => {
                                if (url.url) urls.push(url);
                            });
                        }
                    }
                    break;
                case "url":
                    if (request.urlList && request.urlList.length) {
                        for (const url of request.urlList) {
                            const crawUrl = await Crawl.findById(url);
                            if (crawUrl) urls.push({ url: crawUrl.url, title: crawUrl.title, id: url });
                            const pages = await CrawlPages.findByCrawlIdActive(url, true);
                            if (pages && pages.length) pages.forEach(page => knowledgeBaseFiles.push({ url: page.url, title: page.title, id: page.fileId }));
                        }
                    }
                    if (currentKb && currentKb.files && currentKb.files.length) {
                        currentKb.files.forEach(file => {
                            if (!file.url) knowledgeBaseFiles.push(file);
                        });
                    }
                    break;
                default:
                    break;
            }
            await KnowledgeBaseFile.addKb({ userId: request.userId, collectionId: request.collectionId, files: knowledgeBaseFiles, urls });
            response.success = true;
            callback(null, response);
        } catch (error) {
            logger.error('uploadKnowledgeBase error', { error: error?.message || error });
            callback({
                code: 500,
                message: "Error uploading knowledge base",
                status: status.INTERNAL
            });
        }
    },
    fetchKnowledgeBase: async function ({ request }, callback) {
        // #[x]: @szyrelle create template for knowledge base collection to handle validation and sanitization
        const response = new FetchKnowledgeBaseResponse();
        try {

            let indexBasis = "createdAt";
            let orderBasis = "$lt";
            let regexValue = request.searchQuery;

            const pipeline = [];
            const match = {};

            if (request.userId) {
                match.userId = request.userId;
            }

            if (regexValue) {
                match.$or = [
                    { collectionName: { $regex: regexValue, $options: "i" } },
                    { keywords: { $elemMatch: { $regex: regexValue, $options: "i" } } }
                ];
            }

            // Pagination inputs (supports both legacy and new page object like Inbox)
            const page = request.page || {};
            const lastBasis = Number(
                (page.last_basis ?? page.lastBasis ?? request.lastBasis ?? 0)
            );
            const limit = request.limit || 15;
            if (lastBasis !== 0) {
                match[indexBasis] = { [orderBasis]: lastBasis };
            }

            pipeline.push({ $match: match });
            pipeline.push({ $sort: { [indexBasis]: -1 } });
            pipeline.push({ $limit: limit });

            const knowledgeBase = await Core.getDB("knowledgeBase", true).aggregate(pipeline).toArray();
            const returnData = {};
            if (knowledgeBase && knowledgeBase.length) {
                returnData.data = knowledgeBase.map((item) => ({ ...item, _id: item._id.toString() }));

                returnData.lastBasis = knowledgeBase[knowledgeBase.length - 1][indexBasis];
            }
            if (returnData.data) {
                returnData.data.forEach(element => {
                    if (element.collectionId) {
                        const kb = new KnowledgeBaseFile(element, true);
                        response.knowledgeBases.push(kb.toProto());
                    }
                });
            }
            response.lastBasis = returnData.lastBasis || 0;

            callback(null, response);
        } catch (error) {
            logger.error('fetchKnowledgeBase error', { error: error?.message || error });
            callback({
                code: 500,
                message: "Error fetching knowledge base",
                status: status.INTERNAL
            });
        }
    },
    generateUrl: async function ({ request }, callback) {
        const response = new FetchKbUrlResponse();
        try {
            const { ServerInstance } = Adapter;
            if (!ServerInstance) {
                callback({
                    code: 500,
                    message: "Server instance not initialized!",
                    status: status.INTERNAL
                });
            } else {
                const url = await Server.KBManager.generateUrl(request.collectionId);
                response.url = url;
                response.success = true;
            }
            callback(null, response);
        } catch (error) {
            logger.error('generateUrl error', { error: error?.message || error });
            callback({
                code: 500,
                message: "Error generating url",
                status: status.INTERNAL
            });
        }
    }
};