import contentCreation from '../../common/static_codegen/tmq/ContentCreation_pb';

/**
 * Client-side ContentCreation class that interfaces with ContentCreationService
 * Uses hex values internally as defined in references.const
 * Handles protobuf serialization/deserialization
 */
class ContentCreationClient {
    constructor(callFunction) {
        if (typeof callFunction !== 'function') {
            throw new Error('callFunction must be a function');
        }
        this.callFunction = callFunction;
    }

    // ===== CONTENT GENERATION METHODS =====

    /**
     * Generate single content
     * @param {Object} contentData - Content generation parameters
     * @param {string} contentData.format - Content format (blog, social-media, email, etc.)
     * @param {string} contentData.topic - Content topic
     * @param {Array} contentData.currentTrends - Current trends to include
     * @param {Object} contentData.options - Additional options
     * @param {string} contentData.options.tone - Content tone
     * @param {string} contentData.options.targetAudience - Target audience
     * @param {string} contentData.options.length - Content length
     * @param {string} contentData.userId - Creator user ID
     * @returns {Promise<Object>} Generated content
     */
    async generateContent(contentData) {
        // Create protobuf request
        const request = new contentCreation.ContentRequest();
        const options = new contentCreation.ContentOptions();
        
        // Set the main request fields
        request.setFormat(contentData.format);
        request.setTopic(contentData.topic);
        request.getCurrenttrendsList(contentData.currentTrends || []);
        request.setUserid(contentData.userId);
        
        // Set the options
        options.setTone(contentData.options?.tone);
        options.setTargetaudience(contentData.options?.targetAudience);
        options.setLength(contentData.options?.length);
        
        // Attach options to request
        request.setOptions(options);

        // Send request
        const response = await this.callFunction(0xdded5b51, request);
        
        // Deserialize response
        if (response && response.result) {
            const contentResponse = contentCreation.ContentResponse.deserializeBinary(response.result);
            const contentString = new TextDecoder().decode(contentResponse.getContent());
            const metadataString = new TextDecoder().decode(contentResponse.getMetadata());

            return {
                success: contentResponse.getSuccess(),
                message: contentResponse.getMessage(),
                content: JSON.parse(contentString),
                metadata: JSON.parse(metadataString),
                id: contentResponse.getId()
            };
        }
        
        return response;
    }

    /**
     * Generate batch content
     * @param {Object} batchData - Batch generation parameters
     * @param {Array} batchData.requests - Array of content generation requests
     * @param {string} batchData.userId - Creator user ID
     * @returns {Promise<Object>} Batch generation results
     */
    async generateBatch(batchData) {
        // Create protobuf requests array
        const requests = batchData.requests.map(req => {
            const contentReq = new contentCreation.ContentRequest();
            const options = new contentCreation.ContentOptions();
            
            // Set the main request fields
            contentReq.setFormat(req.format);
            contentReq.setTopic(req.topic);
            contentReq.setCurrenttrends(req.currentTrends || []);
            contentReq.setUserid(req.userId);
            
            // Set the options
            options.setTone(req.options?.tone);
            options.setTargetaudience(req.options?.targetAudience);
            options.setLength(req.options?.length);
            
            // Attach options to request
            contentReq.setOptions(options);
            return contentReq;
        });

        // Create batch request
        const request = new contentCreation.BatchGenerationRequest();
        request.setRequests(requests);
        request.setUserid(batchData.userId);

        // Send request
        const response = await this.callFunction(0x20aee705, request);
        
        // Deserialize response
        if (response && response.result) {
            const batchResponse = contentCreation.BatchGenerationResponse.deserializeBinary(response.result);
            const stringData = new TextDecoder().decode(batchResponse.getData());
            const objData = JSON.parse(stringData);
            return {
                success: batchResponse.getSuccess(),
                message: batchResponse.getMessage(),
                batchId: objData.batchId,
                totalProcessed: objData.totalProcessed,
                totalErrors: objData.totalErrors,
                results: objData.results
            };
        }
        
        return response;
    }

