import core from "@tmq-dev-ph/tmq-dev-core-client";
import { Meteor } from "meteor/meteor";
import { Watcher2 } from "../../Watcher2";
import Client from "../../Client";
const { Watcher, Adapter, Logger, Account, RedisVent } = core;
import assistantService from "../../../common/static_codegen/tmq/assistant_pb";
import kbService from "../../../common/static_codegen/tmq/knowledgeBase_pb";
import CallManager from "../../modules/CallManager";
import { TOAST_STYLE } from "../../../common/const";
import { toast } from 'sonner';
import { ChatBot } from "../Chatbot";
import { Mongo } from "meteor/mongo";
import { Assistant } from "@assistant/assistant-client";
import RedisventService from "../../redisvent/RedisventService";
import { ASSISTANT, ASSISTANT_VOICE_PROVIDER, defaultModel, defaultTranscriber, defaultvoiceConfiguration, defaultvoiceAdditionalConfiguration, defaulttools, analysis, defaultadvanced, CALL_STATUS, MODEL_KEYS, VOICE_KEYS, VOICE_ADDITIONAL_KEYS } from "../../../common/assistantConst";
import { Struct } from "google-protobuf/google/protobuf/struct_pb.js";
import CallBot from "../../modules/CallBot";
import widgetSession from "../../modules/WidgetSession";

// Adapter.Accounts = Accounts;
Adapter.Meteor = Meteor;
Adapter.Mongo = Mongo;
Adapter.DDP = DDP;

class AssistantWatcher extends Watcher2 {
    #delay = 1000;
    #count = 100;
    #voices = new Mongo.Collection(null);
    #assistants = new Mongo.Collection(null);
    #chatBot = null;
    #data;
    #lastBasis;
    #processes = {};
    #assitantConfig = null;
    #searchQuery = "";
    #listen = null;
    #businessId = null;
    #slug = null;
    constructor(parent) {
        super(parent);
        // DEFAULT VALUES
        this.setValue(ASSISTANT.MODEL, defaultModel);
        this.setValue(ASSISTANT.TRANSCRIBER, defaultTranscriber);
        this.setValue(ASSISTANT.VOICE_CONFIGURATION, defaultvoiceConfiguration);
        this.setValue(ASSISTANT.VOICE_ADDITIONAL_CONFIGURATION, defaultvoiceAdditionalConfiguration);
        this.setValue(ASSISTANT.TOOLS, defaulttools);
        this.setValue(ASSISTANT.ANALYSIS, analysis);
        this.setValue(ASSISTANT.ADVANCED, defaultadvanced);
        this.setValue("chats", []);

        // INITIALIZATION
        this.#chatBot = new ChatBot(this);
        this.callManager = null;
        this.assistantLlmManager = null;
        this.assistantId = "";
        this.callAssistantId = null;
        this.callAssistantPublicKey = null;
        this.currentVapiCall = CALL_STATUS.LIVE;
        this.initCallManager();
        this.initializeAssistantLlm();
        this.fetchAssistantConfig();
        this.listen();
        this._callBotListenersInitialized = false;
        RedisventService.Assistant.prepareCollection("assistant");
        this.#data = RedisventService.Assistant.getCollection("assistant");
        this.initLivekit();

        Accounts.getCurrentUser().then((user) => {
            this.#businessId = user.businessId;
            this.#slug = user.slug;
        }).catch((error) => {
            // log error on development
        });
    }
    get Voices() {
        const filter = { provider: "google" };
        const selectedAssistant = this.getSelectedAssistant();
        if (selectedAssistant) {
            filter.provider = selectedAssistant[ASSISTANT.VOICE_CONFIGURATION][VOICE_KEYS.PROVIDER];
        }
        return this.#voices.find(filter, { sort: { createdat: -1 } }).fetch() || [];
    }
    /**
     * @returns {Mongo.Collection}
     */
    get DB() {
        return this.#data;
    }

