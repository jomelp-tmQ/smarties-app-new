import core from "@tmq-dev-ph/tmq-dev-core-client";
import { Meteor } from "meteor/meteor";
import { Watcher2 } from "../Watcher2";
import Client from "../Client";
import { toast } from 'sonner';
import { TOAST_STYLE } from "../../common/const";
import { Accounts } from 'meteor/tmq:accounts';
import { assistantInsights, recentActivities } from "./data/journey";
const { Adapter, Logger } = core;

Adapter.Meteor = Meteor;
Adapter.Accounts = Accounts;

export const CUSTOMER_JOURNEY_FLOW = {
    LOADING_ENGAGEMENT_RATE: "loadingEngagementRate",
    LOADING_LEAD_INTEREST: "loadingLeadInterest",
    LOADING_CONVERSION: "loadingConversionRate",
    LOADING_LOYALTY: "loadingLoyaltyScore",
    ENGAGEMENT_RATE: "engagementRate",
    LEAD_INTEREST: "leadInterest",
    CONVERSION: "conversionRate",
    LOYALTY_SCORE: "loyaltyScore",
};

export const OVERVIEW = {
    ENGAGEMENT_AVERAGE: "engagementAverage",
    LEAD_INTEREST_SCORE: "leadInterestAverage",
    CONVERSION_AVERAGE: "conversionRateAverage",
    LOYALTY_INDEX: "loyaltyIndex",
}

export const SMARTIES_ASSISTANT = {
    LOADING_INSIGHTS: "loadingInsights",
    INSIGHTS: "insights",
}

export const RECENT_ACTIVITY = {
    LOADING_RECENT_ACTIVITY: "loadingRecentActivity",
    ACTIVITY: "recentActivity",
}


class JourneyWatcher extends Watcher2 {
    #data
    #processes = {};
    #lastBasis = null;
    #listen = null;
    constructor(parent) {
        super(parent);
    }


    setEngagementRate() {
        this.setValue(CUSTOMER_JOURNEY_FLOW.LOADING_ENGAGEMENT_RATE, true);
        this.setValue(CUSTOMER_JOURNEY_FLOW.ENGAGEMENT_RATE, 14382);
        this.setValue(OVERVIEW.ENGAGEMENT_AVERAGE, 38.2);
        setTimeout(() => {
            this.setValue(CUSTOMER_JOURNEY_FLOW.LOADING_ENGAGEMENT_RATE, false);
        }, 1000);
    }

    setLeadInterest() {
        this.setValue(CUSTOMER_JOURNEY_FLOW.LOADING_LEAD_INTEREST, true);
        this.setValue(CUSTOMER_JOURNEY_FLOW.LEAD_INTEREST, 8754);
        this.setValue(OVERVIEW.LEAD_INTEREST_SCORE, 7.4);
        setTimeout(() => {
            this.setValue(CUSTOMER_JOURNEY_FLOW.LOADING_LEAD_INTEREST, false);
        }, 1000);
    }

    setConversionRate() {
        this.setValue(CUSTOMER_JOURNEY_FLOW.LOADING_CONVERSION, true);
        this.setValue(CUSTOMER_JOURNEY_FLOW.CONVERSION, 1120);
        this.setValue(OVERVIEW.CONVERSION_AVERAGE, 12.8);
        setTimeout(() => {
            this.setValue(CUSTOMER_JOURNEY_FLOW.LOADING_CONVERSION, false);
        }, 1000);
    }

    setLoyaltyScore() {
        this.setValue(CUSTOMER_JOURNEY_FLOW.LOADING_LOYALTY, true);
        this.setValue(CUSTOMER_JOURNEY_FLOW.LOYALTYE, 968);
        this.setValue(OVERVIEW.LOYALTY_INDEX, 86.5);
        setTimeout(() => {
            this.setValue(CUSTOMER_JOURNEY_FLOW.LOADING_LOYALTY, false);
        }, 1000);
    }

    fetchInsights() {
        this.setValue(SMARTIES_ASSISTANT.LOADING_INSIGHTS, true);
        this.setValue(SMARTIES_ASSISTANT.INSIGHTS, assistantInsights);
        setTimeout(() => {
            this.setValue(SMARTIES_ASSISTANT.LOADING_INSIGHTS, false);
        }, 1000);
    }

    fetchRecentActivity() {
        this.setValue(RECENT_ACTIVITY.LOADING_RECENT_ACTIVITY, true);
        this.setValue(RECENT_ACTIVITY.ACTIVITY, recentActivities);
        setTimeout(() => {
            this.setValue(RECENT_ACTIVITY.LOADING_RECENT_ACTIVITY, false);
        }, 1000);
    }


}

export default new JourneyWatcher(Client);