    /**
     * Get available content formats
     * @returns {Promise<Object>} Available formats
     */
    async getFormats() {
        // Create protobuf request
        const request = new contentCreation.FormatsRequest();
        
        // Send request
        const response = await this.callFunction(0x9a1e2a89, request);
        
        // Deserialize response
        if (response && response.result) {
            const formatsResponse = contentCreation.FormatsResponse.deserializeBinary(response.result);
            const stringData = new TextDecoder().decode(formatsResponse.getData());
            const objData = JSON.parse(stringData);
            return {
                success: formatsResponse.getSuccess(),
                message: formatsResponse.getMessage(),
                formats: objData.formats,
                count: objData.count
            };
        }
        
        return response;
    }

    // ===== IMAGE GENERATION METHODS =====

    /**
     * Search for images
     * @param {Object} searchData - Image search parameters
     * @param {string} searchData.query - Search query
     * @param {Object} searchData.options - Search options
     * @param {number} searchData.options.perPage - Images per page
     * @param {string} searchData.options.orientation - Image orientation
     * @param {string} searchData.options.size - Image size
     * @param {string} searchData.options.color - Image color
     * @param {string} searchData.userId - User ID
     * @returns {Promise<Object>} Search results
     */
    async searchImages(searchData) {
        // Create protobuf request
        const request = new contentCreation.ImageSearchRequest();
        const options = new contentCreation.ImageSearchOptions();
        
        // Set the main request fields
        request.setQuery(searchData.query);
        request.setUserid(searchData.userId);
        
        // Set the options
        options.setPerpage(searchData.options?.perPage);
        options.setOrientation(searchData.options?.orientation);
        options.setSize(searchData.options?.size);
        options.setColor(searchData.options?.color);
        
        // Attach options to request
        request.setOptions(options);

        // Serialize and send request
        const response = await this.callFunction(0xadc5004f, request);
        
        // Deserialize response
        if (response && response.result) {
            const searchResponse = contentCreation.ImageSearchResponse.deserializeBinary(response.result);
            const stringData = new TextDecoder().decode(searchResponse.getData());
            const objData = JSON.parse(stringData);
            console.log(searchResponse);
            return {
                success: searchResponse.getSuccess(),
                message: searchResponse.getMessage(),
                data: objData,
                totalResults: searchResponse.getTotalresults()
            };
        }
        
        return response;
    }

    /**
     * Search images using POST method
     * @param {Object} searchData - Image search parameters
     * @param {string} searchData.query - Search query
     * @param {Object} searchData.options - Search options
     * @param {string} searchData.userId - User ID
     * @returns {Promise<Object>} Search results
     */
    async searchImagesPost(searchData) {
        // Create protobuf request
        const request = new contentCreation.ImageSearchRequest();
        const options = new contentCreation.ImageSearchOptions();
        
        // Set the main request fields
        request.setQuery(searchData.query);
        request.setUserid(searchData.userId);
        
        // Set the options
        options.setPerpage(searchData.options?.perPage);
        options.setOrientation(searchData.options?.orientation);
        options.setSize(searchData.options?.size);
        options.setColor(searchData.options?.color);
        
        // Attach options to request
        request.setOptions(options);

        // Send request
        const response = await this.callFunction(0x27257786, request);
        
        // Deserialize response
        if (response && response.result) {
            const searchResponse = contentCreation.ImageSearchResponse.deserializeBinary(response.result);
            const stringData = new TextDecoder().decode(searchResponse.getData());
            const objData = JSON.parse(stringData);
            return {
                success: searchResponse.getSuccess(),
                message: searchResponse.getMessage(),
                data: objData,
                totalResults: searchResponse.getTotalresults()
            };
        }
        
        return response;
    }