    get Assistants() {
        return this.DB.find({}, { sort: { createdat: -1 } }).fetch() || [];
    }
    /**
     * @returns {ChatBot}
     */
    get ChatBot() {
        return this.#chatBot;
    }
    get Model() {
        return {
            provider: [
                { value: 'openai', label: 'openai' },
                { value: 'deepgram', label: 'Deepgram' },
                { value: 'elevenLabs', label: 'Second choice' }
            ],
            model: [
                { value: 'gpt-3.5-turbo', label: 'gpt-3.5-turbo' },
                { value: 'deepgram', label: 'Deepgram' },
                { value: 'second', label: 'Second choice' },
                { value: 'third', label: 'Third choice' },
            ],
            files: [
                { value: 'string', label: 'Select one...' },
                { value: 'deepgram', label: 'Deepgram' },
                { value: 'second', label: 'Second choice' },
                { value: 'third', label: 'Third choice' },
            ],
            temperature: [],
            maxTokens: [
                { value: 'string', label: 'Select one...' },
                { value: 'deepgram', label: 'Deepgram' },
                { value: 'second', label: 'Second choice' },
                { value: 'third', label: 'Third choice' },
            ],
        };
    }

    async ensureConfig2() {
        const req = new proto.tmq.GetClientConfigRequest();
        return this.Parent.callFunc(0xbb9d4ba3, req).then(({ result }) => {
            const deserialized = proto.tmq.GetClientConfigResponse.deserializeBinary(result);
            const cfg = deserialized.toObject().config;
            const mapped = {
                auth: {
                    username: cfg.auth?.username || "",
                    password: cfg.auth?.password || ""
                },
                smartiesAssistant: {
                    isHumanUrl: cfg.client?.smartiesAssistant?.isHumanUrl || ""
                },
                suggestion: {
                    url: cfg.client?.suggestion?.url || "",
                    min: cfg.client?.suggestion?.min || 1,
                    max: cfg.client?.suggestion?.max || 1
                },
                predefinedAnswer: {
                    serverUrl: cfg.predefined?.serverurl || "",
                    apiKey: cfg.predefined?.apikey || "",
                    refreshEndpoint: cfg.predefined?.refreshendpoint || ""
                },
                livekit: {
                    serverUrl: cfg.livekit?.serverurl || ""
                }
            };
            return mapped;
        });
    }

    async initLivekit() {
        try {
            let serverUrl = null;
            const serverUrlFromDb = this.Settings.livekitServerUrl;

            if (serverUrlFromDb) {
                serverUrl = serverUrlFromDb;
            } else {
                const data = await this.ensureConfig2();
                const fallbackUrl = (this.Settings && (this.Settings.livekitServerUrl || (this.Settings.livekit && this.Settings.livekit.serverUrl)))
                    || (Meteor.settings && Meteor.settings.public && (Meteor.settings.public.livekitServerUrl || (Meteor.settings.public.livekit && Meteor.settings.public.livekit.serverUrl)))
                    || "";
                serverUrl = (data && data.livekit && data.livekit.serverUrl) || fallbackUrl;
            }
            if (serverUrl) CallBot.configure({ serverUrl });
            else toast.error('LiveKit server URL is not set', {
                style: TOAST_STYLE.ERROR
            });
        } catch (error) {
            Logger.showError("Failed to initialize LiveKit", error);
        }
    }

