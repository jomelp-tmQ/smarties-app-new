import core from "@tmq-dev-ph/tmq-dev-core-client";
import { Meteor } from "meteor/meteor";
import { Watcher2 } from "../../Watcher2";
import Client from "../../Client";
import ToolsManager from "../../modules/ToolsManager";
import toolService from "../../../common/static_codegen/tmq/tool_pb";
import { Mongo } from "meteor/mongo";
import RedisventService from "../../redisvent/RedisventService";
import { toast } from 'sonner';
import { TOAST_STYLE } from "../../../common/const";
const { Adapter, Logger } = core;
const { ToolParameters, ToolHeaders, ToolMessages, ToolRequest, ToolParameterType, ToolMessageType, ToolServerConfig, ToolParameterProperties } = toolService;

Adapter.Meteor = Meteor;

const MESSAGE_TYPES = [
    'Request Start',
    'Request Complete',
    'Request Failed',
    'Request Response Delayed'
];

class ToolsWatcher extends Watcher2 {
    #data;
    #lastBasis;
    #processes = {};
    #listen
    constructor(parent) {
        super(parent);
        RedisventService.Tool.prepareCollection("tool");
        this.#data = RedisventService.Tool.getCollection("tool");
    }
    /**
     * @returns {Mongo.Collection}
     */
    get DB() {
        return this.#data;
    }

