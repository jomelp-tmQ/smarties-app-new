import { ContentCreationClient } from '@content-creation/client';
import { Core } from "@tmq-dev-ph/tmq-dev-core-server";
import { logger as baseLogger } from "../../utils/serverUtils.js";
const logger = baseLogger.child({ service: 'classes/journey/ContentGeneration.js' });

class ContentGeneration {
    constructor(config) {
        this.config = config;
        logger.debug('ContentGeneration init', { hasConfig: Boolean(config) });
        this.client = new ContentCreationClient(this.config);
        this.db = Core.getDB("content", true);
    }

    /**
     * Set the API key for the client
     * @param {string} apiKey - JWT token or API key
     */
    setApiKey(apiKey) {
        this.client.setApiKey(apiKey);
    }

    /**
     * Get the axios instance from the client
     * @returns {Object} Axios instance
     */
    getAxiosInstance() {
        return this.client.getAxiosInstance();
    }

    // ===== CONTENT GENERATION METHODS =====

    /**
     * Get available content formats
     * @returns {Object} Available formats
     */
    async getFormats() {
        try {
            const response = await this.client.contentGeneration.getFormats();

            if (response.success) {
                return {
                    status: "success",
                    formats: response.formats || [],
                    count: response.count || 0
                };
            } else {
                throw new Error(response.error || 'Failed to get formats');
            }
        } catch (error) {
            logger.error('getFormats error', { error: error?.message || error });
            throw new Error(`Failed to get formats: ${error.message}`);
        }
    }

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
     * @returns {Object} Generated content
     */
    async generateContent(contentData) {
        if (!contentData.format || !contentData.topic) {
            throw new Error('Format and topic are required');
        }

        try {
            const response = await this.client.contentGeneration.generateContent(contentData);

            if (response.success) {
                // Store content generation record in local database
                const now = new Date().valueOf();
                const contentRecord = {
                    type: "content",
                    // contentId: response.content?.id || Core.generateId(),
                    format: contentData.format,
                    topic: contentData.topic,
                    currentTrends: contentData.currentTrends || [],
                    options: contentData.options || {},
                    content: response.content?.content || '',
                    metadata: response.metadata || {},
                    status: 'generated',
                    createdBy: contentData.userId || null,
                    createdAt: now,
                    updatedAt: now
                };

                await this.db.insertOne(contentRecord);

                return {
                    status: "success",
                    format: response.format || contentData.format,
                    topic: response.topic || contentData.topic,
                    content: response.content,
                    metadata: response.metadata,
                    id: contentRecord._id
                };
            } else {
                throw new Error(response.error || 'Failed to generate content');
            }
        } catch (error) {
            logger.error('generateContent error', { error: error?.message || error });
            throw new Error(`Failed to generate content: ${error.message}`);
        }
    }

