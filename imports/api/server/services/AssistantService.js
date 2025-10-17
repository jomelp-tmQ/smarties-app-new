import { tmq as assistant } from "../../common/static_codegen/tmq/assistant";
import { Meteor } from "meteor/meteor";
import { Adapter, Core } from "@tmq-dev-ph/tmq-dev-core-server";
import { status } from "@grpc/grpc-js";
import moment from "moment";
import RedisVentService from "../classes/events/RedisVentService";
import { AssistantData } from "../classes/dbTemplates/Assistant";
import Server from "../Server";
import { logger as baseLogger } from "../utils/serverUtils";
const logger = baseLogger.child({ service: 'services/AssistantService.js' });


const { AssistantResponse, FetchAssistantResponse, FetchVoicesResponse, AllAssistants, AllVoices, Properties, Parameters, Functions, AssistantRequest, AssistantConfigResponse } = assistant;

export default {
    /**
    * @param {Object} call
    * @param {assistant.AssistantRequest} call.request
    * @param {function} callback 
    */
    createAssistant: async function ({ request }, callback) {
        const response = new AssistantResponse();
        try {
            const llm = await Server.CustomAIAssistant.createAssistant(request);

            const ad = new AssistantData({
                assistantId: llm.id,
                assistantIdLlm: llm.id,
                name: llm.name,
                voice: llm.voice || {},
                model: llm.model || {},
                firstMessage: llm.firstMessage || "",
                systemMessage: llm.systemMessage || "",
                serverUrl: llm.serverUrl || "",
                serverMessages: llm.serverMessages || [],
                metadata: llm.metadata || {},
                modalities: llm.modalities || [],
                tools: llm.tools || [],
                businessId: request.businessId,
                userId: request.userId,
                createdAt: moment().valueOf(),
                updatedAt: moment().valueOf()
            });
            await ad.save();

            RedisVentService.Assistant.triggerInsert("assistant", request.userId, ad.toObjectLowerCase());
            response.success = true;
            response.message = "Assistant created successfully";
        } catch (error) {
            logger.error("createAssistant error", { error: error?.message || error });
            response.success = false;
            response.message = "Failed to create assistant";
        }

        callback(null, response);

    },
    fetchAssistant:
        /**
       * @param {Object} call
       * @param {assistant.FetchAssistantRequest} call.request
       * @param {function} callback 
       */
        async function ({ request }, callback) {
            const response = new FetchAssistantResponse();
            try {
                const user = await Meteor.users.findOneAsync({ _id: request.userId });
                if (!user) {
                    response.success = false;
                    response.message = "User not found";
                    return callback(null, response);
                }
                const businessId = user.businessId;
                if (!businessId) {
                    response.success = false;
                    response.message = "Business ID not found";
                    return callback(null, response);
                }
                const assistants = await AssistantData.findAllByName(businessId, request.keywords, +request.lastBasis);
                assistants.forEach(assistant => {
                    response.assistants.push(assistant.toProto());
                });

                callback(null, response);
            } catch (error) {
                logger.error("fetchAssistant error", { error: error?.message || error });
                callback({
                    code: 500,
                    message: "Server instance not initialized!",
                    status: status.INTERNAL
                });
            }
        },
    updateAssistant:
        /**
         * @param {Object} call
         * @param {assistant.AssistantRequest} call.request
         * @param {function} callback 
         */
        async function ({ request }, callback) {
            const response = new AssistantResponse();
            try {
                if (!request.assistantIdLlm || request.assistantIdLlm === "") {
                    delete request.assistantIdLlm;
                }

                request.updatedAt = moment().valueOf();

                // Build update doc ONLY from provided values
                const isNonEmptyString = (s) => typeof s === "string" && s.trim() !== "";
                const mapKnowledgeBase = (kb) => {
                    if (!kb) return null;
                    if (typeof kb === "string") return { provider: "", id: kb };
                    if (typeof kb === "object") {
                        const out = { provider: kb.provider || "", id: kb.id || kb.collectionId || kb.collectionid || "" };
                        if (!isNonEmptyString(out.provider) && !isNonEmptyString(out.id)) return null;
                        return out;
                    }
                    return null;
                };
                const mapTranscriber = (tr) => {
                    if (!tr || typeof tr !== "object") return null;
                    const out = {
                        provider: tr.provider || "",
                        model: tr.model || "",
                        language: tr.language || "",
                        smartFormat: !!tr.smartFormat,
                        keywords: Array.isArray(tr.keywords) ? tr.keywords : []
                    };
                    const hasAny = out.provider || out.model || out.language || out.smartFormat || (out.keywords && out.keywords.length > 0);
                    return hasAny ? out : null;
                };
                const mapVoice = (v, provider) => {
                    if (!v) return null;
                    // Support both object and legacy string voice id
                    if (typeof v === "object") {
                        const out = { provider: v.provider || "", voiceId: v.voiceId || v.voiceid || "" };
                        if (!isNonEmptyString(out.provider) && !isNonEmptyString(out.voiceId)) return null;
                        return out;
                    }
                    if (typeof v === "string") {
                        const out = { provider: provider || "", voiceId: v };
                        if (!isNonEmptyString(out.provider) && !isNonEmptyString(out.voiceId)) return null;
                        return out;
                    }
                    return null;
                };
                const mapModel = (m, provider) => {
                    if (!m) return null;
                    // Support both object and legacy string model name
                    if (typeof m === "object") {
                        const out = { provider: m.provider || "", model: m.model || "" };
                        if (!isNonEmptyString(out.provider) && !isNonEmptyString(out.model)) return null;
                        return out;
                    }
                    if (typeof m === "string") {
                        const out = { provider: provider || "", model: m };
                        if (!isNonEmptyString(out.provider) && !isNonEmptyString(out.model)) return null;
                        return out;
                    }
                    return null;
                };

                const updateDoc = {};

                if (isNonEmptyString(request.name)) updateDoc.name = request.name;
                if (isNonEmptyString(request.description)) updateDoc.description = request.description;
                if (isNonEmptyString(request.firstMessage) || isNonEmptyString(request.firstmessage)) updateDoc.firstMessage = request.firstMessage || request.firstmessage;
                if (isNonEmptyString(request.systemMessage) || isNonEmptyString(request.systemmessage)) updateDoc.systemMessage = request.systemMessage || request.systemmessage;

                // Allow passing smallcaps fields via Struct metadata from client
                const metaObj = request.metadata && typeof request.metadata.toJavaScript === 'function' ? request.metadata.toJavaScript() : null;
                if (metaObj && typeof metaObj === 'object') {
                    if (isNonEmptyString(metaObj.description)) updateDoc.description = metaObj.description;
                    if (isNonEmptyString(metaObj.firstmessage)) updateDoc.firstMessage = metaObj.firstmessage;
                    if (isNonEmptyString(metaObj.systemmessage)) updateDoc.systemMessage = metaObj.systemmessage;
                }

                // Preserve existing knowledgeBase when client does not provide a valid id
                const kbVal = request.knowledgeBase;
                const kbMapped = mapKnowledgeBase(kbVal);
                if (kbMapped && (kbMapped.id && kbMapped.id.trim() !== "")) {
                    updateDoc.knowledgeBase = kbMapped;
                }

                const trMapped = mapTranscriber(request.transcriber);
                if (trMapped) updateDoc.transcriber = trMapped;

                const voiceMapped = mapVoice(
                    request.voiceObj || request.voiceobj || request.voice,
                    request.voiceProvider || request.voiceprovider
                );
                if (voiceMapped) updateDoc.voice = voiceMapped;

                const modelMapped = mapModel(
                    request.modelObj || request.modelobj || request.model,
                    request.modelProvider || request.modelprovider
                );
                if (modelMapped) updateDoc.model = modelMapped;

                if (Array.isArray(request.tools) && request.tools.length > 0) updateDoc.tools = request.tools;
                if (Array.isArray(request.modalities) && request.modalities.length > 0) updateDoc.modalities = request.modalities;
                if (Array.isArray(request.serverMessages) && request.serverMessages.length > 0) updateDoc.serverMessages = request.serverMessages;
                if (metaObj) updateDoc.metadata = metaObj;
                if (isNonEmptyString(request.serverUrl)) updateDoc.serverUrl = request.serverUrl;
                if (isNonEmptyString(request.kbId)) updateDoc.kbId = request.kbId;
                if (isNonEmptyString(request.kbCollectionId)) updateDoc.kbCollectionId = request.kbCollectionId;
                if (Array.isArray(request.toolIds) && request.toolIds.length > 0) updateDoc.toolIds = request.toolIds;

                // Only persist nested voice/model objects as per assistants schema; do not store provider strings at top-level
                if (isNonEmptyString(request.assistantIdLlm)) updateDoc.assistantIdLlm = request.assistantIdLlm;
                // Always bump updatedAt on successful update request
                updateDoc.updatedAt = request.updatedAt || moment().valueOf();

                // Load existing assistant to support preserving KB when not updated
                const existingAssistant = await AssistantData.findByAssistantId(request.assistantId);
                if (!updateDoc.knowledgeBase) {
                    // If not explicitly set in this update, keep existing value if any
                    if (existingAssistant && existingAssistant.knowledgeBase) {
                        updateDoc.knowledgeBase = existingAssistant.knowledgeBase;
                    } else {
                        updateDoc.knowledgeBase = { id: "", provider: "" };
                    }
                } else {
                    // If explicitly set but missing provider, keep previous provider when available
                    if ((!updateDoc.knowledgeBase.provider || updateDoc.knowledgeBase.provider.trim() === "") && existingAssistant && existingAssistant.knowledgeBase && existingAssistant.knowledgeBase.provider) {
                        updateDoc.knowledgeBase.provider = existingAssistant.knowledgeBase.provider;
                    }
                }

                const exist = await AssistantData.update(request.assistantId, updateDoc);
                if (!exist) {
                    response.success = false;
                    response.message = "Assistant not found";
                    return callback(null, response);
                }
                await Server.CustomAIAssistant.updateAssistant(request.assistantId, updateDoc);
                // Fetch the full updated document to emit a complete, lowercased payload expected by clients
                const updatedDoc = await AssistantData.findByAssistantId(request.assistantId);
                if (updatedDoc) {
                    RedisVentService.Assistant.triggerUpdate("assistant", request.userId, updatedDoc.toObjectLowerCase());
                } else {
                    // Fallback to emitting the partial doc (lowercased) with assistantId for client matching
                    RedisVentService.Assistant.triggerUpdate("assistant", request.userId, { assistantid: request.assistantId, ...exist.toObjectLowerCase?.() });
                }

                response.success = true;
                response.message = "Assistant updated successfully";
                return callback(null, response);
            } catch (error) {
                logger.error("updateAssistant error", { error: error?.message || error });
                response.success = false;
                response.message = "Failed to update assistant";
                return callback(null, response); // Still return a valid response object to the client
            }
        },
    fetchAssistantConfig: async function ({ request }, callback) {
        const response = new AssistantConfigResponse();
        try {

            response.apiKey = Server.Config.assistant.apiKey;
            response.serverUrl = Server.Config.assistant.serverUrl;

            callback(null, response);
        } catch (error) {
            callback({
                code: 500,
                message: "Server instance not initialized!",
                status: status.INTERNAL
            });
        }
    },
    fetchVoices: async function ({ request }, callback) {
        const response = new FetchVoicesResponse();
        try {
            const res = await Core.getDB("voices", true).find().toArray();

            if (res) {
                res.forEach(voice => {
                    const v = new AllVoices();
                    v.id = voice._id.toString();
                    v.name = voice.name || "";
                    v.voiceId = voice.voiceId || "";
                    v.provider = voice.provider || "";
                    response.voices.push(v);
                });
            }

            callback(null, response);
        } catch (error) {
            callback({
                code: 500,
                message: "Server instance not initialized!",
                status: status.INTERNAL
            });
        }
    }
};