    /**
     * Get curated images
     * @param {Object} curatedData - Curated images parameters
     * @param {number} curatedData.perPage - Images per page
     * @param {number} curatedData.page - Page number
     * @param {string} curatedData.userId - User ID
     * @returns {Promise<Object>} Curated images
     */
    async getCuratedImages(curatedData) {
        // Create protobuf request
        const request = new contentCreation.CuratedImagesRequest();
        request.setPerpage(curatedData.perPage);
        request.setPage(curatedData.page);
        request.setUserid(curatedData.userId);

        // Send request
        const response = await this.callFunction(0x3c16a8, request);
        
        // Deserialize response
        if (response && response.result) {
            const curatedResponse = contentCreation.ImageSearchResponse.deserializeBinary(response.result);
            const stringData = new TextDecoder().decode(curatedResponse.getData());
            const objData = JSON.parse(stringData);
            return {
                success: curatedResponse.getSuccess(),
                message: curatedResponse.getMessage(),
                data: objData,
                totalResults: curatedResponse.getTotalresults()
            };
        }
        
        return response;
    }

    /**
     * Get popular images
     * @param {Object} popularData - Popular images parameters
     * @param {number} popularData.perPage - Images per page
     * @param {number} popularData.page - Page number
     * @param {string} popularData.userId - User ID
     * @returns {Promise<Object>} Popular images
     */
    async getPopularImages(popularData) {
        // Create protobuf request
        const request = new contentCreation.PopularImagesRequest();
        request.setPerpage(popularData.perPage);
        request.setPage(popularData.page);
        request.setUserid(popularData.userId);

        // Send request
        const response = await this.callFunction(0xeab0615, request);
        
        // Deserialize response
        if (response && response.result) {
            const popularResponse = contentCreation.ImageSearchResponse.deserializeBinary(response.result);
            const stringData = new TextDecoder().decode(popularResponse.getData());
            const objData = JSON.parse(stringData);
            return {
                success: popularResponse.getSuccess(),
                message: popularResponse.getMessage(),
                data: objData,
                totalResults: popularResponse.getTotalresults()
            };
        }
        
        return response;
    }

    /**
     * Get image by ID
     * @param {Object} imageData - Image data
     * @param {string} imageData.id - Image ID
     * @param {string} imageData.userId - User ID
     * @returns {Promise<Object>} Image details
     */
    async getImageById(imageData) {
        // Create protobuf request
        const request = new contentCreation.ImageByIdRequest();
        request.setId(imageData.id);
        request.setUserid(imageData.userId);

        // Send request
        const response = await this.callFunction(0x5c21daca, request);
        
        // Deserialize response
        if (response && response.result) {
            const imageResponse = contentCreation.ImageSearchResponse.deserializeBinary(response.result);
            const stringData = new TextDecoder().decode(imageResponse.getData());
            const objData = JSON.parse(stringData);
            return {
                success: imageResponse.getSuccess(),
                message: imageResponse.getMessage(),
                data: objData,
                totalResults: imageResponse.getTotalresults()
            };
        }
        
        return response;
    }

    /**
     * Get image suggestions
     * @param {Object} suggestionData - Suggestion parameters
     * @param {string} suggestionData.topic - Topic for suggestions
     * @param {string} suggestionData.userId - User ID
     * @returns {Promise<Object>} Image suggestions
     */
    async getImageSuggestions(suggestionData) {
        // Create protobuf request
        const request = new contentCreation.ImageSuggestionsRequest();
        request.setTopic(suggestionData.topic);
        request.setUserid(suggestionData.userId);

        // Send request
        const response = await this.callFunction(0xe59b3b12, request);
        
        // Deserialize response
        if (response && response.result) {
            const suggestionResponse = contentCreation.ImageSearchResponse.deserializeBinary(response.result);
            const stringData = new TextDecoder().decode(suggestionResponse.getData());
            const objData = JSON.parse(stringData);
            return {
                success: suggestionResponse.getSuccess(),
                message: suggestionResponse.getMessage(),
                data: objData,
                totalResults: suggestionResponse.getTotalresults()
            };
        }
        
        return response;
    }

    // ===== CONTENT EDITOR METHODS =====

