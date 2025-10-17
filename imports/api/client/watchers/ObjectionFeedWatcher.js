import core from "@tmq-dev-ph/tmq-dev-core-client";
import { Meteor } from "meteor/meteor";
import { Watcher2 } from "../Watcher2";
import Client from "../Client";
import { toast } from 'sonner';
import { TOAST_STYLE } from "../../common/const";
import { Accounts } from 'meteor/tmq:accounts';
import { nudgeTools, objections, suggestedResponses } from "./data/objectionFeed";
const { Adapter, Logger } = core;

Adapter.Meteor = Meteor;
Adapter.Accounts = Accounts;

export const TAB = {
    OBJECTION: "objectionTab",
}

export const OBJECTION = {
    LOADING_LIST: 'loadingList',
    LOADING_SUGGESTION_RESPONSE: 'loadingSuggestionResponse',
    LIST: 'list',
    SUGGESTION_RESPONSE: 'suggestionResponse',
    SELECTED_OBJECTION: 'selectedObjection',
}

export const NUDGE = {
    LOADING: 'loadingNudge',
    TESTIMONIALS: 'testimonials',
    COUNTDOWN_TIMER: 'countdownTimer',
    DISCOUNT: 'discount',
    URGENT_TYPE: 'urgentType',
    QUICK_PRESET: 'quickPreset',
}

class ObjectionFeedWatcher extends Watcher2 {
    #data
    #processes = {};
    #lastBasis = null;
    #listen = null;
    constructor(parent) {
        super(parent);
        this.initNudgeConfig();
    }

    objectionTabChange(tab = 'all') {

    }

    searchObjection(value) {
        console.log("Searching objections with value:", value);
    }

    fetchObjections() {
        this.setValue(OBJECTION.LOADING_LIST, true);
        this.setValue(OBJECTION.LIST, objections);
        setTimeout(() => {
            this.setValue(OBJECTION.LOADING_LIST, false);
        }, 1000);
    }

    generateSuggestionResponse(objection) {
        if (!this.getValue(OBJECTION.SELECTED_OBJECTION)) return
        this.setValue(OBJECTION.LOADING_SUGGESTION_RESPONSE, true);
        const shuffled = suggestedResponses.sort(() => 0.5 - Math.random())
        const randomResponses = shuffled.slice(0, 3);
        this.setValue(OBJECTION.SUGGESTION_RESPONSE, randomResponses);
        setTimeout(() => {
            this.setValue(OBJECTION.LOADING_SUGGESTION_RESPONSE, false);
        }, 1000);
    }
    selectObjection(objection) {
        this.setValue(OBJECTION.SELECTED_OBJECTION, objection);
    }


    initNudgeConfig() {
        this.setValue(NUDGE.LOADING, true);
        this.setValue(NUDGE.TESTIMONIALS, nudgeTools.testimonials);
        this.setValue(NUDGE.COUNTDOWN_TIMER, nudgeTools.countdown);
        this.setValue(NUDGE.DISCOUNT, nudgeTools.discount);
        this.setValue(NUDGE.URGENT_TYPE, nudgeTools.urgencyTypes);

        setTimeout(() => {
            this.setValue(NUDGE.LOADING, false);
        }, 1000);
    }
}




export default new ObjectionFeedWatcher(Client);