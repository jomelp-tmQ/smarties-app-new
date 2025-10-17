import core from "@tmq-dev-ph/tmq-dev-core-client";
import { Meteor } from "meteor/meteor";
import { Watcher2 } from "../Watcher2";
import Client from "../Client";
import { toast } from 'sonner';
import { TOAST_STYLE } from "../../common/const";
import { Accounts } from 'meteor/tmq:accounts';
import { socialContentItems, socialTopics } from "./data/social";
import ContentCreation from "../modules/ContentCreation";

const { Adapter, Logger } = core;

Adapter.Meteor = Meteor;
Adapter.Accounts = Accounts;

export const platformOptions = [
    {
        name: "Twitter/X",
        icon: "../images/smarties-social-twitter.svg"
    },
    {
        name: "Facebook",
        icon: "../images/smarties-social-fb.svg"
    },
    {
        name: "Instagram",
        icon: "../images/smarties-social-insta.svg"
    }
];

export const frequencyOptions = [
    {
        title: "Daily",
        subtitle: "Best for consistent engagement",
        description: "Post once every day",
        icon: "https://cdn.prod.website-files.com/688b61ee631f6165f147256b/688b61ee631f6165f14726c5_smarties-frequency-daily.svg"
    },
    {
        title: "Weekly",
        subtitle: "Ideal for updates or newsletters",
        description: "Post 2-3 times per week",
        icon: "https://cdn.prod.website-files.com/688b61ee631f6165f147256b/688b61ee631f6165f14726c6_smarties-frequency-weekly.svg"
    },
    {
        title: "Monthly",
        subtitle: "Great for announcements or campaigns",
        description: "Post 3-5 times per month",
        icon: "https://cdn.prod.website-files.com/688b61ee631f6165f147256b/688b61ee631f6165f14726c7_smarties-frequency-montlhy.svg"
    }
];

export const STEPS = {
    CURRENT_POSITION: "currentPosition",
}

export const SOCIAL_POST = {
    LOADING_TOPICS: 'loadingTopics',
    LOADING_CONTENT: 'loadingContent',
    PLATFORM: 'platform',
    FREQUENCY: 'frequency',
    TOPIC: 'topic',
    TOPICS: 'topics',
    CONTENT: 'content',
    CONTENT_GENERATED: 'contentGenerated',
    ORIGINAL_AI_CONTENT: 'originalAiContent',
    CONTENT_ARGUMENTS: 'contentArguments',
}

class SocialPost extends Watcher2 {
    #data
    #processes = {};
    #lastBasis = null;
    #listen = null;
    constructor(parent) {
        super(parent);
        this.setValue(STEPS.CURRENT_POSITION, 0);
        this.contentRequest = new ContentCreation((hex, data) => this.parent.callFunc(hex, data));
    }

    goNext() {
        const currentPosition = this.getValue(STEPS.CURRENT_POSITION);

        if (!this.validateStep(currentPosition)) {
            return; // Stop if validation fails
        }

        this.setValue(STEPS.CURRENT_POSITION, currentPosition + 1);
        this.fetchDataAccordingtoPosition(currentPosition + 1);
    }

    goPrevious() {
        const currentPosition = this.getValue(STEPS.CURRENT_POSITION);
        if (currentPosition > 0) {
            this.setValue(STEPS.CURRENT_POSITION, currentPosition - 1);
        } else {
            toast.error("You are already at the first step.", {
                style: TOAST_STYLE.ERROR,
            });
        }
    }

    // Step validation rules
    validateStep(step) {
        switch (step) {
            case 0: { // Step 0: Require platform & frequency
                const platformSelected = this.getValue(SOCIAL_POST.PLATFORM);
                const frequencySelected = this.getValue(SOCIAL_POST.FREQUENCY);

                if (!platformSelected) {
                    console.log("No platform selected.");
                    return false;
                }
                if (!frequencySelected) {
                    console.log("No frequency selected.");
                    return false;
                }
                this.getTopics({ categories: 'all' });
                return true;
            }

            case 1: { // Step 1: Require trending topic
                const trendingTopicSelected = this.getValue(SOCIAL_POST.TOPIC);
                if (!trendingTopicSelected) {
                    console.log("No trending topic selected.");
                    return false;
                }
                console.log("Generating content...");
                this.generateContent({
                    topic: "Sustainable Living Tips",
                    tone: "conversational",
                    targetAudience: "environmentally conscious listeners",
                });
                return true;
            }

            case 2: { // Step 2: Require generated content
                const generatedContentSelected = this.getValue(SOCIAL_POST.CONTENT);
                if (!generatedContentSelected) {
                    console.log("No generated content available.");
                    return false;
                }
                return true;
            }

            default:
                return true; // No validation for other steps
        }
    }

    fetchDataAccordingtoPosition(position) {
        switch (position) {
            case 0:
                console.log("Fetching trending topics...");
                break;
            case 1:
                this.fetchTrendingTopics();
                break;
            case 2:
                this.fetchGeneratedContent();
                break;
            default:
                toast.error("Invalid step position.", {
                    style: TOAST_STYLE.ERROR,
                });
        }
    }

