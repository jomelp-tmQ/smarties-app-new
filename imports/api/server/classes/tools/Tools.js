import { Adapter, Core, Utilities } from "@tmq-dev-ph/tmq-dev-core-server";
import { tmq as tool } from "../../../common/static_codegen/tmq/tool";
import moment from "moment";
import { logger as baseLogger } from "../../utils/serverUtils.js";
const { ToolResponse, Tools, FetchToolsResponse, ToolRequest, ToolParameters, ToolHeaders, ToolMessages, ToolServerConfig, ToolParameterProperties, ToolParameterType, ToolFunction } = tool;

export class ToolsTemplate {
    #serverConfig = {
        serverUrl: "",
        secret: "",
        timeout: 30
    };
    #type = "function";
    #function = {
        name: "",
        description: "",
        parameters: {},
        strict: false
    };
    #messages = [];
    #createdAt = 0;
    #updatedAt = 0;
    #headers = [];
    #id = "";
    #userId = "";
    #async = false;
    #index1 = "";
    constructor(doc) {
        if (doc) this.parseDocument(doc);
    }
    async createTool(doc) {
        const getParameterType = (type) => {
            switch (type) {
                case ToolParameterType.STRING:
                    return "string";
                case ToolParameterType.NUMBER:
                    return "number";
                case ToolParameterType.BOOLEAN:
                    return "boolean";
                case ToolParameterType.ARRAY:
                    return "array";
                case ToolParameterType.OBJECT:
                    return "object";
            }
        };
        try {
            if (doc.name) this.#function.name = doc.name;
            if (doc.description) this.#function.description = doc.description;
            if (doc.parameters) {
                const parameters = new ToolParameters();
                if (doc.parameters.properties) {
                    for (const parameter of doc.parameters.properties) {
                        const parameterProperties = new ToolParameterProperties();
                        if (parameter.name) parameterProperties.name = parameter.name;
                        if (parameter.type) parameterProperties.type = ToolParameterType[parameter.type];
                        if (parameter.description) parameterProperties.description = parameter.description;
                        parameters.properties.push(parameterProperties);
                    }
                }
                if (doc.parameters.required_fields) {
                    parameters.required_fields = doc.parameters.required_fields;
                }
                if (doc.parameters.additionalProperties) {
                    parameters.additionalProperties = doc.parameters.additionalProperties;
                }
                this.#function.parameters = {
                    type: getParameterType(parameters.type),
                    properties: {},
                    required: parameters.required_fields,
                    additionalProperties: parameters.additionalProperties
                };
                if (parameters.properties.length > 0) {
                    for (const property of parameters.properties) {
                        this.#function.parameters.properties[property.name] = {
                            type: getParameterType(property.type),
                            description: property.description
                        };
                    }
                }
            }
            if (doc.strict) this.#function.strict = doc.strict;
            if (doc.serverConfig) this.#serverConfig = new ToolServerConfig({
                secret: doc.serverConfig.secret,
                serverUrl: doc.serverConfig.serverUrl,
                timeout: doc.serverConfig.timeout
            }).toObject();
            if (doc.type) this.#type = doc.type;
            if (doc.messages) {
                for (const message of doc.messages) {
                    const messageProperties = new ToolMessages();
                    if (message.type) messageProperties.type = message.type;
                    if (message.content) messageProperties.content = message.content;
                    this.#messages.push(messageProperties);
                }
                this.#messages = this.#messages.map(message => message.toObject());
            }
            if (doc.headers) {
                for (const header of doc.headers) {
                    const headerProperties = new ToolHeaders();
                    if (header.key) headerProperties.key = header.key;
                    if (header.value) headerProperties.value = header.value;
                    this.#headers.push(headerProperties);
                }
                this.#headers = this.#headers.map(header => header.toObject());
            }
            if (doc.async) this.#async = doc.async;
            if (doc.createdAt) this.#createdAt = doc.createdAt;
            if (doc.updatedAt) this.#updatedAt = doc.updatedAt;
            if (doc.userId) this.#userId = doc.userId;
            if (doc.index1) this.#index1 = doc.index1;
            return await this.save();
        } catch (error) {
            const logger = baseLogger.child({ service: 'classes/tools/Tools.js' });
            logger.error('ToolsTemplate.createTool failed', { error: error?.message || error });
            return null;
        }
    }

    async updateTool(doc) {
        try {
            if (!doc.id) {
                throw new Error("Tool ID is required for update");
            }

            // Update only the fields that are provided
            if (doc.name) this.#function.name = doc.name;
            if (doc.description) this.#function.description = doc.description;
            if (doc.parameters) {
                const parameters = new ToolParameters();
                if (doc.parameters.properties) {
                    for (const parameter of doc.parameters.properties) {
                        const parameterProperties = new ToolParameterProperties();
                        if (parameter.name) parameterProperties.name = parameter.name;
                        if (parameter.type) parameterProperties.type = ToolParameterType[parameter.type];
                        if (parameter.description) parameterProperties.description = parameter.description;
                        parameters.properties.push(parameterProperties);
                    }
                }
                if (doc.parameters.required_fields) {
                    parameters.required_fields = doc.parameters.required_fields;
                }
                if (doc.parameters.additionalProperties) {
                    parameters.additionalProperties = doc.parameters.additionalProperties;
                }
                this.#function.parameters = {
                    type: this.getParameterType(parameters.type),
                    properties: {},
                    required: parameters.required_fields,
                    additionalProperties: parameters.additionalProperties
                };
                if (parameters.properties.length > 0) {
                    for (const property of parameters.properties) {
                        this.#function.parameters.properties[property.name] = {
                            type: this.getParameterType(property.type),
                            description: property.description
                        };
                    }
                }
            }
            if (doc.strict !== undefined) this.#function.strict = doc.strict;
            if (doc.serverConfig) this.#serverConfig = new ToolServerConfig({
                secret: doc.serverConfig.secret,
                serverUrl: doc.serverConfig.serverUrl,
                timeout: doc.serverConfig.timeout
            }).toObject();
            if (doc.type) this.#type = doc.type;
            if (doc.messages) {
                this.#messages = [];
                for (const message of doc.messages) {
                    const messageProperties = new ToolMessages();
                    if (message.type) messageProperties.type = message.type;
                    if (message.content) messageProperties.content = message.content;
                    this.#messages.push(messageProperties);
                }
                this.#messages = this.#messages.map(message => message.toObject());
            }
            if (doc.headers) {
                this.#headers = [];
                for (const header of doc.headers) {
                    const headerProperties = new ToolHeaders();
                    if (header.key) headerProperties.key = header.key;
                    if (header.value) headerProperties.value = header.value;
                    this.#headers.push(headerProperties);
                }
                this.#headers = this.#headers.map(header => header.toObject());
            }
            if (doc.async !== undefined) this.#async = doc.async;

            // Update the timestamp
            this.#updatedAt = moment().valueOf();

            // Save the changes
            const res = await Core.getDB("tools", false).updateAsync(
                { _id: Utilities.toObjectId({ _str: doc.id }) },
                { $set: this.toJSJON() },
            );
            return await Core.getDB("tools", false).findOneAsync({ _id: Utilities.toObjectId({ _str: doc.id }) });
        } catch (error) {
            const logger = baseLogger.child({ service: 'classes/tools/Tools.js' });
            logger.error('ToolsTemplate.updateTool failed', { error: error?.message || error });
            return null;
        }
    }

    getParameterType(type) {
        switch (type) {
            case ToolParameterType.STRING:
                return "string";
            case ToolParameterType.NUMBER:
                return "number";
            case ToolParameterType.BOOLEAN:
                return "boolean";
            case ToolParameterType.ARRAY:
                return "array";
            case ToolParameterType.OBJECT:
                return "object";
        }
    }

    parseDocument(doc) {
        if (doc.id) this.#id = doc.id;
        if (!this.#id) this.#id = doc._id.toString();
        if (doc.serverConfig) this.#serverConfig = doc.serverConfig;
        if (doc.type) this.#type = doc.type;
        if (doc.function) this.#function = doc.function;
        if (doc.messages) this.#messages = doc.messages;
        if (doc.headers) this.#headers = doc.headers;
        if (doc.createdAt) this.#createdAt = doc.createdAt;
        if (doc.updatedAt) this.#updatedAt = doc.updatedAt;
        if (doc.userId) this.#userId = doc.userId;
        if (doc.async) this.#async = doc.async;
        if (doc.index1) this.#index1 = doc.index1;
    }
    toJSJON() {
        return {
            serverConfig: this.#serverConfig,
            type: this.#type,
            function: this.#function,
            messages: this.#messages,
            headers: this.#headers,
            createdAt: this.#createdAt,
            updatedAt: this.#updatedAt,
            userId: this.#userId,
            async: this.#async,
            index1: this.#index1,
        };
    }
    toProto() {
        const tool = new Tools();
        const parameters = new ToolParameters();
        if (this.#function.parameters) {
            for (const key in this.#function.parameters.properties) {
                const property = this.#function.parameters.properties[key];
                const parameterProperties = new ToolParameterProperties();
                parameterProperties.name = key;
                parameterProperties.type = property.type;
                parameterProperties.description = property.description;
                parameters.properties.push(parameterProperties);
            }
            parameters.required_fields = this.#function.parameters.required;
        }
        tool.id = this.#id;
        tool.function = new ToolFunction({
            name: this.#function.name,
            description: this.#function.description,
            parameters: parameters,
            strict: this.#function.strict
        });
        tool.serverConfig = new ToolServerConfig({
            secret: this.#serverConfig.secret,
            serverUrl: this.#serverConfig.serverUrl,
            timeout: this.#serverConfig.timeout
        });
        tool.type = this.#type;
        tool.messages = this.#messages.map(message => new ToolMessages({
            type: message.type,
            content: message.content
        }));
        tool.headers = this.#headers.map(header => new ToolHeaders({
            key: header.key,
            value: header.value
        }));
        tool.userId = this.#userId;
        tool.async = this.#async;
        return tool;
    }
    waitServer() {
        return new Promise(resolve => {
            const { ServerInstance } = Adapter;
            if (ServerInstance) {
                if (ServerInstance.IsReady) resolve();
            } else resolve();
        });
    }
    async save() {
        try {
            // await this.waitServer();
            return await Core.getDB("tools", true).insertOne(this.toJSJON());
        } catch (error) {
            const logger = baseLogger.child({ service: 'classes/tools/Tools.js' });
            logger.error('ToolsTemplate.save failed', { error: error?.message || error });
            return null;
        }
    }
}