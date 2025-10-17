import { Adapter, Core, Utilities } from "@tmq-dev-ph/tmq-dev-core-server";
import { status } from "@grpc/grpc-js";
import { tmq as tool } from "../../common/static_codegen/tmq/tool";
import moment from "moment";
import { ToolsTemplate } from "../classes/tools/Tools";
import RedisVentService from "../classes/events/RedisVentService";
import { logger as baseLogger } from "../utils/serverUtils";
const logger = baseLogger.child({ service: 'services/ToolService.js' });

const { ToolResponse, Tools, FetchToolsResponse, ToolRequest, ToolParameters, ToolHeaders, ToolMessages } = tool;

export default {
    /**
    * @param {Object} call
    * @param {tool.ToolRequest} call.request
    * @param {function} callback 
    */
    createTool: async function ({ request }, callback) {
        const response = new ToolResponse();
        try {
            const { ServerInstance } = Adapter;
            if (!ServerInstance) {
                callback({
                    code: 500,
                    message: "Server instance not initialized!",
                    status: status.INTERNAL
                });
            } else {
                let objectData = {
                    ...request,
                    userId: request.userId,
                    createdAt: moment().valueOf(),
                    updatedAt: moment().valueOf(),
                    index1: request.name + moment().valueOf(),
                };
                try {
                    const tool = new ToolsTemplate();
                    const result = await tool.createTool(objectData);
                    function transformData(raw) {
                        const {
                            _id, name, parameters, messages, headers,
                            async: isAsync, strict, serverConfig,
                            createdAt, updatedAt, index1
                        } = raw;

                        const firstProp = parameters.properties[0] || {};
                        const paramNames = parameters.properties.map(p => p.name);
                        const requiredNames = parameters.required_fields || [];

                        return {
                            id: _id,
                            name,
                            description: firstProp.description || "",
                            // messages: messages.map(m => ({
                            //     type: m.type
                            //         .split(/[_\s]+/)
                            //         .map(w => w[0] + w.slice(1).toLowerCase())
                            //         .join(" "),
                            //     content: m.content || "",
                            //     conditions: m.conditions
                            // })),
                            parameters: {
                                type: (firstProp.type || "").toLowerCase(),
                                properties: parameters.properties.map(p => ({
                                    name: p.name,
                                    type: p.type.toLowerCase(),
                                    description: p.description,
                                    required: requiredNames.includes(p.name)
                                })),
                                required: paramNames.filter(n => requiredNames.includes(n)),
                                additionalProperties: parameters.additionalProperties
                            },
                            headers: headers.map(h => ({ key: h.key, value: h.value })),
                            // async: isAsync,
                            // strict,
                            serverConfig: {
                                serverurl: serverConfig.serverUrl,
                                secret: serverConfig.secret,
                                timeout: serverConfig.timeout
                            },
                            type: "function",
                            createdAt,
                            updatedAt,
                            index1
                        };
                    }

                    objectData = transformData(objectData);

                    if (result.insertedId) {
                        objectData._id = result.insertedId.toString();
                        objectData.id = result.insertedId.toString();
                    }
                    RedisVentService.Tool.triggerInsert("tool", request.userId, objectData);

                    response.success = true;
                    response.message = "Tool created successfully";
                } catch (error) {
                    logger.error('createTool error', { error: error?.message || error });
                    response.success = false;
                    response.message = "Failed to create tool";
                }
            }
            callback(null, response);
        } catch (error) {
            logger.error('createTool fatal', { error: error?.message || error });
            callback({
                code: 500,
                message: "Server instance not initialized!",
                status: status.INTERNAL
            });
        }
    },
    /**
     * @param {Object} call
     * @param {tool.FetchToolsRequest} call.request
     * @param {function} callback 
    */
    fetchTools: async function ({ request }, callback) {
        const response = new FetchToolsResponse();
        try {
            const { ServerInstance } = Adapter;
            if (!ServerInstance) {
                callback({
                    code: 500,
                    message: "Server instance not initialized!",
                    status: status.INTERNAL
                });
            } else {
                let indexBasis = "createdAt";
                let orderBasis = "$lt";
                let regexValue = request.searchQuery;

                const pipeline = [];
                const match = {};
                const lastBasis = Number(request.lastBasis);

                if (request.userId) {
                    match.userId = request.userId;
                }

                if (regexValue) {
                    match.index1 = { $regex: regexValue, $options: "i" }
                }

                if (lastBasis !== 0) {
                    match[indexBasis] = { [orderBasis]: lastBasis };
                }
                pipeline.push({ $match: match });
                pipeline.push({ $sort: { [indexBasis]: -1 } });
                pipeline.push({ $limit: 15 });

                const tools = await Core.getDB("tools", true).aggregate(pipeline, { allowDiskUse: true }).toArray();

                if (tools.length > 0) {
                    tools.forEach(element => {
                        const t = new ToolsTemplate(element);
                        response.tools.push(t.toProto());
                    });
                    response.lastBasis = tools[tools.length - 1][indexBasis];
                    response.success = true;
                } else {
                    response.success = false;
                }
            }
            callback(null, response);
        } catch (error) {
            logger.error('fetchTools error', { error: error?.message || error });
            callback({
                code: 500,
                message: "Failed to fetch tools",
                status: status.INTERNAL
            });
        }
    },
    updateTools: async function ({ request }, callback) {
        const response = new ToolResponse();
        try {
            const { ServerInstance } = Adapter;
            if (!ServerInstance) {
                callback({
                    code: 500,
                    message: "Server instance not initialized!",
                    status: status.INTERNAL
                });
            } else {
                try {
                    // First fetch the existing tool
                    const existingTool = await Core.getDB("tools", false).findOneAsync({ _id: Utilities.toObjectId({ _str: request.id }) });
                    if (!existingTool) {
                        response.success = false;
                        response.message = "Tool not found";
                        callback(null, response);
                        return;
                    }
                    // Create tool instance with existing data
                    const tool = new ToolsTemplate(existingTool);

                    // Prepare update data
                    const updateData = {
                        ...request,
                        createdAt: existingTool.createdAt,
                        updatedAt: moment().valueOf()
                    };

                    // Update the tool
                    const updatedTool = await tool.updateTool(updateData);
                    if (updatedTool) {
                        // Transform the data for the response
                        function transformData(raw) {

                            const {
                                _id, name, parameters, messages, headers,
                                async: isAsync, strict, serverConfig,
                                createdAt, updatedAt
                            } = raw;

                            const firstProp = parameters.properties[0] || {};
                            const paramNames = parameters.properties.map(p => p.name);
                            const requiredNames = parameters.required_fields || [];
                            return {
                                id: request.id || _id,
                                name,
                                description: raw.description || "",
                                messages: messages.map(m => ({
                                    type: m.type
                                        .split(/[_\s]+/)
                                        .map(w => w[0] + w.slice(1).toLowerCase())
                                        .join(" "),
                                    content: m.content || "",
                                    conditions: m.conditions
                                })),
                                parameters: {
                                    type: (firstProp.type || "").toLowerCase(),
                                    properties: parameters.properties.map(p => ({
                                        name: p.name,
                                        type: p.type.toLowerCase(),
                                        description: p.description,
                                        required: requiredNames.includes(p.name)
                                    })),
                                    required: paramNames.filter(n => requiredNames.includes(n)),
                                    additionalProperties: parameters.additionalProperties
                                },
                                headers: headers.map(h => ({ key: h.key, value: h.value })),
                                async: isAsync,
                                strict,
                                serverConfig: {
                                    serverurl: serverConfig.serverUrl,
                                    secret: serverConfig.secret,
                                    timeout: serverConfig.timeout
                                },
                                type: "function",
                                createdAt,
                                updatedAt,
                            };
                        }

                        const transformedData = transformData(updateData);
                        // Trigger Redis event for the update
                        RedisVentService.Tool.triggerUpdate("tool", request.userId, transformedData);

                        response.success = true;
                        response.message = "Tool updated successfully";
                    } else {
                        response.success = false;
                        response.message = "Failed to update tool";
                    }
                } catch (error) {
                    logger.error('updateTools error', { error: error?.message || error });
                    response.success = false;
                    response.message = "Failed to update tool";
                }
            }
            callback(null, response);
        } catch (error) {
            logger.error('updateTools fatal', { error: error?.message || error });
            callback({
                code: 500,
                message: "Server instance not initialized!",
                status: status.INTERNAL
            });
        }
    },
};
