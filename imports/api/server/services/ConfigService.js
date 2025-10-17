import { Adapter } from "@tmq-dev-ph/tmq-dev-core-server";
import { tmq as config } from "../../common/static_codegen/tmq/config";
import { logger as baseLogger } from "../utils/serverUtils";
const logger = baseLogger.child({ service: 'services/ConfigService.js' });

const {
    GetClientConfigRequest,
    GetClientConfigResponse,
    Config,
    ClientConfig,
    SmartiesAssistantConfig,
    AuthConfig,
    PredefinedConfig,
    SuggestionConfig,
    LiveKit
} = config;

export default {
    /**
     * Returns client-facing configuration from server settings
     * @param {Object} call
     * @param {GetClientConfigRequest} call.request
     * @param {function} callback
     */
    GetClientConfig: async function ({ request }, callback) {
        try {
            logger.debug("GetClientConfig called");

            const { ServerInstance } = Adapter;
            if (!ServerInstance) {
                callback({
                    code: 500,
                    message: "Server instance not initialized!"
                });
                return;
            }

            const settings = ServerInstance.Config || {};

            const clientSettings = settings.client || {};
            const smartiesSettings = clientSettings.smartiesAssistant || {};
            const authSettings = settings.auth || {};
            const liveKitSettings = settings.livekit || {};

            const response = new GetClientConfigResponse();
            response.success = true;
            response.error_message = "";

            const smartiesAssistantMsg = new SmartiesAssistantConfig();
            const suggestionMsg = new SuggestionConfig();
            smartiesAssistantMsg.is_human_url = smartiesSettings.isHumanUrl || "";
            suggestionMsg.url = clientSettings.suggestion.url || "";
            suggestionMsg.min = clientSettings.suggestion.min || 1;
            suggestionMsg.max = clientSettings.suggestion.max || 1;

            const clientMsg = new ClientConfig();
            clientMsg.smarties_assistant = smartiesAssistantMsg;
            clientMsg.suggestion = suggestionMsg;

            const authMsg = new AuthConfig();
            authMsg.username = authSettings.username || "";
            authMsg.password = authSettings.password || "";

            const predefinedConfig = settings.predefinedAnswer || {};
            const predefinedMsg = new PredefinedConfig();
            predefinedMsg.serverUrl = predefinedConfig.serverUrl || "";
            predefinedMsg.apiKey = predefinedConfig.apiKey || "";
            predefinedMsg.refreshEndpoint = predefinedConfig.refreshEndpoint || "";

            const liveKitMsg = new LiveKit();
            const liveKitPublicUrl = (settings.public && (settings.public.livekitServerUrl || (settings.public.livekit && settings.public.livekit.serverUrl))) || "";
            liveKitMsg.serverUrl = liveKitSettings.serverUrl || liveKitPublicUrl || "";

            const cfgMsg = new Config();
            cfgMsg.client = clientMsg;
            cfgMsg.auth = authMsg;
            cfgMsg.predefined = predefinedMsg;
            cfgMsg.livekit = liveKitMsg;
            response.config = cfgMsg;

            callback(null, response);
        } catch (error) {
            logger.error("GetClientConfig error", { error: error.message });
            const response = new GetClientConfigResponse();
            response.success = false;
            response.error_message = error.message || "Internal server error";
            callback(null, response);
        }
    }
};