    async handleSaveTools(data) {
        try {
            const req = new ToolRequest();
            const requiredList = [];
            const propertyList = [];
            if (this.#processes["createTool"]) return;
            this.#processes["createTool"] = true;
            const param = new ToolParameters();
            if (data.parameters && data.parameters.length > 0) {
                param.setType(ToolParameterType.OBJECT);
                data.parameters.forEach(parameter => {
                    const paramProperties = new ToolParameterProperties();
                    paramProperties.setName(parameter.name);
                    paramProperties.setType(ToolParameterType[parameter.type]);
                    paramProperties.setDescription(parameter.description);
                    propertyList.push(paramProperties);
                    if (parameter.required) {
                        requiredList.push(parameter.name);
                    }
                });
                param.setPropertiesList(propertyList);
                param.setRequiredFieldsList(requiredList);
                param.setAdditionalproperties(data.parameters.additionalProperties);
                req.setParameters(param);
            }
            req.setName(data.name);
            req.setDescription(data.description);
            const serverConfig = new ToolServerConfig();
            serverConfig.setServerurl(data.serverUrl);
            serverConfig.setSecret(data.secretToken);
            serverConfig.setTimeout(data.timeout);
            req.setServerconfig(serverConfig);
            const headersList = [];
            if (data.headers && data.headers.length > 0) {
                data.headers.forEach(h => {
                    const header = new ToolHeaders();
                    header.setKey(h.key);
                    header.setValue(h.value);
                    headersList.push(header);
                });
            }
            req.setHeadersList(headersList);
            // const messagesList = [];
            // if (data.messages && data.messages.length > 0) {
            //     data.messages.forEach(m => {
            //         const message = new ToolMessages();
            //         message.setType(ToolMessageType[m.type]);
            //         message.setContent(m.content);
            //         messagesList.push(message);
            //     });
            // }
            // req.setMessagesList(messagesList);
            // req.setAsync(data.async);
            // req.setStrict(data.strict);
            req.setUserid(Accounts.userId());
            return this.Parent.callFunc(0x2152493d, req).then(({ err, result }) => {
                const deserialized = toolService.ToolResponse.deserializeBinary(result);
                toast.success('Create Tools Successfully', {
                    style: TOAST_STYLE.SUCCESS
                });
                return deserialized.toObject();
            }).finally(() => {
                this.#processes["createTool"] = false;
            });
        } catch (error) {
            Logger.showError("ToolsWatcher.handleSaveTools", error);
        }
    }

    async handleUpdateTools(data) {
        try {
            this.setValue("UpdateLoading", true);
            const req = new ToolRequest();
            const requiredList = [];
            const propertyList = [];
            if (this.#processes["updateTool"]) return;
            this.#processes["updateTool"] = true;
            const param = new ToolParameters();
            if (data.parameters && data.parameters.length > 0) {
                param.setType(ToolParameterType.OBJECT);
                data.parameters.forEach(parameter => {
                    const paramProperties = new ToolParameterProperties();
                    paramProperties.setName(parameter.name);
                    paramProperties.setType(ToolParameterType[parameter.type]);
                    paramProperties.setDescription(parameter.description);
                    propertyList.push(paramProperties);
                    if (parameter.required) {
                        requiredList.push(parameter.name);
                    }
                });
                param.setPropertiesList(propertyList);
                param.setRequiredFieldsList(requiredList);
                param.setAdditionalproperties(data.parameters.additionalProperties);
                req.setParameters(param);
            }
            req.setName(data.name);
            req.setDescription(data.description);
            const serverConfig = new ToolServerConfig();
            serverConfig.setServerurl(data.serverUrl);
            serverConfig.setSecret(data.secretToken);
            serverConfig.setTimeout(data.timeout);
            req.setServerconfig(serverConfig);
            const headersList = [];
            if (data.headers && data.headers.length > 0) {
                data.headers.forEach(h => {
                    const header = new ToolHeaders();
                    header.setKey(h.key);
                    header.setValue(h.value);
                    headersList.push(header);
                });
            }
            req.setHeadersList(headersList);
            const messagesList = [];
            if (data.messages && data.messages.length > 0) {
                data.messages.forEach(m => {
                    const message = new ToolMessages();
                    message.setType(ToolMessageType[m.type]);
                    message.setContent(m.content);
                    messagesList.push(message);
                });
            }
            req.setMessagesList(messagesList);
            req.setAsync(data.async);
            req.setStrict(data.strict);
            req.setUserid(Accounts.userId());
            req.setId(data.id);
            return this.Parent.callFunc(0x168a1ba5, req).then(({ err, result }) => {
                const deserialized = toolService.ToolResponse.deserializeBinary(result);
                toast.success('Update Tools Successfully', {
                    style: TOAST_STYLE.SUCCESS
                });
                return deserialized.toObject();
            }).finally(() => {
                this.#processes["updateTool"] = false;
                this.setValue("UpdateLoading", false);
            });
        } catch (error) {
            this.setValue("UpdateLoading", false);
            Logger.showError("ToolsWatcher.handleUpdateTools", error);
        }
    }


    get Tools() {
        return this.DB.find({}, { sort: { createdAt: -1 } }).fetch() || [];
    }

    async fetchAllTools({ isLoadmore = false, searchQuery = null } = {}) {
        try {
            if (!Accounts.userId()) {
                return [];
            }

            if (!isLoadmore) {
                this.#data.remove({});
                this.#lastBasis = null;
            }

            const req = new toolService.FetchToolsRequest();
            if (!Accounts.userId()) {
                return [];
            }
            req.setUserid(Accounts.userId());

            if (isLoadmore && this.#lastBasis) {
                req.setLastbasis(this.#lastBasis);
            }

            if (searchQuery) {
                req.setSearchquery(searchQuery);
            }

            if (this.#processes["fetchTools"]) return;
            this.#processes["fetchTools"] = true;
            return this.Parent.callFunc(0x410eff1d, req).then(({ err, result }) => {
                const deserialized = toolService.FetchToolsResponse.deserializeBinary(result);
                const parsed = deserialized.toObject();

                const parseMessages = (messages) => {
                    const getMessageType = (type) => {
                        switch (type) {
                            case ToolMessageType.REQUEST_COMPLETE:
                                return MESSAGE_TYPES[1];
                            case ToolMessageType.REQUEST_FAILED:
                                return MESSAGE_TYPES[2];
                            case ToolMessageType.REQUEST_RESPONSE_DELAYED:
                                return MESSAGE_TYPES[3];
                            default:
                                return MESSAGE_TYPES[0];
                        }
                    };

                    return messages.map(m => ({
                        type: getMessageType(m.type),
                        content: m.content,
                        conditions: m.conditionsList || []
                    }));
                };

                const parseParameters = (parameters) => {
                    const getParameterType = (type) => {
                        switch (type) {
                            case ToolParameterType.ARRAY:
                                return "array";
                            case ToolParameterType.BOOLEAN:
                                return "boolean";
                            case ToolParameterType.NUMBER:
                                return "number";
                            case ToolParameterType.STRING:
                                return "string";
                            case ToolParameterType.OBJECT:
                                return "object";
                            default:
                                return "unknown";
                        }
                    };

                    return {
                        type: getParameterType(parameters.type),
                        properties: parameters.propertiesList.map(p => ({
                            name: p.name,
                            type: getParameterType(p.type),
                            description: p.description,
                        })),
                        required: parameters.requiredFieldsList,
                        additionalProperties: parameters.additionalproperties
                    };
                };

                if (parsed.toolsList && parsed.toolsList.length > 0) {
                    parsed.toolsList.forEach(tool => {
                        const obj = {
                            id: tool.id,
                            name: tool.pb_function.name,
                            description: tool.pb_function.description,
                            messages: parseMessages(tool.messagesList),
                            parameters: parseParameters(tool.pb_function.parameters),
                            headers: tool.headersList.map(h => ({
                                key: h.key,
                                value: h.value
                            })),
                            async: tool.async,
                            strict: tool.pb_function.strict,
                            serverConfig: tool.serverconfig,
                            type: tool.type,
                            createdAt: tool.createdat,
                            updatedAt: tool.updatedat
                        };
                        this.DB.upsert({ id: tool.id }, { $set: obj });
                    });
                    this.#lastBasis = parsed.lastbasis;
                }
                this.setValue("isLoadingTools", false);
                return this.DB.find({}).fetch() || [];
            }).finally(() => {
                this.#processes["fetchTools"] = false;
            });
        } catch (error) {
            Logger.showError(error);
            this.#processes["fetchTools"] = false;
            return [];
        }
    }

    async fetchTool(toolId) {
        this.setValue("isFetchingTool", true);
        // const result = await ToolsManager.fetchTool(toolId);
        const result = this.DB.findOne({ id: toolId });
        this.setValue("currentTool", result);
        this.setValue("isFetchingTool", false);
    }


    listen() {
        if (!this.#listen) {
            this.#listen = RedisventService.Tool.listen("tool", Accounts.userId(), ({ event, data }) => {
                switch (event) {
                    case "remove":
                        this.DB.remove({ id: data._id });
                        break;
                    case "upsert":
                        const res = data.data;
                        const id = res._id;
                        delete res._id;
                        this.DB.upsert({ id: id }, { $set: res });
                        break;
                    case "update":
                        const updated = data.data;
                        delete updated._id;
                        this.DB.update({ id: updated.id }, { $set: updated });
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
        RedisventService.Tool.remove(this.#listen);
    }
}

export default new ToolsWatcher(Client);