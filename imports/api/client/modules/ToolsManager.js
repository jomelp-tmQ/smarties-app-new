import ToolsManagerClient from '@tmq-justin/tools-call-client';
import Client from '../Client';

/**
 * ToolsManager - A class to manage tool definitions and executions
 * Handles tool registration, retrieval, and execution
 */
class ToolsManager {
    /**
     * Creates a new instance of ToolsManager
     * @param {Object} config - Configuration object
     * @param {string} config.serverUrl - The URL of the tools server
     * @param {Object} [config.authConfig] - Authentication configuration
     * @param {string} [config.authConfig.apiKey] - API key for authentication
     * @param {number} [config.authConfig.tokenRefreshInterval] - Interval for token refresh in milliseconds
     * @param {number} [config.authConfig.maxRetries] - Maximum number of retries for token refresh
     * @param {number} [config.authConfig.retryDelay] - Delay between retries in milliseconds
     * @param {string} [config.authConfig.refreshEndpoint] - Endpoint for token refresh
     */
    constructor() {
        this.config = Client.Settings;
        if (this.config?.toolsUrl) {
            this.toolsManager = new ToolsManagerClient({
                serverUrl: this.config?.toolsUrl,
                authConfig: {
                    apiKey: this.config?.toolsJwtApiKey,
                    refreshEndpoint: '/auth/token'
                }
            });
        }
    }

    /**
     * Gets all tool definitions
     * @param {boolean} [enabledOnly=false] - Whether to return only enabled tools
     * @returns {Promise<Array<Object>>} Array of tool definitions
     */
    async getAllTools(enabledOnly = false) {
        return this.toolsManager.getToolDefinitions(enabledOnly);
    }

    /**
     * Gets tools in OpenAI format
     * @param {boolean} [enabledOnly=false] - Whether to return only enabled tools
     * @returns {Promise<Array<Object>>} Array of OpenAI-formatted tool definitions
     */
    async getOpenAITools(enabledOnly = false) {
        return this.toolsManager.getOpenAIToolDefinitions(enabledOnly);
    }

    /**
     * Gets tools in VAPI format
     * @param {boolean} [enabledOnly=false] - Whether to return only enabled tools
     * @returns {Promise<Array<Object>>} Array of VAPI-formatted tool definitions
     */
    async getVAPITools(enabledOnly = false) {
        return this.toolsManager.getVAPIToolDefinitions(enabledOnly);
    }

    /**
     * Registers a new tool with its implementation
     * @param {Object} definition - Tool definition
     * @param {string} definition.name - Name of the tool
     * @param {string} definition.description - Description of the tool
     * @param {Object} definition.parameters - Tool parameters schema
     * @param {string} definition.parameters.type - Type of parameters (usually 'object')
     * @param {Object} definition.parameters.properties - Parameter properties
     * @param {Array<string>} [definition.parameters.required] - Required parameter names
     * @param {boolean} [definition.isEnabled] - Whether the tool is enabled
     * @param {string} implementation - JavaScript implementation of the tool
     * @returns {Promise<Object>} Registration result with tool and message
     */
    async registerTool(definition, implementation) {
        return this.toolsManager.registerToolWithImplementation(definition, implementation);
    }

    /**
     * Executes one or more tool calls
     * @param {Array<Object>} toolCalls - Array of tool calls to execute
     * @param {string} [toolCalls[].id] - Optional ID for the tool call
     * @param {string} toolCalls[].name - Name of the tool to call
     * @param {Object} toolCalls[].arguments - Arguments for the tool call
     * @param {string} toolCalls[].provider - Provider of the tool ('openai', 'vapi', 'websocket')
     * @param {Object} context - Execution context
     * @param {string} context.sessionId - Session ID for the execution
     * @param {string} [context.userId] - Optional user ID
     * @param {Object} [context.vapiMessage] - Optional VAPI message
     * @returns {Promise<Array<Object>>} Array of tool call results
     */
    async executeTools(toolCalls, context) {
        return this.toolsManager.executeToolCalls(toolCalls, context);
    }

    /**
     * Gets the result of a specific tool call
     * @param {string} toolCallId - ID of the tool call
     * @returns {Promise<Object>} Tool call result
     */
    async getToolCallResult(toolCallId) {
        return this.toolsManager.getToolCall(toolCallId);
    }

    /**
     * Fetches a tool definition by ID
     * @param {string} toolId - ID of the tool to fetch
     * @returns {Promise<Object>} Tool definition
     */
    async fetchTool(toolId) {
        return this.toolsManager.getToolDefinition(toolId);
    }
}

export default new ToolsManager();