    getSelectedAssistant() {
        const selectedAssistant = this.getValue(ASSISTANT.SELECTED_ASSISTANT);
        if (!selectedAssistant) return null;
        return this.DB.findOne({ _id: selectedAssistant._id });
    }
    initialChat() {
        const assistantId = this.getValue(ASSISTANT.SELECTED_ASSISTANT).assistantid;
        this.ChatBot.onLoad(1000, 3, assistantId, this.#businessId);
    }

    setSession() {
        this.ChatBot.setSession();
    }

    handleSendChat(chat) {
        if (!chat) return;
        const assistantId = this.getValue(ASSISTANT.SELECTED_ASSISTANT).assistantid;
        this.ChatBot.askQuestion(chat, false, assistantId, this.#businessId);
    }

    initCallManager() {
        try {
            if (this.callManager) return;
            const callManagerConfig = Client.Settings;
            const publicKey = callManagerConfig.callAssistantPublicKey || "";

            if (!publicKey) {
                toast.error('Public key is not available. Please try again later.', {
                    style: TOAST_STYLE.ERROR
                });
                return;
            }

            if (!callManagerConfig) {
                toast.error('Call is not available. Please try again later.', {
                    style: TOAST_STYLE.ERROR
                });
                return;
            }
            this.callManager = new CallManager({ //#[x]: @szyrelle rename VapiCallManager to CallManager file and import name
                serverUrl: callManagerConfig.callAssistantServerUrl || "http://localhost:3050",
                token: publicKey,
                apiKey: callManagerConfig.callAssistantJwtApiKey || ""
            });
            this.callManager.onCallStatusChange((status) => {
                switch (status) {
                    case "starting":
                        this.setValue('isCallRinging', true);
                        break;
                    case "active":
                        this.setValue('callActive', true);
                        this.setValue('isAssistantTalking', false);
                        this.setValue('isCallRinging', false);
                        break;
                    default:
                        this.setValue('callActive', false);
                        this.setValue('isAssistantTalking', false);
                        this.setValue('isCallRinging', false);
                        this.callManager = null;
                        break;
                }
            });

            this.callManager.onSpeechStart(() => {
                this.setValue('isAssistantTalking', true);
            });

            this.callManager.onSpeechEnd(() => {
                this.setValue('isAssistantTalking', false);
            });

            this.callManager.onError((error) => {
                this.setValue('vapiError', error.message || "An error occurred with SMARTIE");
                this.setValue('isCallRinging', false);
                toast.error('An error occurred with SMARTIE', {
                    style: TOAST_STYLE.ERROR
                });
            });
        } catch (error) {
            toast.error('Failed to initialize VapiManager', {
                style: TOAST_STYLE.ERROR
            });
            this.setValue('vapiError', "Failed to initialize SMARTIE");
            this.setValue('isCallRinging', false);
        }
    }

    async initializeAssistantLlm() {
        if (this.assistantLlmManager) return;
        if (!this.#assitantConfig) this.#assitantConfig = await this.fetchAssistantConfig();
        this.assistantLlmManager = new Assistant({
            apiKey: this.#assitantConfig.apikey,
            serverUrl: this.#assitantConfig.serverurl
        });
    }

    setAssistantConfig(state, key, value) {
        try {
            const selectedAssistant = this.getSelectedAssistant();
            if (!selectedAssistant || !state) return;

            // Support both 2-arg form setAssistantConfig(state, value)
            // and 3-arg form setAssistantConfig(state, key, value)
            let nestedKey = key;
            let newValue = value;
            if (typeof value === "undefined") {
                newValue = key;
                nestedKey = null;
            }

            const $set = {};

            switch (state) {
                case ASSISTANT.NAME: {
                    $set[state] = newValue;
                    break;
                }
                case ASSISTANT.DESCRIPTION: {
                    $set[state] = newValue;
                    break;
                }
                case ASSISTANT.FIRST_MESSAGE: {
                    $set[state] = newValue;
                    break;
                }
                case ASSISTANT.SYSTEM_PROMPT: {
                    $set[state] = newValue;
                    break;
                }
                case ASSISTANT.KNOWLEDGE_BASE: {
                    // Persist selected knowledge base id directly
                    $set[state] = newValue;
                    break;
                }
                case ASSISTANT.MODEL: {
                    if (nestedKey) {
                        $set[`${state}.${nestedKey}`] = newValue;
                    } else if (typeof newValue === "object" && newValue) {
                        // Replace/merge whole model config if object provided
                        $set[state] = { ...selectedAssistant[state], ...newValue };
                    }
                    break;
                }
                case ASSISTANT.VOICE_CONFIGURATION: {
                    // Normalize potential legacy key "voice" -> VOICE_ID
                    if (nestedKey === "voice") nestedKey = VOICE_KEYS.VOICE_ID;
                    if (nestedKey) {
                        $set[`${state}.${nestedKey}`] = newValue;
                    } else if (typeof newValue === "object" && newValue) {
                        $set[state] = { ...selectedAssistant[state], ...newValue };
                    }
                    break;
                }
                case ASSISTANT.TOOLS: {
                    if (Array.isArray(newValue)) {
                        $set[state] = newValue;
                    }
                    break;
                }
                case ASSISTANT.TRANSCRIBER: {
                    if (nestedKey) {
                        $set[`${state}.${nestedKey}`] = newValue;
                    } else if (typeof newValue === "object" && newValue) {
                        $set[state] = { ...selectedAssistant[state], ...newValue };
                    }
                    break;
                }
                default: {
                    if (nestedKey) {
                        $set[`${state}.${nestedKey}`] = newValue;
                    } else {
                        $set[state] = newValue;
                    }
                }
            }

            if (Object.keys($set).length === 0) return;
            this.DB.update({ _id: selectedAssistant._id }, { $set });
            this.activateWatch();
        } catch (error) {
            Logger.showError("setAssistantConfig failed", error);
        }
    }

    /**
     * Creates a new assistant
     * @param {Object} data - Assistant configuration
     * @param {string} data.name - Name of the assistant
     * @param {string} [data.description] - Description of the assistant
     * @param {Object} [data.voice] - Voice configuration
     * @param {string} [data.voice.provider] - Voice provider ('vapi', '11labs', 'deepgram')
     * @param {string} [data.voice.voiceId] - Voice ID (e.g., 'Elliot', 'Rachel')
     * @param {Object} [data.model] - Model configuration
     * @param {string} [data.model.provider] - Model provider ('openai', 'google', 'vapi')
     * @param {string} [data.model.model] - Model ID (e.g., 'gpt-3.5-turbo', 'gpt-4')
     */

    async createAssistant(data) {
        this.setValue("isLoadingCreate", true);
        if (this.#processes["createAssistant"]) return;
        this.#processes["createAssistant"] = true;
        const config = await this.fetchAssistantConfig();
        if (!config.apikey || !config.serverurl) {
            toast.error('Failed to create assistant', {
                style: TOAST_STYLE.ERROR
            });
            return;
        }
        await this.initializeAssistantLlm(config);
        if (this.assistantLlmManager) {
            const req = new assistantService.AssistantRequest();
            req.setName(data.name);
            req.setBusinessid(Client.CurrentUser.businessId);
            req.setUserid(Client.CurrentUser._id);


            return this.Parent.callFunc(0x56950f9c, req).then(({ err, result }) => {
                if (err) {
                    toast.error('Failed to create assistant', {
                        style: TOAST_STYLE.ERROR
                    });
                    return;
                }
                const deserialized = assistantService.AssistantResponse.deserializeBinary(result);
                return deserialized.toObject();
            }).catch((error) => {
                toast.error('Failed to create assistant', {
                    style: TOAST_STYLE.ERROR
                });
                return;
            }).finally(() => {
                this.#processes["createAssistant"] = false;
                this.setValue("isLoadingAssistants", false);
                this.setValue("isLoadingCreate", false);
            });
        }
    }
    async getLLMAssistant(assistantId) {
        if (!this.assistantLlmManager)
            await this.initializeAssistantLlm();
        return this.assistantLlmManager.getAssistant(assistantId).then((assistant) => {
            this.#assistants.upsert({ id: assistant.id }, { $set: assistant });
            return assistant;
        });
    }
    async fetchAllAssistants({ isLoadmore = false } = {}) {
        if (!this.#businessId) {
            Accounts.getCurrentUser().then((user) => {
                this.#businessId = user.businessId;
            }).catch((error) => {
            });
        }
        try {
            if (!isLoadmore) {
                this.#data.remove({});
                this.#lastBasis = null;
            }

            if (this.#processes["fetchAssistant"]) return;
            this.#processes["fetchAssistant"] = true;
            const req = new assistantService.FetchAssistantRequest();
            req.setKeywords(this.#searchQuery || "");
            if (this.#lastBasis) {
                req.setLastbasis(this.#lastBasis);
            }
            req.setUserid(Client.CurrentUser._id);
            return this.Parent.callFunc(0xfb1ded5a, req).then(({ result }) => {
                const deserialized = assistantService.FetchAssistantResponse.deserializeBinary(result);
                const res = deserialized.toObject();
                const data = res.assistantsList;
                const lastBasis = res.lastbasis;
                this.#lastBasis = lastBasis;
                const proc = [];
                if (data && data.length) {
                    data.forEach(item => {
                        this.DB.upsert({ id: item.id }, { $set: item });
                        if (!this.#assistants.findOne({ id: item.assistantid })) {
                            proc.push(this.getLLMAssistant(item.assistantid));
                        }
                    });
                }
                return Promise.all(proc);
                // return res;
            }).finally(() => {
                this.#processes["fetchAssistant"] = false;
                this.setValue("isLoadingAssistants", false);
            });
        } catch (error) {
            toast.error('Failed to fetch assistants', {
                style: TOAST_STYLE.ERROR
            });
        }
    }

    searchAssistants(query) {
        this.#searchQuery = query;
        this.fetchAllAssistants();
    }

    async getAssistant(assistantId) {
        this.setValue("isAssistantSectionOpen", false);
        if (!this.assistantLlmManager) {
            await this.initializeAssistantLlm();
        }
        const result = await this.assistantLlmManager.getAssistant(assistantId);
        this.setValue(ASSISTANT.SELECTED_ASSISTANT, result);
        // const result = await this.vm.getAssistant(assistantId);
        // this.setValue(ASSISTANT.SELECTED_ASSISTANT, result);
        this.setValue("isAssistantSectionOpen", true);
    }

    async publishAssistant() {
        this.setValue("LoadingPublishAssistant", true);
        if (this.#processes["publishAssistant"]) return;
        this.#processes["publishAssistant"] = true;
        const selectedAssistant = this.getSelectedAssistant();

        // #TODOS: UPDATE TOOLS AND KNOWLEDGE BASE
        // UPDATE LLM ASSISTANT

        // const config = await this.fetchAssistantConfig();
        // if (!config.apikey || !config.serverurl) {
        //     toast.error('Failed to create assistant', {
        //         style: TOAST_STYLE.ERROR
        //     });
        //     return;
        // }
        // this.initializeAssistantLlm(config);
        // console.log("selectedAssistant", selectedAssistant);
        // const generateTools = (selectedTools) => {
        //     const tools = [];

        //     let server = {};
        //     selectedTools.forEach(tool => {
        //         if (tool.serverConfig.serverurl) {
        //             server = {
        //                 url: tool.serverConfig.serverurl,
        //                 secret: tool.serverConfig.secret || "",
        //                 timeout: tool.serverConfig.timeout || 30000
        //             };
        //         }

        //         // Transform parameters structure
        //         const transformedParameters = {
        //             type: "object",
        //             properties: {},
        //             required: tool.parameters.required || [],
        //             additionalProperties: false
        //         };

        //         // Handle properties array
        //         if (Array.isArray(tool.parameters.properties)) {
        //             tool.parameters.properties.forEach(prop => {
        //                 transformedParameters.properties[prop.name] = {
        //                     type: prop.type,
        //                     ...(prop.description ? { description: prop.description } : {}),
        //                     ...(prop.type === 'object' ? { additionalProperties: false } : {})
        //                 };
        //             });
        //         }

        //         tools.push({
        //             "type": "function",
        //             "function": {
        //                 "name": tool.name,
        //                 "description": tool.description,
        //                 "parameters": transformedParameters,
        //                 "strict": tool.strict || false
        //             },
        //             "server": {
        //                 "url": tool.serverConfig.serverurl
        //             }
        //         });
        //     });
        //     return tools;
        // };

        // const tools = generateTools(selectedTools);


        const req = new assistantService.AssistantRequest();
        req.setAssistantid(selectedAssistant.assistantid);
        req.setAssistantidllm(selectedAssistant.assistantidllm);
        if (selectedAssistant.name) req.setName(selectedAssistant.name);

        // Model message
        const modelCfg = selectedAssistant[ASSISTANT.MODEL] || {};
        if (modelCfg) {
            const modelMsg = new assistantService.Model();
            if (modelCfg.provider || selectedAssistant.modelprovider) modelMsg.setProvider(modelCfg.provider || selectedAssistant.modelprovider || "");
            if (modelCfg.model || selectedAssistant.model) modelMsg.setModel(modelCfg.model || selectedAssistant.model || "");
            req.setModel(modelMsg);
        }

        // Voice message
        const voiceCfg = selectedAssistant[ASSISTANT.VOICE_CONFIGURATION] || {};
        if (voiceCfg) {
            const voiceMsg = new assistantService.Voice();
            if (voiceCfg.provider || selectedAssistant.voiceprovider) voiceMsg.setProvider(voiceCfg.provider || selectedAssistant.voiceprovider || "");
            if (voiceCfg.voiceId || voiceCfg.voiceid || selectedAssistant.voice) voiceMsg.setVoiceid(voiceCfg.voiceId || voiceCfg.voiceid || selectedAssistant.voice || "");
            if (voiceCfg.voiceName || voiceCfg.voicename || voiceCfg.name) voiceMsg.setName(voiceCfg.voiceName || voiceCfg.voicename || voiceCfg.name || "");
            req.setVoice(voiceMsg);
        }

        // Direct fields
        if (selectedAssistant[ASSISTANT.DESCRIPTION]) req.setDescription(selectedAssistant[ASSISTANT.DESCRIPTION]);
        if (selectedAssistant[ASSISTANT.FIRST_MESSAGE]) req.setFirstmessage(selectedAssistant[ASSISTANT.FIRST_MESSAGE]);
        if (selectedAssistant[ASSISTANT.SYSTEM_PROMPT]) req.setSystemmessage(selectedAssistant[ASSISTANT.SYSTEM_PROMPT]);
        if (selectedAssistant.serverurl || selectedAssistant.serverUrl) req.setServerurl(selectedAssistant.serverurl || selectedAssistant.serverUrl);

        // Optional: carry metadata as struct if present
        if (selectedAssistant.metadata && typeof selectedAssistant.metadata === 'object') {
            try {
                const metaStruct = Struct.fromJavaScript(selectedAssistant.metadata);
                req.setMetadata(metaStruct);
            } catch (_) { /* noop */ }
        }

        req.setBusinessid(Client.CurrentUser.businessId);
        req.setUserid(Client.CurrentUser._id);
        if (selectedAssistant.tools) {
            const tools = selectedAssistant.tools.map(tool => {
                const toolMsg = new assistantService.Tool();
                toolMsg.setType(tool.type);
                toolMsg.setFunction(Struct.fromJavaScript(tool.function));
                return toolMsg;
            });
            req.setToolsList(tools);
        }

        // Only send knowledgeBase when we have a valid id; support string or object shapes
        const kbVal = selectedAssistant[ASSISTANT.KNOWLEDGE_BASE];
        if (kbVal) {
            let kbId = "";
            let kbProvider = "";
            if (typeof kbVal === "string") {
                kbId = kbVal;
            } else if (typeof kbVal === "object") {
                kbId = kbVal.id || kbVal.collectionId || kbVal.collectionid || "";
                kbProvider = kbVal.provider || "";
            }
            if (kbId && kbId.trim() !== "") {
                const kb = new assistantService.KnowledgeBase();
                kb.setProvider(kbProvider || "smarty");
                kb.setId(kbId);
                req.setKnowledgebase(kb);
            }
        }

        return this.Parent.callFunc(0xcf55909, req).then(({ err, result }) => {
            if (err) {
                toast.error('Failed to publish assistant', {
                    style: TOAST_STYLE.ERROR
                });
                return;
            }
            const deserialized = assistantService.AssistantResponse.deserializeBinary(result);
            const response = deserialized.toObject();
            if (response.success) {
                toast.success('Assistant published successfully', {
                    style: TOAST_STYLE.SUCCESS
                });
                this.setValue("LoadingPublishAssistant", false);
                this.#processes["publishAssistant"] = false;
            } else {
                toast.error('Failed to publish assistant', {
                    style: TOAST_STYLE.ERROR
                });
                this.setValue("LoadingPublishAssistant", false);
                this.#processes["publishAssistant"] = false;
            }
        });
    }

    // talkToAssistant() {
    //     this.initCallManager();
    //     try {
    //         // Start the call with SMARTIE
    //         this.setValue('isCallLoading', true);
    //         const assistantId = this.getValue(ASSISTANT.SELECTED_ASSISTANT).id;
    //         const assistantName = this.getValue(ASSISTANT.SELECTED_ASSISTANT).name;

    //         this.callManager.startCall(assistantId).then(() => {
    //             toast.success(`Call started with ${assistantName}`, {
    //                 style: TOAST_STYLE.SUCCESS
    //             });
    //             this.setValue('isCallLoading', false);
    //         }).catch((error) => {    
    //             toast.error('Failed to start call with SMARTIE', {
    //                 style: TOAST_STYLE.ERROR
    //             });
    //             this.setValue('vapiError', error.message || "Failed to start call with SMARTIE");
    //             this.setValue('isCallLoading', false);
    //         });
    //     } catch (error) {
    //         toast.error('Failed to start call with SMARTIE', {
    //             style: TOAST_STYLE.ERROR
    //         });
    //         this.setValue('vapiError', error.message || "Failed to start call with SMARTIE");
    //     }
    // }

    async talkToAssistant() {
        // If call is already active, do nothing
        if (this.getValue('callActive')) return;
        await this.initLivekit();

        // Clear previous errors and show ringing
        this.setValue('vapiError', null);
        this.setValue('isCallLoading', true);

        // Wire CallBot listeners once
        if (!this._callBotListenersInitialized) {
            this._callBotListenersInitialized = true;

            CallBot.on('connected', () => {
                this.setValue('isCallLoading', false);
                this.setValue('callActive', true);
            });

            CallBot.on('disconnected', (data) => {
                this.setValue('callActive', false);
                this.setValue('isCallLoading', false);
            });

            CallBot.on('error', (error) => {
                this.setValue('callActive', false);
                this.setValue('isCallLoading', false);
                toast.error('An error occurred with SMARTIE', {
                    style: TOAST_STYLE.ERROR
                });
            });

            // CallBot.on('botSpeakingState', (state) => {
            // });

            // // Optional: forward transcripts to widget session API when available
            CallBot.on('userTranscription', (data) => {
                try {
                    if (!data || !data.text) return;
                    widgetSession.sendInbound({ businessId: this.#businessId, message: data.text, type: 'call' }).catch(() => { });
                } catch { }
            });
            CallBot.on('assistantTranscription', (data) => {
                try {
                    if (!data || !data.text) return;
                    widgetSession.sendOutbound({ businessId: this.#businessId, message: data.text, type: 'call', isBot: true }).catch(() => { });
                } catch { }
            });
        }

        const selectedAssistant = this.getSelectedAssistant();
        // Start LiveKit-based call via CallBot
        const host = this.Settings.host || "https://app.smarties.ai";
        let slug = this.#slug;
        if (!slug) {
            slug = await Accounts.getCurrentUser().then((user) => {
                this.#businessId = user.businessId;
                this.#slug = user.slug;
                return user.slug;
            }).catch((error) => {
                // log error on development
            });
        }
        CallBot.startCall({
            hook: `${host}/api/b/${slug}/channels/messages/recording-update`,
            assistantId: selectedAssistant.assistantid,
        }).catch((error) => {
            toast.error('Failed to start call with SMARTIE', {
                style: TOAST_STYLE.ERROR
            });
        });
    }


    // endCall() {
    //     if (this.callManager) this.callManager.stopCall();
    //     this.setValue('isCallLoading', false);
    // }

    async endCall() {
        // Stop LiveKit call if active
        try {
            // const currentRoom = this.getValue(CHAT_SMARTIE.CURRENT_ROOM);
            await CallBot.stopCall();
            // widgetSession.sendInbound({ siteId: Client.Settings.siteId, message: "Call ended", type: 'call', room: currentRoom, transcriptId: null, isCallEnded: true }).catch(() => { });
        } catch { }
        if (this.vapiManager) {
            this.vapiManager.stopCall();
        }
        this.assistantId = "";
        this.publicKey = "";
        this.#count = 100;
        this.#delay = 1000;
    }

    async fetchAssistantConfig() {
        if (this.#assitantConfig) return this.#assitantConfig;
        const req = new assistantService.AssistantConfigRequest();
        return this.Parent.callFunc(0xb59511c6, req).then(({ result }) => {
            const deserialized = assistantService.AssistantConfigResponse.deserializeBinary(result);
            const config = deserialized.toObject();
            if (config.serverurl && !config.serverurl.includes("localhost"))
                if (config.serverurl) this.#assitantConfig = config;
            return config;
        });
    }

    fetchVoices() {
        if (this.#processes["fetchVoices"] || this.Voices.length > 0) return;
        this.#processes["fetchVoices"] = true;
        const req = new assistantService.FetchVoicesRequest();
        req.setVoiceprovider("smarty");
        return this.Parent.callFunc(0x2ff8d88c, req).then(({ result }) => {
            const deserialized = assistantService.FetchVoicesResponse.deserializeBinary(result);
            const res = deserialized.toObject();
            res.voicesList.forEach(voice => {
                this.#voices.upsert({ _id: voice.id }, {
                    _id: voice.id,
                    name: voice.name,
                    voiceid: voice.voiceId,
                    provider: voice.provider
                });
            });
            this.activateWatch();
            return res.voicesList;
        }).catch((error) => {
            Logger.showError("Failed to fetch voices", error);
            toast.error('Failed to fetch voices', {
                style: TOAST_STYLE.ERROR
            });
        }).finally(() => {
            this.#processes["fetchVoices"] = false;
        });
    }

    listen() {
        if (!this.#listen && Client.CurrentUser) {
            this.#listen = RedisventService.Assistant.listen("assistant", Client.CurrentUser._id, ({ event, data }) => {
                switch (event) {
                    case "remove":
                        this.DB.remove({ id: data._id });
                        break;
                    case "upsert":
                        break;
                    case "update":
                        const updateData = data.data;
                        delete updateData._id;
                        this.DB.update(
                            { assistantid: updateData.assistantid },
                            { $set: updateData }
                        );
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
        RedisventService.Assistant.remove(this.#listen);
    }
}
export default new AssistantWatcher(Client);