    fetchTrendingTopics() {
        const existingTopics = this.getValue(SOCIAL_POST.TOPICS);
        if (Array.isArray(existingTopics) && existingTopics.length > 0) return;
        this.setValue(SOCIAL_POST.LOADING_TOPICS, true);
        this.setValue(SOCIAL_POST.TOPICS, socialTopics);
        setTimeout(() => {
            this.setValue(SOCIAL_POST.LOADING_TOPICS, false);
        }, 1000);
    }

    fetchGeneratedContent() {
        const existingContent = this.getValue(SOCIAL_POST.CONTENT);
        if (Array.isArray(existingContent) && existingContent.length > 0) return;
        this.setValue(SOCIAL_POST.CONTENT_GENERATED, socialContentItems);
        setTimeout(() => {
            this.setValue(SOCIAL_POST.LOADING_CONTENT, false);
        }, 1000);
    }

    finishAndActivateSchedule() {
        const platform = this.getValue(SOCIAL_POST.PLATFORM);
        const frequency = this.getValue(SOCIAL_POST.FREQUENCY);
        const topic = this.getValue(SOCIAL_POST.TOPIC);
        const content = this.getValue(SOCIAL_POST.CONTENT);
        if (!platform || !frequency || !topic || !content) {
            toast.error("Please complete all steps before finishing.", {
                style: TOAST_STYLE.ERROR,
            });
            return;
        }
        console.log("Finishing and activating schedule...");
        console.log('finalized data:', {
            platform,
            frequency,
            topic,
            content
        });
    }


    getTopics({ categories = "all" }) {
        this.contentRequest.getLatestTrends({
            categories: categories,
            userId: "123"
        }).then((res) => {
            console.log(res);
        }).catch((err) => {
            console.log(err);
        });
    }


    /*
    * Generate content with AI STEP 3 (to be used after selecting topics to generate content)
    * @param {Object} params - Content generation parameters
    * @param {string} params.topic - Content topic
    * @param {string} params.tone - Content tone
    * @param {string} params.targetAudience - Content target audience
    */
    generateContent({topic, tone = "conversational", targetAudience = "general public", currentTrends = []}) {
        this.setValue(SOCIAL_POST.LOADING_CONTENT, true);
        this.contentRequest.generateContent({
            format: "social-media",
            topic: topic,
            currentTrends: currentTrends,
            userId: "123",
            options: {
                tone: tone,
                targetAudience: targetAudience,
                length: "100",
            }
        }).then((res) => {
            this.setValue(SOCIAL_POST.LOADING_CONTENT, false);
            this.setValue(SOCIAL_POST.ORIGINAL_AI_CONTENT, res.content);
            this.setValue(SOCIAL_POST.CONTENT_ARGUMENTS, {
                tone: tone,
                targetAudience: targetAudience,
                length: "100",
            });
            this.analyzeContent({
                content: res.content,
                criteria: ["tone", "reading-level", "seo-optimization"],
                targetAudience: targetAudience,
                contentType: "social-media",
                keywords: [],
            });
            console.log(res);
        }).catch((err) => {
            this.setValue(SOCIAL_POST.LOADING_CONTENT, false);
            console.log(err);
        });
    }

    /*
    * Analyze content with AI (run when user wants to analyze content)
    * @param {Object} params - Content analysis parameters
    * @param {string} params.content - Content to analyze
    * @param {Array} params.criteria - Content criteria
    * @param {string} params.targetAudience - Content target audience
    * @param {string} params.contentType - Content type
    * @param {Array} params.keywords - Content keywords
    */
    analyzeContent({
        content,
        criteria = ["tone", "reading-level", "seo-optimization"],
        targetAudience = "general public",
        contentType = "social-media",
        keywords = [],
        userId = "123"
    }) {
        if (!content) {
            toast.error("No content to analyze. Please generate content first.", {
                style: TOAST_STYLE.ERROR,
            });
            return;
        }
        this.setValue(SOCIAL_POST.LOADING_CONTENT, true);
        this.contentRequest.analyzeContent({
            content: content,
            criteria: criteria,
            targetAudience: targetAudience,
            contentType: contentType,
            keywords: keywords,
            userId: "123"
        }).then((res) => {
            console.log(res);
        }).catch((err) => {
            console.log(err);
        });
    }

    /*
    * Search images with AI (run when user wants to search images)
    * @param {Object} params - Image search parameters
    * @param {string} params.query - Image search query
    * @param {Object} params.options - Image search options
    */
    searchImages({query, options}) {
        const mergedOptions = {
            perPage: options.perPage || 5,
            orientation: options.orientation || "landscape",
            size: options.size || "small",
            color: options.color || "black"
        }
        contentRequest.searchImages({
            query: query,
            apiKey: "", // leave as empty string
            userId: "", // leave as empty string
            options: mergedOptions
        }).then((res) => {
            console.log(res);
        }).catch((err) => {
            console.log(err);
        });
    }
}

export default new SocialPost(Client);