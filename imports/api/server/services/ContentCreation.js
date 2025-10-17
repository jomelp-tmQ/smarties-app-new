import { Adapter, Core } from "@tmq-dev-ph/tmq-dev-core-server";
import { logger as baseLogger } from "../utils/serverUtils";
const logger = baseLogger.child({ service: 'services/ContentCreation.js' });
import { status } from "@grpc/grpc-js";
import { tmq as content } from "../../common/static_codegen/tmq/ContentCreation";
import moment from "moment";
import RedisVentService from "../classes/events/RedisVentService";
import ContentGeneration from "../classes/journey/ContentGeneration";
import Server from "../Server";

const {
    ContentResponse,
    FetchContentResponse,
    ImageSearchResponse,
    ContentAnalysisResponse,
    BatchGenerationResponse,
    HealthCheckResponse,
    TrendsRequest,
    TrendsResponse,
    TrendItem
} = content;

export default {
    /**
     * Generate single content
     * @param {Object} call
     * @param {content.ContentRequest} call.request
     * @param {function} callback 
     */
    generateContent: async function ({ request }, callback) {
        const response = new ContentResponse();
        try {
            const { ServerInstance } = Adapter;
            if (!ServerInstance) {
                return callback({
                    code: 500,
                    message: "Server instance not initialized!",
                    status: status.INTERNAL
                });
            }

            // Validate required fields
            if (!request.format || !request.topic) {
                return callback({
                    code: 400,
                    message: "Format and topic are required",
                    status: status.INVALID_ARGUMENT
                });
            }

            const config = {
                baseURL: "http://localhost:3003",
                timeout: 30000,
                ...ServerInstance.Config.contentCreation
            }

            // Initialize ContentGeneration class
            const contentGen = new ContentGeneration(config);

            const contentData = {
                format: request.format,
                topic: request.topic,
                currentTrends: request.currentTrends || [],
                options: {
                    tone: request.options.tone,
                    targetAudience: request.options.targetAudience,
                    length: request.options.length
                },
                userId: request.userId
            };

            const result = await contentGen.generateContent(contentData);
            logger.debug('generateContent result', { id: result?.id, status: result?.status });

            if (result.status === "success") {
                response.success = true;
                response.message = "Content generated successfully";
                // Convert content and metadata to Uint8Array (bytes) as expected by protobuf
                response.content = new TextEncoder().encode(JSON.stringify(result.content));
                response.metadata = new TextEncoder().encode(JSON.stringify(result.metadata));
                response.id = result.id;
            } else {
                response.success = false;
                response.message = "Failed to generate content";
            }

            callback(null, response);
        } catch (error) {
            logger.error('generateContent error', { error: error?.message || error });
            callback({
                code: 500,
                message: error.message || "Error generating content",
                status: status.INTERNAL
            });
        }
    },

    /**
     * Search for images
     * @param {Object} call
     * @param {content.ImageSearchRequest} call.request
     * @param {function} callback 
     */
    searchImages: async function ({ request }, callback) {
        const response = new ImageSearchResponse();
        try {
            const { ServerInstance } = Adapter;
            if (!ServerInstance) {
                return callback({
                    code: 500,
                    message: "Server instance not initialized!",
                    status: status.INTERNAL
                });
            }

            if (!request.query) {
                return callback({
                    code: 400,
                    message: "Search query is required",
                    status: status.INVALID_ARGUMENT
                });
            }

            const config = {
                baseURL: "http://localhost:3003",
                ...ServerInstance.Config.contentCreation
            }

            const contentGen = new ContentGeneration(config);

            // if (request.apiKey) {
            //     contentGen.setApiKey(request.apiKey);
            // }

            const searchData = {
                query: request.query,
                options: {
                    perPage: request.options.perPage || 10,
                    orientation: request.options.orientation,
                    size: request.options.size,
                    color: request.options.color
                },
                userId: request.userId
            };

            logger.debug('searchImages request', { query: searchData.query });

            const result = await contentGen.searchImages(searchData);

            if (result.status === "success") {
                response.success = true;
                response.message = "Image search completed";
                // Convert JSON data to Uint8Array (bytes) as expected by protobuf
                const jsonString = JSON.stringify(result.data.photos);
                response.data = new TextEncoder().encode(jsonString);
                response.totalResults = result.totalResults;
            } else {
                response.success = false;
                response.message = "Failed to search images";
            }

            callback(null, response);
        } catch (error) {
            logger.error('searchImages error', { error: error?.message || error });
            callback({
                code: 500,
                message: error.message || "Error searching images",
                status: status.INTERNAL
            });
        }
    },

    /**
     * Analyze content
     * @param {Object} call
     * @param {content.ContentAnalysisRequest} call.request
     * @param {function} callback 
     */
    analyzeContent: async function ({ request }, callback) {
        const response = new ContentAnalysisResponse();
        try {
            const { ServerInstance } = Adapter;
            if (!ServerInstance) {
                return callback({
                    code: 500,
                    message: "Server instance not initialized!",
                    status: status.INTERNAL
                });
            }

            if (!request.content || !request.criteria) {
                return callback({
                    code: 400,
                    message: "Content and criteria are required",
                    status: status.INVALID_ARGUMENT
                });
            }

            const config = {
                baseURL: "http://localhost:3003",
                timeout: 60000,
                ...ServerInstance.Config.contentCreation
            }

            const contentGen = new ContentGeneration(config);

            const analysisData = {
                content: request.content,
                criteria: request.criteria,
                targetAudience: request.targetAudience,
                contentType: request.contentType,
                keywords: request.keywords || [],
                model: request.model,
                userId: request.userId
            };

            const result = await contentGen.analyzeContent(analysisData);
            logger.debug('analyzeContent result', { id: result?.id, status: result?.status });

            if (result.status === "success") {
                response.success = true;
                response.message = "Content analysis completed";
                // Convert analysis to Uint8Array (bytes) as expected by protobuf
                response.analysis = new TextEncoder().encode(JSON.stringify(result.analysis));
                response.id = result.id;
            } else {
                response.success = false;
                response.message = "Failed to analyze content";
            }

            callback(null, response);
        } catch (error) {
            logger.error('analyzeContent error', { error: error?.message || error });
            callback({
                code: 500,
                message: error.message || "Error analyzing content",
                status: status.INTERNAL
            });
        }
    },



    /**
     * Get latest trends based on categories
     * @param {Object} call
     * @param {content.TrendsRequest} call.request
     * @param {function} callback 
     */
    getLatestTrends: async function ({ request }, callback) {
        const response = new TrendsResponse();
        try {
            const { ServerInstance } = Adapter;
            if (!ServerInstance) {
                return callback({
                    code: 500,
                    message: "Server instance not initialized!",
                    status: status.INTERNAL
                });
            }

            // Validate required fields
            if (!request.categories || request.categories.length === 0) {
                return callback({
                    code: 400,
                    message: "Categories are required",
                    status: status.INVALID_ARGUMENT
                });
            }

            const config = {
                baseURL: "http://localhost:3003",
                timeout: 60000,
                ...ServerInstance.Config.contentCreation
            }

            // Initialize ContentGeneration class
            const contentGen = new ContentGeneration(config);

            // TODO Fix request categories to be a string
            const chosenCategories = Array.isArray(request.categories) && request.categories.length === 1 ? request.categories[0] : request.categories;
            logger.debug('getLatestTrends categories', { categories: chosenCategories });
            const trendsData = {
                categories: chosenCategories,
                model: request.model || 'gpt-3.5-turbo',
                temperature: request.temperature || 0.7,
                userId: request.userId
            };

            const result = await contentGen.getLatestTrends(trendsData);

            if (result.status === "success") {
                response.success = true;
                response.message = "Latest trends retrieved successfully";

                // Set the data array
                if (result.data && Array.isArray(result.data)) {
                    result.data.forEach(trend => {
                        const trendItem = new TrendItem();
                        trendItem.topic_label = trend.topic_label || '';
                        trendItem.topic_description = trend.topic_description || '';
                        trendItem.topic_strength = trend.topic_strength || 0;
                        trendItem.top_subreddits = trend.top_subreddits || [];
                        trendItem.trend_direction = trend.trend_direction || '';
                        trendItem.engagement_score = trend.engagement_score || 0;
                        trendItem.ai_generated = trend.ai_generated || false;
                        trendItem.keywords = trend.keywords || [];
                        trendItem.post_count = trend.post_count || 0;
                        trendItem.sentiment = trend.sentiment || '';
                        trendItem.evidence = trend.evidence || [];
                        trendItem.summary = trend.summary || '';

                        response.data.push(trendItem);
                    });
                }

                // Set other response fields
                response.categories_analyzed = result.categories_analyzed || [];
                response.total_posts = result.total_posts || 0;
                response.timestamp = result.timestamp || new Date().toISOString();
            } else {
                response.success = false;
                response.message = "Failed to retrieve latest trends";
            }

            callback(null, response);
        } catch (error) {
            logger.error('getLatestTrends error', { error: error?.message || error });
            callback({
                code: 500,
                message: error.message || "Error retrieving latest trends",
                status: status.INTERNAL
            });
        }
    },
};