    /**
     * Analyze content with specific criteria
     * @param {Object} analysisData - Analysis parameters
     * @param {string} analysisData.content - Content to analyze
     * @param {Array} analysisData.criteria - Analysis criteria
     * @param {string} analysisData.targetAudience - Target audience
     * @param {string} analysisData.contentType - Content type
     * @param {Array} analysisData.keywords - Keywords
     * @param {string} analysisData.model - AI model to use
     * @param {string} analysisData.userId - User ID
     * @returns {Promise<Object>} Analysis results
     */
    async analyzeContent(analysisData) {
        // Create protobuf request
        const request = new contentCreation.ContentAnalysisRequest();
        request.setContent(analysisData.content);
        request.setCriteriaList(analysisData.criteria);
        request.setTargetaudience(analysisData.targetAudience);
        request.setContenttype(analysisData.contentType);
        request.setKeywordsList(analysisData.keywords || []);
        request.setModel(analysisData.model);
        request.setUserid(analysisData.userId);

        // Send request
        const response = await this.callFunction(0x424e1564, request);
        
        // Deserialize response
        if (response && response.result) {
            const analysisResponse = contentCreation.ContentAnalysisResponse.deserializeBinary(response.result);
            const analysisString = new TextDecoder().decode(analysisResponse.getAnalysis());
            const analysisObj = JSON.parse(analysisString);
            return {
                success: analysisResponse.getSuccess(),
                message: analysisResponse.getMessage(),
                analysis: analysisObj,
                id: analysisResponse.getId(),
            };
        }
        
        return response;
    }

    /**
     * Perform quick analysis
     * @param {Object} quickData - Quick analysis parameters
     * @param {string} quickData.content - Content to analyze
     * @param {string} quickData.targetAudience - Target audience
     * @param {string} quickData.contentType - Content type
     * @param {string} quickData.userId - User ID
     * @returns {Promise<Object>} Quick analysis results
     */
    async quickAnalysis(quickData) {
        // Create protobuf request
        const request = new contentCreation.QuickAnalysisRequest();
        request.setContent(quickData.content);
        request.setTargetaudience(quickData.targetAudience);
        request.setContenttype(quickData.contentType);
        request.setUserid(quickData.userId);

        // Send request
        const response = await this.callFunction(0x23c2d826, request);
        
        // Deserialize response
        if (response && response.result) {
            const quickResponse = contentCreation.ContentAnalysisResponse.deserializeBinary(response.result);
            const stringData = new TextDecoder().decode(quickResponse.getData());
            const objData = JSON.parse(stringData);
            return {
                success: quickResponse.getSuccess(),
                message: quickResponse.getMessage(),
                analysis: objData,
                id: quickResponse.getId(),
                analysisType: quickResponse.getAnalysistype(),
                criteriaUsed: quickResponse.getCriteriaused()
            };
        }
        
        return response;
    }

    /**
     * Analyze specific criteria
     * @param {Object} criterionData - Criterion analysis parameters
     * @param {string} criterionData.content - Content to analyze
     * @param {Array} criterionData.criteria - Specific criteria to analyze
     * @param {string} criterionData.targetAudience - Target audience
     * @param {string} criterionData.contentType - Content type
     * @param {Array} criterionData.keywords - Keywords
     * @param {string} criterionData.model - AI model to use
     * @param {string} criterionData.userId - User ID
     * @returns {Promise<Object>} Criterion analysis results
     */
    async analyzeCriterion(criterionData) {
        // Create protobuf request
        const request = new contentCreation.CriterionAnalysisRequest();
        request.setContent(criterionData.content);
        request.setCriteria(criterionData.criteria);
        request.setTargetaudience(criterionData.targetAudience);
        request.setContenttype(criterionData.contentType);
        request.setKeywords(criterionData.keywords || []);
        request.setModel(criterionData.model);
        request.setUserid(criterionData.userId);

        // Send request
        const response = await this.callFunction(0x49d2e3be, request);
        
        // Deserialize response
        if (response && response.result) {
            const criterionResponse = contentCreation.ContentAnalysisResponse.deserializeBinary(response.result);
            const stringData = new TextDecoder().decode(criterionResponse.getData());
            const objData = JSON.parse(stringData);
            return {
                success: criterionResponse.getSuccess(),
                message: criterionResponse.getMessage(),
                analysis: objData,
                id: criterionResponse.getId(),
                analysisType: criterionResponse.getAnalysistype(),
                criteriaUsed: criterionResponse.getCriteriaused()
            };
        }
        
        return response;
    }