    /**
     * Generate batch content
     * @param {Object} batchData - Batch generation parameters
     * @param {Array} batchData.requests - Array of content generation requests
     * @param {string} batchData.userId - Creator user ID
     * @returns {Object} Batch generation results
     */
    async generateBatch(batchData) {
        if (!batchData.requests || !Array.isArray(batchData.requests)) {
            throw new Error('Requests array is required');
        }

        try {
            const response = await this.client.contentGeneration.generateBatch(batchData);

            if (response.success) {
                // Store batch generation record
                const now = new Date().valueOf();
                const batchRecord = {
                    _id: Core.generateId(),
                    batchId: response.batchId || Core.generateId(),
                    requests: batchData.requests,
                    results: response.results || [],
                    totalProcessed: response.totalProcessed || 0,
                    totalErrors: response.totalErrors || 0,
                    status: 'completed',
                    createdBy: batchData.userId || null,
                    createdAt: now,
                    updatedAt: now
                };

                await this.db.insertOne(batchRecord);

                return {
                    status: "success",
                    batchId: batchRecord._id,
                    totalProcessed: response.totalProcessed || 0,
                    totalErrors: response.totalErrors || 0,
                    results: response.results || []
                };
            } else {
                throw new Error(response.error || 'Failed to generate batch content');
            }
        } catch (error) {
            logger.error('generateBatch error', { error: error?.message || error });
            throw new Error(`Failed to generate batch content: ${error.message}`);
        }
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
     * @returns {Object} Search results
     */
    async searchImages(searchData) {
        if (!searchData.query) {
            throw new Error('Search query is required');
        }

        try {
            const response = await this.client.imageGeneration.searchImages(searchData);
            logger.debug('searchImages response', { ok: response?.success });

            if (response.success) {
                // Store search record
                const now = new Date().valueOf();
                const searchRecord = {
                    type: "image",
                    query: searchData.query,
                    options: searchData.options || {},
                    results: response.data || {},
                    totalResults: response.data?.pagination?.totalResults || 0,
                    createdBy: searchData.userId || null,
                    createdAt: now
                };

                await this.db.insertOne(searchRecord);

                return {
                    status: "success",
                    data: response.data,
                    totalResults: response.data?.pagination?.totalResults || 0
                };
            } else {
                throw new Error(response.error || 'Failed to search images');
            }
        } catch (error) {
            logger.error('searchImages error', { error: error?.message || error });
            throw new Error(`Failed to search images: ${error.message}`);
        }
    }

    /**
     * Search images using POST method
     * @param {Object} searchData - Image search parameters
     * @param {string} searchData.query - Search query
     * @param {Object} searchData.options - Search options
     * @param {string} searchData.userId - User ID
     * @returns {Object} Search results
     */
    async searchImagesPost(searchData) {
        if (!searchData.query) {
            throw new Error('Search query is required');
        }

        try {
            const response = await this.client.imageGeneration.searchImagesPost(searchData);

            if (response.success) {
                // Store search record
                const now = new Date().valueOf();
                const searchRecord = {
                    _id: Core.generateId(),
                    query: searchData.query,
                    method: 'POST',
                    options: searchData.options || {},
                    results: response.data || {},
                    totalResults: response.data?.pagination?.totalResults || 0,
                    createdBy: searchData.userId || null,
                    createdAt: now
                };

                await this.db.insertOne(searchRecord);

                return {
                    status: "success",
                    data: response.data,
                    totalResults: response.data?.pagination?.totalResults || 0
                };
            } else {
                throw new Error(response.error || 'Failed to search images via POST');
            }
        } catch (error) {
            logger.error('searchImagesPost error', { error: error?.message || error });
            throw new Error(`Failed to search images via POST: ${error.message}`);
        }
    }

    /**
     * Get curated images
     * @param {Object} curatedData - Curated images parameters
     * @param {number} curatedData.perPage - Images per page
     * @param {number} curatedData.page - Page number
     * @param {string} curatedData.userId - User ID
     * @returns {Object} Curated images
     */
    async getCuratedImages(curatedData) {
        try {
            const response = await this.client.imageGeneration.getCuratedImages(curatedData);

            if (response.success) {
                // Store curated images record
                const now = new Date().valueOf();
                const curatedRecord = {
                    _id: Core.generateId(),
                    perPage: curatedData.perPage || 10,
                    page: curatedData.page || 1,
                    results: response.data || {},
                    totalResults: response.data?.pagination?.totalResults || 0,
                    createdBy: curatedData.userId || null,
                    createdAt: now
                };

                await this.db.insertOne(curatedRecord);

                return {
                    status: "success",
                    data: response.data,
                    totalResults: response.data?.pagination?.totalResults || 0
                };
            } else {
                throw new Error(response.error || 'Failed to get curated images');
            }
        } catch (error) {
            logger.error('getCuratedImages error', { error: error?.message || error });
            throw new Error(`Failed to get curated images: ${error.message}`);
        }
    }

    /**
     * Get popular images
     * @param {Object} popularData - Popular images parameters
     * @param {number} popularData.perPage - Images per page
     * @param {number} popularData.page - Page number
     * @param {string} popularData.userId - User ID
     * @returns {Object} Popular images
     */
    async getPopularImages(popularData) {
        try {
            const response = await this.client.imageGeneration.getPopularImages(popularData);

            if (response.success) {
                // Store popular images record
                const now = new Date().valueOf();
                const popularRecord = {
                    _id: Core.generateId(),
                    perPage: popularData.perPage || 10,
                    page: popularData.page || 1,
                    results: response.data || {},
                    totalResults: response.data?.pagination?.totalResults || 0,
                    createdBy: popularData.userId || null,
                    createdAt: now
                };

                await this.db.insertOne(popularRecord);

                return {
                    status: "success",
                    data: response.data,
                    totalResults: response.data?.pagination?.totalResults || 0
                };
            } else {
                throw new Error(response.error || 'Failed to get popular images');
            }
        } catch (error) {
            logger.error('getPopularImages error', { error: error?.message || error });
            throw new Error(`Failed to get popular images: ${error.message}`);
        }
    }

    /**
     * Get image by ID
     * @param {Object} imageData - Image data
     * @param {string} imageData.id - Image ID
     * @param {string} imageData.userId - User ID
     * @returns {Object} Image details
     */
    async getImageById(imageData) {
        if (!imageData.id) {
            throw new Error('Image ID is required');
        }

        try {
            const response = await this.client.imageGeneration.getImageById(imageData);

            if (response.success) {
                // Store image view record
                const now = new Date().valueOf();
                const imageRecord = {
                    _id: Core.generateId(),
                    imageId: imageData.id,
                    imageData: response.data || {},
                    viewedBy: imageData.userId || null,
                    createdAt: now
                };

                await this.db.insertOne(imageRecord);

                return {
                    status: "success",
                    data: response.data
                };
            } else {
                throw new Error(response.error || 'Failed to get image by ID');
            }
        } catch (error) {
            logger.error('getImageById error', { error: error?.message || error });
            throw new Error(`Failed to get image by ID: ${error.message}`);
        }
    }

    /**
     * Get image suggestions
     * @param {Object} suggestionData - Suggestion parameters
     * @param {string} suggestionData.topic - Topic for suggestions
     * @param {string} suggestionData.userId - User ID
     * @returns {Object} Image suggestions
     */
    async getImageSuggestions(suggestionData) {
        if (!suggestionData.topic) {
            throw new Error('Topic is required');
        }

        try {
            const response = await this.client.imageGeneration.getImageSuggestions(suggestionData);

            if (response.success) {
                // Store suggestion record
                const now = new Date().valueOf();
                const suggestionRecord = {
                    _id: Core.generateId(),
                    topic: suggestionData.topic,
                    suggestions: response.data || {},
                    createdBy: suggestionData.userId || null,
                    createdAt: now
                };

                await this.db.insertOne(suggestionRecord);

                return {
                    status: "success",
                    data: response.data
                };
            } else {
                throw new Error(response.error || 'Failed to get image suggestions');
            }
        } catch (error) {
            logger.error('getImageSuggestions error', { error: error?.message || error });
            throw new Error(`Failed to get image suggestions: ${error.message}`);
        }
    }

    // ===== CONTENT EDITOR METHODS =====

    /**
     * Get available analysis criteria
     * @returns {Object} Available criteria
     */
    async getCriteria() {
        try {
            const response = await this.client.contentEditor.getCriteria();

            if (response.success) {
                return {
                    status: "success",
                    criteria: response.criteria || [],
                    count: response.count || 0,
                    description: response.description || ''
                };
            } else {
                throw new Error(response.error || 'Failed to get criteria');
            }
        } catch (error) {
            logger.error('getCriteria error', { error: error?.message || error });
            throw new Error(`Failed to get criteria: ${error.message}`);
        }
    }

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
     * @returns {Object} Analysis results
     */
    async analyzeContent(analysisData) {
        if (!analysisData.content || !analysisData.criteria) {
            throw new Error('Content and criteria are required');
        }

        try {
            const response = await this.client.contentEditor.analyzeContent(analysisData);
            logger.debug('analyzeContent response', { ok: response?.success });
            if (response.success) {
                // Store analysis record
                const now = new Date().valueOf();
                const analysisRecord = {
                    type: "content-analysis",
                    content: analysisData.content,
                    criteria: analysisData.criteria,
                    targetAudience: analysisData.targetAudience,
                    contentType: analysisData.contentType,
                    keywords: analysisData.keywords || [],
                    model: analysisData.model,
                    analysis: response.analysis || {},
                    status: 'completed',
                    createdBy: analysisData.userId || null,
                    createdAt: now,
                    updatedAt: now
                };

                await this.db.insertOne(analysisRecord);

                return {
                    status: "success",
                    analysis: response.analysis,
                    id: analysisRecord._id
                };
            } else {
                throw new Error(response.error || 'Failed to analyze content');
            }
        } catch (error) {
            logger.error('analyzeContent error', { error: error?.message || error });
            throw new Error(`Failed to analyze content: ${error.message}`);
        }
    }

    /**
     * Perform quick analysis
     * @param {Object} quickData - Quick analysis parameters
     * @param {string} quickData.content - Content to analyze
     * @param {string} quickData.targetAudience - Target audience
     * @param {string} quickData.contentType - Content type
     * @param {string} quickData.userId - User ID
     * @returns {Object} Quick analysis results
     */
    async quickAnalysis(quickData) {
        if (!quickData.content) {
            throw new Error('Content is required');
        }

        try {
            const response = await this.client.contentEditor.quickAnalysis(quickData);

            if (response.success) {
                // Store quick analysis record
                const now = new Date().valueOf();
                const quickRecord = {
                    _id: Core.generateId(),
                    content: quickData.content,
                    targetAudience: quickData.targetAudience,
                    contentType: quickData.contentType,
                    analysisType: response.analysisType,
                    criteriaUsed: response.criteriaUsed || [],
                    analysis: response.analysis || {},
                    status: 'completed',
                    createdBy: quickData.userId || null,
                    createdAt: now
                };

                await this.db.insertOne(quickRecord);

                return {
                    status: "success",
                    analysisType: response.analysisType,
                    criteriaUsed: response.criteriaUsed || [],
                    analysis: response.analysis,
                    id: quickRecord._id
                };
            } else {
                throw new Error(response.error || 'Failed to perform quick analysis');
            }
        } catch (error) {
            logger.error('quickAnalysis error', { error: error?.message || error });
            throw new Error(`Failed to perform quick analysis: ${error.message}`);
        }
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
     * @returns {Object} Criterion analysis results
     */
    async analyzeCriterion(criterionData) {
        if (!criterionData.content || !criterionData.criteria) {
            throw new Error('Content and criteria are required');
        }

        try {
            const response = await this.client.contentEditor.analyzeCriterion(criterionData);

            if (response.success) {
                // Store criterion analysis record
                const now = new Date().valueOf();
                const criterionRecord = {
                    _id: Core.generateId(),
                    content: criterionData.content,
                    criteria: criterionData.criteria,
                    targetAudience: criterionData.targetAudience,
                    contentType: criterionData.contentType,
                    keywords: criterionData.keywords || [],
                    model: criterionData.model,
                    metadata: response.metadata || {},
                    status: 'completed',
                    createdBy: criterionData.userId || null,
                    createdAt: now,
                    updatedAt: now
                };

                await this.db.insertOne(criterionRecord);

                return {
                    status: "success",
                    criteria: response.criteria || criterionData.criteria,
                    metadata: response.metadata || {},
                    id: criterionRecord._id
                };
            } else {
                throw new Error(response.error || 'Failed to analyze criterion');
            }
        } catch (error) {
            logger.error('analyzeCriterion error', { error: error?.message || error });
            throw new Error(`Failed to analyze criterion: ${error.message}`);
        }
    }

    // ===== TRENDS METHODS =====

    /**
     * Get latest trends based on categories
     * @param {Object} trendsData - Trends parameters
     * @param {Array|string} trendsData.categories - Categories to analyze (can be array or single string)
     * @param {string} trendsData.model - AI model to use (optional)
     * @param {number} trendsData.temperature - AI temperature (optional)
     * @param {string} trendsData.userId - User ID
     * @returns {Object} Latest trends data
     */
    async getLatestTrends(trendsData) {
        if (!trendsData.categories) {
            throw new Error('Categories are required');
        }

        try {
            logger.debug('getLatestTrends request', { categories: trendsData?.categories });
            const response = await this.client.redditTrends.analyzeSingleTopic(trendsData.categories, {
                model: trendsData.model || 'gpt-4',
                userId: trendsData.userId
            });

            if (response.success) {
                // Store trends record
                const now = new Date().valueOf();
                const trendsRecord = {
                    type: "trends",
                    categories: trendsData.categories,
                    model: trendsData.model || 'gpt-4',
                    results: response.data || [],
                    categoriesAnalyzed: response.categories_analyzed || trendsData.categories,
                    totalPosts: response.total_posts || 0,
                    timestamp: response.timestamp || new Date().toISOString(),
                    status: 'completed',
                    createdBy: trendsData.userId || null,
                    createdAt: now,
                    updatedAt: now
                };

                await this.db.insertOne(trendsRecord);

                return {
                    status: "success",
                    data: response.data || [],
                    categories_analyzed: response.categories_analyzed || Array.isArray(trendsData.categories) ? trendsData.categories : [trendsData.categories],
                    total_posts: response.total_posts || 0,
                    timestamp: response.timestamp || new Date().toISOString()
                };
            } else {
                throw new Error(response.error || 'Failed to get latest trends');
            }
        } catch (error) {
            logger.error('getLatestTrends error', { error: error?.message || error });
            throw new Error(`Failed to get latest trends: ${error.message}`);
        }
    }

    /**
     * Analyze trends for specific categories with custom parameters
     * @param {Array} categories - Array of categories to analyze
     * @param {Object} options - Analysis options
     * @param {string} options.model - AI model to use
     * @param {number} options.temperature - AI temperature
     * @param {string} options.userId - User ID
     * @returns {Object} Analysis results for specific categories
     */
    async analyzeSpecificCategories(categories, options = {}) {
        if (!categories || !Array.isArray(categories) || categories.length === 0) {
            throw new Error('Categories array is required');
        }

        try {
            const response = await this.client.redditTrends.analyzeSpecificTopics(
                categories,
                {
                    model: options.model || 'gpt-3.5-turbo',
                    temperature: options.temperature || 0.7
                }
            );

            if (response.success) {
                // Store analysis record
                const now = new Date().valueOf();
                const analysisRecord = {
                    type: "trends-analysis",
                    categories: categories,
                    model: options.model || 'gpt-3.5-turbo',
                    temperature: options.temperature || 0.7,
                    results: response.data || [],
                    categoriesAnalyzed: response.categories_analyzed || categories,
                    totalPosts: response.total_posts || 0,
                    timestamp: response.timestamp || new Date().toISOString(),
                    status: 'completed',
                    createdBy: options.userId || null,
                    createdAt: now,
                    updatedAt: now
                };

                await this.db.insertOne(analysisRecord);

                return {
                    status: "success",
                    data: response.data || [],
                    categories_analyzed: response.categories_analyzed || categories,
                    total_posts: response.total_posts || 0,
                    timestamp: response.timestamp || new Date().toISOString()
                };
            } else {
                throw new Error(response.error || 'Failed to analyze specific categories');
            }
        } catch (error) {
            logger.error('analyzeSpecificCategories error', { error: error?.message || error });
            throw new Error(`Failed to analyze specific categories: ${error.message}`);
        }
    }

    /**
     * Analyze trends for a single category
     * @param {string} category - Single category to analyze
     * @param {Object} options - Analysis options
     * @param {string} options.model - AI model to use
     * @param {number} options.temperature - AI temperature
     * @param {string} options.userId - User ID
     * @returns {Object} Analysis results for single category
     */
    async analyzeSingleCategory(category, options = {}) {
        if (!category || typeof category !== 'string') {
            throw new Error('Category string is required');
        }

        try {
            const response = await this.client.redditTrends.analyzeSingleTopic(
                category,
                {
                    model: options.model || 'gpt-4',
                    temperature: options.temperature || 0.5
                }
            );

            if (response.success) {
                // Store single category analysis record
                const now = new Date().valueOf();
                const analysisRecord = {
                    type: "trends-single-category",
                    category: category,
                    model: options.model || 'gpt-4',
                    temperature: options.temperature || 0.5,
                    results: response.data || [],
                    categoriesAnalyzed: [category],
                    totalPosts: response.total_posts || 0,
                    timestamp: response.timestamp || new Date().toISOString(),
                    status: 'completed',
                    createdBy: options.userId || null,
                    createdAt: now,
                    updatedAt: now
                };

                await this.db.insertOne(analysisRecord);

                return {
                    status: "success",
                    data: response.data || [],
                    categories_analyzed: [category],
                    total_posts: response.total_posts || 0,
                    timestamp: response.timestamp || new Date().toISOString()
                };
            } else {
                throw new Error(response.error || 'Failed to analyze single category');
            }
        } catch (error) {
            logger.error('analyzeSingleCategory error', { error: error?.message || error });
            throw new Error(`Failed to analyze single category: ${error.message}`);
        }
    }

    // ===== HEALTH CHECK METHODS =====

    /**
     * Check content generation service health
     * @returns {Object} Health status
     */
    async healthCheck() {
        try {
            const response = await this.client.contentGeneration.healthCheck();

            if (response.success) {
                return {
                    status: "success",
                    serviceStatus: response.status || 'healthy',
                    availableFormats: response.availableFormats || 0,
                    timestamp: response.timestamp || new Date().toISOString()
                };
            } else {
                throw new Error(response.error || 'Health check failed');
            }
        } catch (error) {
            logger.error('healthCheck error', { error: error?.message || error });
            throw new Error(`Health check failed: ${error.message}`);
        }
    }

    /**
     * Check image generation service health
     * @returns {Object} Health status
     */
    async imageHealthCheck() {
        try {
            const response = await this.client.imageGeneration.getApiStats();

            if (response.success) {
                return {
                    status: "success",
                    message: response.message || 'Service healthy',
                    data: response.data || {},
                    timestamp: new Date().toISOString()
                };
            } else {
                throw new Error(response.error || 'Image service health check failed');
            }
        } catch (error) {
            logger.error('imageHealthCheck error', { error: error?.message || error });
            throw new Error(`Image service health check failed: ${error.message}`);
        }
    }

    /**
     * Check content editor service health
     * @returns {Object} Health status
     */
    async editorHealthCheck() {
        try {
            const response = await this.client.contentEditor.healthCheck();

            if (response.success) {
                return {
                    status: "success",
                    serviceStatus: response.status || 'healthy',
                    availableCriteria: response.availableCriteria || 0,
                    timestamp: response.timestamp || new Date().toISOString()
                };
            } else {
                throw new Error(response.error || 'Content editor health check failed');
            }
        } catch (error) {
            logger.error('editorHealthCheck error', { error: error?.message || error });
            throw new Error(`Content editor health check failed: ${error.message}`);
        }
    }



    // ===== UTILITY METHODS =====

    /**
     * Get content by ID
     * @param {string} contentId - Content ID
     * @returns {Object} Content object
     */
    async getContent(contentId) {
        if (!contentId) {
            throw new Error('Content ID is required');
        }

        try {
            const content = await this.db.findOne({ _id: contentId });

            if (!content) {
                throw new Error('Content not found');
            }

            return {
                status: "success",
                content: {
                    id: content._id,
                    format: content.format,
                    topic: content.topic,
                    content: content.content,
                    metadata: content.metadata,
                    status: content.status,
                    createdAt: content.createdAt,
                    updatedAt: content.updatedAt
                }
            };
        } catch (error) {
            logger.error('getContent error', { error: error?.message || error });
            throw new Error(`Failed to get content: ${error.message}`);
        }
    }

    /**
     * List all content with optional filtering
     * @param {Object} filters - Optional filters
     * @param {string} filters.format - Filter by format
     * @param {string} filters.status - Filter by status
     * @param {string} filters.userId - Filter by user ID
     * @returns {Object} List of content
     */
    async listContent(filters = {}) {
        try {
            const query = {};

            if (filters.format) {
                query.format = filters.format;
            }

            if (filters.status) {
                query.status = filters.status;
            }

            if (filters.userId) {
                query.createdBy = filters.userId;
            }

            const content = await this.db.find(query).toArray();

            return {
                status: "success",
                content: content.map(item => ({
                    id: item._id,
                    format: item.format,
                    topic: item.topic,
                    status: item.status,
                    createdAt: item.createdAt
                })),
                count: content.length
            };
        } catch (error) {
            logger.error('listContent error', { error: error?.message || error });
            throw new Error(`Failed to list content: ${error.message}`);
        }
    }
}

export default ContentGeneration;
