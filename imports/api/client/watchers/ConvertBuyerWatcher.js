import core from "@tmq-dev-ph/tmq-dev-core-client";
import { Meteor } from "meteor/meteor";
import { Watcher2 } from "../Watcher2";
import Client from "../Client";
import { toast } from 'sonner';
import { TOAST_STYLE } from "../../common/const";
import { Accounts } from 'meteor/tmq:accounts';
import { leadsData } from "./data/convertBuyer";
const { Adapter, Logger } = core;

Adapter.Meteor = Meteor;
Adapter.Accounts = Accounts;

export const OVERVIEW = {
    LOADING_CONVERSION_RATE: 'loadingConversionRate',
    LOADING_TOP_PERFORMING_NUDGE: 'loadingTopPerformingNudge',
    LOADING_MOST_COMMON_OBJECTION: 'loadingMostCommonObjection',
    LOADING_HOT_LEAD: 'loadingHotLead',
    CONVERSION_RATE: 'conversionRate',
    TOP_PERFORMING_NUDGE: 'topPerformingNudge',
    MOST_COMMON_OBJECTION: 'mostCommonObjection',
    HOT_LEAD: 'hotLead',
}

export const TABLE = {
    LOADING_LEADS: 'loadingLeads',
}

class ConvertBuyerWatcher extends Watcher2 {
    #data
    #processes = {};
    #lastBasis = null;
    #listen = null;
    constructor(parent) {
        super(parent);
    }

    searchLead(value) {
        console.log("Searching leads...", value);
        // Implement search logic here
    }

    conversionRate() {
        this.setValue(OVERVIEW.LOADING_CONVERSION_RATE, true);
        const totalVisitors = 4
        const totalConversions = 2
        this.setValue(OVERVIEW.CONVERSION_RATE, {
            totalConversion: '4.8',
            average: '2.4',
        });
        setTimeout(() => {
            this.setValue(OVERVIEW.LOADING_CONVERSION_RATE, false);
        }, 1000);
    }

    topPerformingNudge() {
        this.setValue(OVERVIEW.LOADING_TOP_PERFORMING_NUDGE, true);
        const topNudge = {
            description: "Limited offer: Free shipping",
            totalShown: 2458,
            average: 85,
        };
        this.setValue(OVERVIEW.TOP_PERFORMING_NUDGE, topNudge);
        setTimeout(() => {
            this.setValue(OVERVIEW.LOADING_TOP_PERFORMING_NUDGE, false);
        }, 1000);
    }

    mostCommonObjection() {
        this.setValue(OVERVIEW.LOADING_MOST_COMMON_OBJECTION, true);
        const objection = {
            description: "Price comparison needed",
            totalDetected: 5,
            average: 75,
        };
        this.setValue(OVERVIEW.MOST_COMMON_OBJECTION, objection);
        setTimeout(() => {
            this.setValue(OVERVIEW.LOADING_MOST_COMMON_OBJECTION, false);
        }, 1000);
    }

    hotLead() {
        this.setValue(OVERVIEW.LOADING_HOT_LEAD, true);
        const hotLead = {
            totalLeads: 12,
            lastActive: "2025-08-17T12:00:00Z",
            average: 95,
        };
        this.setValue(OVERVIEW.HOT_LEAD, hotLead);
        setTimeout(() => {
            this.setValue(OVERVIEW.LOADING_HOT_LEAD, false);
        }, 1000);
    }

    fetchLeads() {
        this.setValue(TABLE.LOADING_LEADS, true);
        this.setValue(TABLE.LEADS, leadsData);
        setTimeout(() => {
            this.setValue(TABLE.LOADING_LEADS, false);
        }, 1000);
    }
}

export default new ConvertBuyerWatcher(Client);