    /**
     * Get available analysis criteria
     * @returns {Promise<Object>} Available criteria
     */
    async getCriteria() {
        // Create protobuf request
        const request = new contentCreation.CriteriaRequest();
        
        // Send request
        const response = await this.callFunction(0xd837e12, request);
        
        // Deserialize response
        if (response && response.result) {
            const criteriaResponse = contentCreation.CriteriaResponse.deserializeBinary(response.result);
            const stringData = new TextDecoder().decode(criteriaResponse.getData());
            const objData = JSON.parse(stringData);
            return {
                success: criteriaResponse.getSuccess(),
                message: criteriaResponse.getMessage(),
                criteria: objData.criteria,
                count: objData.count,
                description: objData.description
            };
        }
        
        return response;
    }

    // ===== TRENDS METHODS =====

    /**
     * Get latest trends based on categories
     * @param {Object} trendsData - Trends parameters
     * @param {Array|string} trendsData.categories - Categories to analyze (can be array or single string)
     * @param {string} trendsData.model - AI model to use (optional)
     * @param {number} trendsData.temperature - AI temperature (optional)
     * @param {string} trendsData.userId - User ID
     * @returns {Promise<Object>} Latest trends data
     */
    async getLatestTrends(trendsData) {
        // Create protobuf request
        const request = new contentCreation.TrendsRequest();
        
        // Set the main request fields
        if (Array.isArray(trendsData.categories)) {
            request.setCategoriesList(trendsData.categories);
        } else {
            request.setCategoriesList([trendsData.categories]);
        }
        request.setModel(trendsData.model || 'gpt-3.5-turbo');
        request.setTemperature(trendsData.temperature || 0.7);
        request.setUserid(trendsData.userId);

        // Send request
        const response = await this.callFunction(0x7c3483f, request);
        
        // Deserialize response
        if (response && response.result) {
            const trendsResponse = contentCreation.TrendsResponse.deserializeBinary(response.result);
            
            // Extract trend items
            const trendsData = [];
            const dataList = trendsResponse.getDataList();
            dataList.forEach(trendItem => {
                trendsData.push({
                    topic_label: trendItem.getTopicLabel(),
                    topic_description: trendItem.getTopicDescription(),
                    topic_strength: trendItem.getTopicStrength(),
                    top_subreddits: trendItem.getTopSubredditsList(),
                    trend_direction: trendItem.getTrendDirection(),
                    engagement_score: trendItem.getEngagementScore(),
                    ai_generated: trendItem.getAiGenerated(),
                    keywords: trendItem.getKeywordsList(),
                    post_count: trendItem.getPostCount(),
                    sentiment: trendItem.getSentiment(),
                    evidence: trendItem.getEvidenceList(),
                    summary: trendItem.getSummary()
                });
            });

            return {
                success: trendsResponse.getSuccess(),
                message: trendsResponse.getMessage(),
                data: trendsData,
                categories_analyzed: trendsResponse.getCategoriesAnalyzedList(),
                total_posts: trendsResponse.getTotalPosts(),
                timestamp: trendsResponse.getTimestamp()
            };
        }
        
        return response;
    }

    // ===== HEALTH CHECK METHODS =====

    /**
     * Check content generation service health
     * @returns {Promise<Object>} Health status
     */
    async healthCheck() {
        // Create protobuf request
        const request = new contentCreation.HealthCheckRequest();
        
        // Send request
        const response = await this.callFunction(0x12ce13a5, request);
        
        // Deserialize response
        if (response && response.result) {
            const healthResponse = contentCreation.HealthCheckResponse.deserializeBinary(response.result);
            const stringData = new TextDecoder().decode(healthResponse.getData());
            const objData = JSON.parse(stringData);
            return {
                success: healthResponse.getSuccess(),
                message: healthResponse.getMessage(),
                serviceStatus: objData.serviceStatus,
                availableFormats: objData.availableFormats,
                timestamp: objData.timestamp
            };
        }
        
        return response;
    }

    /**
     * Check image generation service health
     * @returns {Promise<Object>} Health status
     */
    async imageHealthCheck() {
        // Create protobuf request
        const request = new contentCreation.ImageHealthCheckRequest();
        
        // Send request
        const response = await this.callFunction(0xa6aa62e1, request);
        
        // Deserialize response
        if (response && response.result) {
            const healthResponse = contentCreation.ImageHealthCheckResponse.deserializeBinary(response.result);
            const stringData = new TextDecoder().decode(healthResponse.getData());
            const objData = JSON.parse(stringData);
            return {
                success: healthResponse.getSuccess(),
                message: healthResponse.getMessage(),
                data: objData,
                timestamp: objData.timestamp
            };
        }
        
        return response;
    }

    /**
     * Check content editor service health
     * @returns {Promise<Object>} Health status
     */
    async editorHealthCheck() {
        // Create protobuf request
        const request = new contentCreation.EditorHealthCheckRequest();
        
        // Send request
        const response = await this.callFunction(0xd979b873, request);
        
        // Deserialize response
        if (response && response.result) {
            const healthResponse = contentCreation.EditorHealthCheckResponse.deserializeBinary(response.result);
            const stringData = new TextDecoder().decode(healthResponse.getData());
            const objData = JSON.parse(stringData);
            return {
                success: healthResponse.getSuccess(),
                message: healthResponse.getMessage(),
                serviceStatus: objData.serviceStatus,
                availableCriteria: objData.availableCriteria,
                timestamp: objData.timestamp
            };
        }
        
        return response;
    }

    // ===== CONTENT MANAGEMENT METHODS =====

    /**
     * Get content by ID
     * @param {string} contentId - Content ID
     * @returns {Promise<Object>} Content object
     */
    async getContent(contentId) {
        // Create protobuf request
        const request = new contentCreation.GetContentRequest();
        request.setContentid(contentId);

        // Send request
        const response = await this.callFunction(0x6967a01c, request);
        
        // Deserialize response
        if (response && response.result) {
            const contentResponse = contentCreation.ContentResponse.deserializeBinary(response.result);
            const stringData = new TextDecoder().decode(contentResponse.getData());
            const objData = JSON.parse(stringData);
            return {
                success: contentResponse.getSuccess(),
                message: contentResponse.getMessage(),
                content: objData,
                metadata: objData.metadata,
                id: objData.id
            };
        }
        
        return response;
    }

    /**
     * List all content with optional filtering
     * @param {Object} filters - Optional filters
     * @param {string} filters.format - Filter by format
     * @param {string} filters.status - Filter by status
     * @param {string} filters.userId - Filter by user ID
     * @returns {Promise<Object>} List of content
     */
    async listContent(filters = {}) {
        // Create protobuf request
        const request = new contentCreation.ListContentRequest();
        const contentFilters = new contentCreation.ContentFilters();
        
        // Set the filters
        contentFilters.setFormat(filters.format);
        contentFilters.setStatus(filters.status);
        contentFilters.setUserid(filters.userId);
        
        // Attach filters to request
        request.setFilters(contentFilters);

        // Send request
        const response = await this.callFunction(0xfeba1b8e, request);
        
        // Deserialize response
        if (response && response.result) {
            const listResponse = contentCreation.ListContentResponse.deserializeBinary(response.result);
            const stringData = new TextDecoder().decode(listResponse.getData());
            const objData = JSON.parse(stringData);
            return {
                success: listResponse.getSuccess(),
                message: listResponse.getMessage(),
                content: objData.content,
                count: objData.count
            };
        }
        
        return response;
    }
}

export default ContentCreationClient;
